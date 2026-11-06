from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db
from models.notification import Notification
from utils.auth_helpers import get_current_user

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/v1/notifications")

@notifications_bp.route("", methods=["GET"])
@jwt_required()
def get_notifications():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.id.desc()).limit(30).all()
    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()

    return jsonify({
        "notifications": [n.to_dict() for n in notifications],
        "unread_count": unread_count
    }), 200

@notifications_bp.route("/<int:id>/read", methods=["PATCH"])
@jwt_required()
def mark_read(id):
    user = get_current_user()
    notif = Notification.query.filter_by(id=id, user_id=user.id).first()
    if not notif:
        return jsonify({"error": "Notification not found."}), 404

    notif.is_read = True
    db.session.commit()
    return jsonify({"message": "Notification marked as read.", "notification": notif.to_dict()}), 200

@notifications_bp.route("/read-all", methods=["PATCH"])
@jwt_required()
def mark_all_read():
    user = get_current_user()
    Notification.query.filter_by(user_id=user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read."}), 200
