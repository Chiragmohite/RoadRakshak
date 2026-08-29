"""
RoadRakshak — Cloudinary Image Storage
"""

import os

import cloudinary
import cloudinary.uploader


def configure_cloudinary():
    """Configure Cloudinary from environment variables."""

    cloudinary.config(
        cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
        api_key=os.environ.get("CLOUDINARY_API_KEY"),
        api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
        secure=True,
    )


def upload_image(file_path: str, folder: str = "roadrakshak") -> str:
    """
    Upload a local image to Cloudinary.

    Returns the permanent secure URL.
    """

    configure_cloudinary()

    result = cloudinary.uploader.upload(
        file_path,
        folder=folder,
        resource_type="image",
    )

    return result["secure_url"]