"""
RoadRakshak — Application Configuration
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


class Config:
    """Base configuration."""

    # Flask
    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "roadrakshak-dev-secret-change-in-prod"
    )

    # Database
    db_file = (BASE_DIR / "database" / "roadrakshak.db").as_posix()

    database_url = os.environ.get("DATABASE_URL")

    # Render/PostgreSQL compatibility
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace(
            "postgres://",
            "postgresql://",
            1
        )

    SQLALCHEMY_DATABASE_URI = database_url or f"sqlite:///{db_file}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET = os.environ.get("JWT_SECRET", SECRET_KEY)
    JWT_EXPIRATION_HOURS = 24

    # File uploads
    UPLOAD_FOLDER = str(BASE_DIR / "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload

    # AI Model
    MODEL_PATH = str(BASE_DIR / "models" / "best.onnx")
    DETECTION_CONFIDENCE_THRESHOLD = 0.05

    # Duplicate clustering
    CLUSTER_RADIUS_METERS = 50

    # Allowed image extensions
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}