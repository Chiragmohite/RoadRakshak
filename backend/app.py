"""
RoadRakshak — Flask Application Factory

Creates the Flask app, initialises extensions, and registers blueprints.
"""

import os
from pathlib import Path

from flask import Flask
from flask_cors import CORS

from config import Config
from database.models import db


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # --------------- Extensions ---------------
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)

    # --------------- Ensure directories ---------------
    base_dir = Path(__file__).resolve().parent
    os.makedirs(base_dir / "database", exist_ok=True)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(Path(app.config["UPLOAD_FOLDER"]) / "reports", exist_ok=True)
    os.makedirs(Path(app.config["UPLOAD_FOLDER"]) / "repairs", exist_ok=True)
    os.makedirs(Path(app.config["UPLOAD_FOLDER"]) / "annotated", exist_ok=True)

    # --------------- Register blueprints ---------------
    from routes.auth import auth_bp
    from routes.reports import reports_bp
    from routes.detect import detect_bp
    from routes.assignments import assignments_bp
    from routes.repairs import repairs_bp
    from routes.dashboard import dashboard_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(detect_bp)
    app.register_blueprint(assignments_bp)
    app.register_blueprint(repairs_bp)
    app.register_blueprint(dashboard_bp)

    # --------------- Create DB tables ---------------
    with app.app_context():
        db.create_all()

    # --------------- Serve uploaded files ---------------
    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        from flask import send_from_directory
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # --------------- Health check ---------------
    @app.route("/api/health")
    def health():
        model_path = app.config["MODEL_PATH"]
        model_exists = os.path.exists(model_path)
        return {
            "status": "ok",
            "engine": "real" if model_exists else "demo",
            "model_loaded": model_exists,
        }

    return app


# --------------- Run ---------------
if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
