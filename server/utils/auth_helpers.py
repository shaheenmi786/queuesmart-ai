from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db
from models.user import User
from models.audit import AuditLog

def role_required(allowed_roles):
    """
    Validates JWT identity and enforces role-based access control.
    Supports single role or list of allowed roles.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                return jsonify({"error": "Unauthorized. Valid session token required."}), 401

            user_id = get_jwt_identity()
            user = User.query.get(int(user_id)) if user_id else None
            if not user or not user.is_active or user.status == "suspended":
                return jsonify({"error": "Account is inactive, suspended, or not found."}), 403

            # Allow platform_admin or exact role match
            if user.role == "platform_admin" or user.role in allowed_roles:
                return fn(*args, **kwargs)

            # Map legacy 'admin' to 'hospital_admin' for seamless frontend backward compatibility
            if "admin" in allowed_roles and user.role in ["hospital_admin", "admin"]:
                return fn(*args, **kwargs)

            return jsonify({"error": f"Access forbidden. Requires {allowed_roles} role."}), 403
        return wrapper
    return decorator

def get_current_user():
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        if user_id:
            return User.query.get(int(user_id))
    except Exception:
        pass
    return None

def enforce_tenant(target_hospital_id: int):
    """
    Enforces multi-hospital tenant isolation.
    Returns True if current user is allowed to access target_hospital_id.
    """
    user = get_current_user()
    if not user:
        return False
    if user.role == "platform_admin":
        return True
    if user.hospital_id is None or user.hospital_id == target_hospital_id:
        return True
    return False

def log_audit(action: str, resource_type: str = None, resource_id: str = None, details: str = None, user_id: int = None, hospital_id: int = None):
    try:
        ip = request.remote_addr if request else "127.0.0.1"
        if user_id is None:
            user = get_current_user()
            user_id = user.id if user else None
            if user and hospital_id is None:
                hospital_id = user.hospital_id

        audit = AuditLog(
            hospital_id=hospital_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            details=details,
            ip_address=ip
        )
        db.session.add(audit)
        db.session.commit()
    except Exception as e:
        print(f"[Audit Log Error] Failed to log {action}: {e}")
