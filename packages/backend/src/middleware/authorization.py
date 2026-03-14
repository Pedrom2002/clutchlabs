from enum import StrEnum

from fastapi import Depends, HTTPException

from src.middleware.auth import get_current_user
from src.schemas.auth import TokenPayload


class Permission(StrEnum):
    MANAGE_ORG = "manage_org"
    MANAGE_TEAM = "manage_team"
    UPLOAD_DEMO = "upload_demo"
    VIEW_MATCHES = "view_matches"
    VIEW_ERRORS = "view_errors"
    VIEW_TACTICS = "view_tactics"
    VIEW_SCOUT = "view_scout"
    GENERATE_SCOUT = "generate_scout"
    VIEW_TRAINING = "view_training"
    VIEW_BILLING = "view_billing"
    MANAGE_BILLING = "manage_billing"


ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "admin": set(Permission),
    "coach": {
        Permission.MANAGE_TEAM,
        Permission.UPLOAD_DEMO,
        Permission.VIEW_MATCHES,
        Permission.VIEW_ERRORS,
        Permission.VIEW_TACTICS,
        Permission.VIEW_SCOUT,
        Permission.GENERATE_SCOUT,
        Permission.VIEW_TRAINING,
        Permission.VIEW_BILLING,
    },
    "analyst": {
        Permission.UPLOAD_DEMO,
        Permission.VIEW_MATCHES,
        Permission.VIEW_ERRORS,
        Permission.VIEW_TACTICS,
        Permission.VIEW_SCOUT,
        Permission.GENERATE_SCOUT,
        Permission.VIEW_TRAINING,
    },
    "player": {
        Permission.VIEW_MATCHES,
        Permission.VIEW_ERRORS,
        Permission.VIEW_TRAINING,
    },
    "viewer": {
        Permission.VIEW_MATCHES,
    },
}


def require_permission(permission: Permission):
    async def checker(
        current_user: TokenPayload = Depends(get_current_user),
    ) -> TokenPayload:
        user_permissions = ROLE_PERMISSIONS.get(current_user.role, set())
        if permission not in user_permissions:
            raise HTTPException(
                status_code=403,
                detail=f"Permission '{permission}' required",
            )
        return current_user

    return checker
