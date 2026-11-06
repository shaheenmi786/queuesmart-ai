from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
import os
import sys

# Ensure server directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from config import Config
from models.database import db
from sockets.events import socketio
from ml.model import MLPredictionEngine

# Import Route Blueprints
from routes.auth import auth_bp
from routes.hospitals import hospitals_bp
from routes.departments import departments_bp
from routes.doctors import doctors_bp
from routes.appointments import appointments_bp
from routes.queue import queue_bp
from routes.ai import ai_bp
from routes.admin import admin_bp
from routes.patients import patients_bp
from routes.notifications import notifications_bp
from routes.triage import triage_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize CORS for both local development and production
    CORS(
        app,
        resources={r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5000",
                "http://127.0.0.1:5000"
            ],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
            "supports_credentials": True
        }}
    )

    # Initialize Extensions
    db.init_app(app)
    Migrate(app, db)
    jwt = JWTManager(app)
    socketio.init_app(app, cors_allowed_origins="*")

    # JWT Error Handlers
    @jwt.unauthorized_loader
    def unauthorized_callback(callback):
        return jsonify({"error": "Authorization token is missing or invalid."}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Session expired. Please log in again."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(callback):
        return jsonify({"error": "Session token signature is invalid."}), 401

    # Standard JSON Error Handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Resource not found", "status_code": 404}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"error": "Internal server error occurred", "status_code": 500}), 500

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(hospitals_bp)
    app.register_blueprint(departments_bp)
    app.register_blueprint(doctors_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(queue_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(patients_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(triage_bp)

    @app.route("/api/v1/health", methods=["GET"])
    def health():
        engine = MLPredictionEngine.get_instance()
        return jsonify({
            "status": "healthy",
            "service": "QueueSmart AI Hospital Management Platform",
            "database": "connected",
            "ml_engine": "online" if engine.is_loaded else "offline",
            "active_models": engine.active_models,
            "version": "1.0.0"
        }), 200

    with app.app_context():
        db.create_all()
        # Initialize and load ML model in app context
        MLPredictionEngine.get_instance()

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    print(f"[QueueSmart AI] Starting production server on port {port}...")
    socketio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)
