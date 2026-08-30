"""
RoadRakshak — One-Time Admin Provisioning

Creates a single admin account directly in the configured database.
This script does NOT modify the public registration flow.
"""

import getpass
import os
import sys

from app import create_app
from database.models import User, db
from services.auth_service import hash_password


def main():
    app = create_app()

    with app.app_context():
        print("\n=== RoadRakshak Admin Provisioning ===\n")

        username = input("Admin username: ").strip()
        email = input("Admin email: ").strip()
        password = getpass.getpass("Admin password: ")
        confirm = getpass.getpass("Confirm password: ")

        if not username:
            print("ERROR: Username cannot be empty.")
            sys.exit(1)

        if not email or "@" not in email:
            print("ERROR: Please enter a valid email.")
            sys.exit(1)

        if len(password) < 6:
            print("ERROR: Password must be at least 6 characters.")
            sys.exit(1)

        if password != confirm:
            print("ERROR: Passwords do not match.")
            sys.exit(1)

        existing_username = User.query.filter_by(username=username).first()
        if existing_username:
            if existing_username.role == "admin":
                print(f"\nAdmin username '{username}' already exists.")
                print("No changes were made.")
                return

            print(
                f"\nERROR: Username '{username}' already belongs "
                f"to a non-admin user."
            )
            sys.exit(1)

        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            if existing_email.role == "admin":
                print(f"\nAn admin already exists with email '{email}'.")
                print("No changes were made.")
                return

            print(
                f"\nERROR: Email '{email}' already belongs "
                f"to a non-admin user."
            )
            sys.exit(1)

        admin = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role="admin",
        )

        db.session.add(admin)
        db.session.commit()

        print("\nSUCCESS: Admin account created.")
        print(f"Username: {admin.username}")
        print(f"Email:    {admin.email}")
        print("Role:     admin")
        print("\nYou can now log in through the normal RoadRakshak login page.")


if __name__ == "__main__":
    main()