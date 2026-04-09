"""Stripe billing integration — checkout, webhooks, customer portal."""

from __future__ import annotations

import logging
import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select, update

from src.config import settings
from src.database import get_db
from src.middleware.auth import get_current_user
from src.models.organization import Organization

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from src.schemas.auth import TokenPayload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])
limiter = Limiter(key_func=get_remote_address)

STRIPE_PRICE_IDS = {
    "solo": settings.STRIPE_PRICE_SOLO,
    "team": settings.STRIPE_PRICE_TEAM,
    "pro": settings.STRIPE_PRICE_PRO,
}

# Tier → max demos mapping
TIER_LIMITS = {
    "free": 10,
    "solo": 15,
    "team": 30,
    "pro": 9999,
    "enterprise": 9999,
}


def _get_stripe():
    """Lazy import stripe to avoid errors when not installed."""
    try:
        import stripe

        stripe.api_key = settings.STRIPE_SECRET_KEY
        return stripe
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Stripe is not configured. Install stripe package.",
        ) from exc


@router.post("/checkout")
@limiter.limit("5/minute")
async def create_checkout_session(
    request: Request,
    tier: str,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout session for upgrading to a paid tier."""
    if tier not in STRIPE_PRICE_IDS:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}")

    stripe = _get_stripe()

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": STRIPE_PRICE_IDS[tier], "quantity": 1}],
            success_url=f"{settings.FRONTEND_URL}/dashboard/settings?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/dashboard/settings?cancelled=true",
            client_reference_id=current_user.org_id,
            metadata={
                "org_id": current_user.org_id,
                "user_id": current_user.sub,
                "tier": tier,
            },
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        logger.error("Stripe checkout error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create checkout session") from e


@router.post("/portal")
@limiter.limit("5/minute")
async def create_portal_session(
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Customer Portal session for managing subscription."""
    stripe = _get_stripe()

    org_id = uuid.UUID(current_user.org_id)
    result = await db.execute(
        select(Organization.stripe_customer_id).where(Organization.id == org_id)
    )
    customer_id = result.scalar_one_or_none()

    if not customer_id:
        raise HTTPException(
            status_code=400,
            detail="No active subscription. Upgrade first.",
        )

    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{settings.FRONTEND_URL}/dashboard/settings",
        )
        return {"portal_url": session.url}
    except Exception as e:
        logger.error("Stripe portal error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create portal session") from e


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle Stripe webhook events."""
    stripe = _get_stripe()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, Exception) as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook signature") from exc

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        org_id = data.get("client_reference_id") or data.get("metadata", {}).get("org_id")
        tier = data.get("metadata", {}).get("tier", "solo")
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")

        if org_id:
            await db.execute(
                update(Organization)
                .where(Organization.id == uuid.UUID(org_id))
                .values(
                    stripe_customer_id=customer_id,
                    stripe_subscription_id=subscription_id,
                    tier=tier,
                    max_demos_per_month=TIER_LIMITS.get(tier, 10),
                )
            )
            await db.commit()
            logger.info("Activated subscription: org=%s tier=%s", org_id, tier)

    elif event_type == "customer.subscription.updated":
        customer_id = data.get("customer")
        status = data.get("status")
        if status == "active":
            # Find org by customer_id and ensure tier is synced
            result = await db.execute(
                select(Organization).where(Organization.stripe_customer_id == customer_id)
            )
            org = result.scalar_one_or_none()
            if org:
                logger.info("Subscription updated: org=%s status=%s", org.id, status)

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer")
        # Downgrade to free
        await db.execute(
            update(Organization)
            .where(Organization.stripe_customer_id == customer_id)
            .values(tier="free", max_demos_per_month=10, stripe_subscription_id=None)
        )
        await db.commit()
        logger.info("Subscription cancelled, downgraded to free: customer=%s", customer_id)

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer")
        logger.warning("Payment failed: customer=%s", customer_id)

    return {"status": "ok"}
