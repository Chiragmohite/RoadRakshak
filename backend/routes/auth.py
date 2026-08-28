"""
RoadRakshak — Auth Routes

POST /api/auth/register  — create a new user account
POST /api/auth/login     — authenticate and receive JWT
GET  /api/auth/me        — get current user profile (requires token)
"""

from flask import Blueprint, jsonify, request

from database.models import User, db
from services.auth_service import (
    check_password,
    generate_token,
    hash_password,
    login_required,
)
from flask import g

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

VALID_ROLES = {"citizen", "municipal", "admin"}


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    role = (data.get("role") or "citizen").strip().lower()

    # Validation
    errors = []
    if not username or len(username) < 3:
        errors.append("Username must be at least 3 characters")
    if not email or "@" not in email:
        errors.append("Valid email is required")
    if not password or len(password) < 6:
        errors.append("Password must be at least 6 characters")
    if role not in VALID_ROLES:
        errors.append(f"Role must be one of: {', '.join(sorted(VALID_ROLES))}")
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    # Check uniqueness
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role=role,
    )
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id, user.role)
    return jsonify({"user": user.to_dict(), "token": token}), 201


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not check_password(password, user.password_hash):
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_token(user.id, user.role)
    return jsonify({"user": user.to_dict(), "token": token}), 200


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------
@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    user = User.query.get(g.current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200


# ---------------------------------------------------------------------------
# GET /api/auth/users — list users (optionally filtered by role)
# ---------------------------------------------------------------------------
@auth_bp.route("/users", methods=["GET"])
@login_required
def list_users():
    role = request.args.get("role")
    query = User.query
    if role:
        query = query.filter_by(role=role)
    users = query.order_by(User.username.asc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200

