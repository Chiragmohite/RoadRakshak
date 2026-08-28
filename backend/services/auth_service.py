"""
RoadRakshak — Auth Service

Provides JWT token generation/verification and password hashing.
"""

from datetime import datetime, timedelta, timezone
from functools import wraps

import bcrypt
import jwt
from flask import current_app, g, jsonify, request


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------
def generate_token(user_id: int, role: str) -> str:
    """Generate a JWT token for the given user."""
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc)
        + timedelta(hours=current_app.config["JWT_EXPIRATION_HOURS"]),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def decode_token(token: str) -> dict | None:
    """Decode and verify a JWT token.  Returns the payload or None."""
    try:
        return jwt.decode(
            token, current_app.config["JWT_SECRET"], algorithms=["HS256"]
        )
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ---------------------------------------------------------------------------
# Route decorators
# ---------------------------------------------------------------------------
def login_required(f):
    """Decorator that requires a valid JWT token in the Authorization header."""

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        if payload is None:
            return jsonify({"error": "Invalid or expired token"}), 401

        g.current_user_id = payload["user_id"]
        g.current_user_role = payload["role"]
        return f(*args, **kwargs)

    return decorated


def role_required(*roles):
    """Decorator that requires the current user to have one of the listed roles."""

    def decorator(f):
        @wraps(f)
        @login_required
        def decorated(*args, **kwargs):
            if g.current_user_role not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)

        return decorated

    return decorator
