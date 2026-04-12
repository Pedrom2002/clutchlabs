"""Prometheus metrics middleware and /metrics endpoint helpers.

Exposes request counter, latency histogram, and error counter labeled by
method / route / status_code. The /metrics route is wired up in main.py.
"""

from __future__ import annotations

import time
from collections.abc import Callable  # noqa: TC003

from fastapi import Request, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Histogram,
    generate_latest,
)

# Dedicated registry so tests and multi-worker setups don't double-register.
REGISTRY = CollectorRegistry()

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests processed",
    labelnames=("method", "endpoint", "status_code"),
    registry=REGISTRY,
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    labelnames=("method", "endpoint"),
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
    registry=REGISTRY,
)

REQUEST_ERRORS = Counter(
    "http_request_errors_total",
    "HTTP requests resulting in a 5xx response",
    labelnames=("method", "endpoint", "status_code"),
    registry=REGISTRY,
)


def _route_label(request: Request) -> str:
    """Return the parameterized route template if matched, else the raw path."""
    route = request.scope.get("route")
    if route is not None and getattr(route, "path", None):
        return route.path
    return request.url.path or "unknown"


async def prometheus_middleware(request: Request, call_next: Callable) -> Response:
    """FastAPI-compatible HTTP middleware that records metrics per request."""
    # Skip recording for the /metrics endpoint itself to avoid feedback loops
    if request.url.path == "/metrics":
        return await call_next(request)

    method = request.method
    start = time.perf_counter()
    try:
        response: Response = await call_next(request)
    except Exception:
        endpoint = _route_label(request)
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status_code="500").inc()
        REQUEST_ERRORS.labels(method=method, endpoint=endpoint, status_code="500").inc()
        REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(
            time.perf_counter() - start
        )
        raise

    endpoint = _route_label(request)
    status = str(response.status_code)
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status_code=status).inc()
    if response.status_code >= 500:
        REQUEST_ERRORS.labels(method=method, endpoint=endpoint, status_code=status).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(time.perf_counter() - start)
    return response


def metrics_response() -> Response:
    """Build a Prometheus text exposition response from the registry."""
    data = generate_latest(REGISTRY)
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
