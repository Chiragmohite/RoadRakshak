"""
RoadRakshak — Cloudinary Image Storage
"""

import os
import cloudinary
import cloudinary.uploader


def configure_cloudinary():
    """Configure Cloudinary from Render environment variables."""

    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if not cloud_name:
        raise RuntimeError("CLOUDINARY_CLOUD_NAME is missing")

    if not api_key:
        raise RuntimeError("CLOUDINARY_API_KEY is missing")

    if not api_secret:
        raise RuntimeError("CLOUDINARY_API_SECRET is missing")

    cloudinary.config(
        cloud_name=cloud_name.strip(),
        api_key=api_key.strip(),
        api_secret=api_secret.strip(),
        secure=True,
    )


def upload_image(
    file_path: str,
    folder: str = "roadrakshak",
) -> str:
    """
    Upload a local image to Cloudinary.

    Returns:
        Permanent HTTPS Cloudinary URL.
    """

    if not os.path.exists(file_path):
        raise FileNotFoundError(
            f"Image file does not exist: {file_path}"
        )

    if os.path.getsize(file_path) == 0:
        raise RuntimeError(
            f"Image file is empty: {file_path}"
        )

    configure_cloudinary()

    result = cloudinary.uploader.upload(
        file_path,
        folder=folder,
        resource_type="image",
    )

    secure_url = result.get("secure_url")

    if not secure_url:
        raise RuntimeError(
            "Cloudinary upload succeeded but returned no secure_url"
        )

    print(
        "[Cloudinary] Uploaded:",
        secure_url,
    )

    return secure_url