from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

# Association table for roles and permissions
role_permissions = db.Table(
    "role_permissions",
    db.Column("role_id", db.Integer, db.ForeignKey("roles.id"), primary_key=True),
    db.Column("permission_id", db.Integer, db.ForeignKey("permissions.id"), primary_key=True)
)

class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False) # 'platform_admin', 'hospital_admin', 'doctor', 'staff', 'patient'
    description = db.Column(db.String(255), nullable=True)

    permissions = db.relationship("Permission", secondary=role_permissions, backref="roles")

class Permission(db.Model):
    __tablename__ = "permissions"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(80), unique=True, nullable=False) # e.g. 'queue:call', 'hospital:manage', 'patient:view'
    description = db.Column(db.String(255), nullable=True)

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True, index=True) # Null for platform_admin
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="patient", index=True)  # 'platform_admin', 'hospital_admin', 'doctor', 'staff', 'patient'
    is_active = db.Column(db.Boolean, default=True)
    status = db.Column(db.String(20), default="active") # 'active', 'suspended', 'pending_verification'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    doctor_profile = db.relationship("Doctor", backref="user", uselist=False, cascade="all, delete-orphan")
    appointments = db.relationship("Appointment", backref="patient", lazy=True, foreign_keys="Appointment.patient_id")
    tokens = db.relationship("QueueToken", backref="patient", lazy=True, foreign_keys="QueueToken.patient_id")
    notifications = db.relationship("Notification", backref="user", lazy=True, cascade="all, delete-orphan")
    sessions = db.relationship("UserSession", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        data = {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "is_active": self.is_active,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if self.doctor_profile:
            data["doctor_profile"] = self.doctor_profile.to_dict()
        if hasattr(self, "patient_record") and self.patient_record:
            data["patient_record"] = self.patient_record.to_dict()
        return data

class UserSession(db.Model):
    __tablename__ = "user_sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    refresh_token_jti = db.Column(db.String(120), unique=True, nullable=True, index=True)
    ip_address = db.Column(db.String(50), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    token_hash = db.Column(db.String(256), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
