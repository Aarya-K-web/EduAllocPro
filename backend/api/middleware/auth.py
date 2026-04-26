"""
EduAllocPro — Firebase JWT Auth Middleware
Verifies Bearer token and sets request.state.user.
Returns 401 for missing/invalid tokens.
"""
import structlog
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()

# Routes that don't require auth
PUBLIC_PATHS = {"/api/health", "/api/docs", "/api/redoc", "/openapi.json"}

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth, credentials
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False

_firebase_initialized = False


def _init_firebase(project_id: str) -> None:
    global _firebase_initialized
    if _firebase_initialized or not FIREBASE_AVAILABLE:
        return
    try:
        if not firebase_admin._apps:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {"projectId": project_id})
        _firebase_initialized = True
    except Exception as e:
        logger.warning("firebase.init.failed", error=str(e))


class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    """Verify Firebase JWT on every protected request."""

    def __init__(self, app, project_id: str) -> None:
        super().__init__(app)
        self._project_id = project_id
        _init_firebase(project_id)

    async def dispatch(self, request: Request, call_next):
        # Skip auth for public paths
        if request.url.path in PUBLIC_PATHS or request.url.path.startswith("/api/docs"):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            # In development, allow requests without auth (mock user)
            from config import config
            if config.is_development:
                request.state.user = {"uid": "dev-user", "role": "collector"}
                return await call_next(request)
            return JSONResponse(
                status_code=401,
                content={"error": "UNAUTHORIZED", "message": "Bearer token required"},
            )

        token = auth_header[7:]

        # Verify token
        try:
            if FIREBASE_AVAILABLE and _firebase_initialized:
                decoded = firebase_auth.verify_id_token(token)
                role = decoded.get("role", decoded.get("custom_claims", {}).get("role", "collector"))
                request.state.user = {
                    "uid":   decoded["uid"],
                    "email": decoded.get("email", ""),
                    "role":  role,
                }
            else:
                # Dev fallback: decode mock token
                request.state.user = _decode_mock_token(token)
        except Exception as e:
            logger.warning("auth.token.invalid", error=str(e))
            return JSONResponse(
                status_code=401,
                content={"error": "UNAUTHORIZED", "message": "Invalid or expired token"},
            )

        return await call_next(request)


def _decode_mock_token(token: str) -> dict:
    """Decode mock tokens used in development."""
    if "beo" in token:
        return {"uid": "mock-beo", "role": "beo", "email": "beo@nandurbar.gov.in"}
    if "secretary" in token:
        return {"uid": "mock-secretary", "role": "secretary", "email": "secretary@maharashtra.gov.in"}
    return {"uid": "mock-collector", "role": "collector", "email": "collector@nandurbar.gov.in"}
