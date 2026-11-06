from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

class Hospital(db.Model):
    __tablename__ = "hospitals"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True) # e.g. ACH-01
    address = db.Column(db.String(255), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), default="India")
    contact_number = db.Column(db.String(30), nullable=True)
    official_email = db.Column(db.String(120), nullable=True)
    website = db.Column(db.String(150), nullable=True)
    operating_hours = db.Column(db.String(100), default="08:00 - 20:00")
    timezone = db.Column(db.String(50), default="Asia/Kolkata")
    status = db.Column(db.String(20), default="active", index=True) # 'active', 'inactive', 'onboarding'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    settings = db.relationship("HospitalSetting", backref="hospital", uselist=False, cascade="all, delete-orphan")
    departments = db.relationship("Department", backref="hospital", lazy=True, cascade="all, delete-orphan")
    counters = db.relationship("Counter", backref="hospital", lazy=True, cascade="all, delete-orphan")
    users = db.relationship("User", backref="hospital", lazy=True)
    appointments = db.relationship("Appointment", backref="hospital", lazy=True)
    tokens = db.relationship("QueueToken", backref="hospital", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "hospital_id": self.id,
            "name": self.name,
            "code": self.code,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "contact_number": self.contact_number,
            "official_email": self.official_email,
            "website": self.website,
            "operating_hours": self.operating_hours,
            "timezone": self.timezone,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "departments_count": len(self.departments) if self.departments else 0,
        }

class HospitalSetting(db.Model):
    __tablename__ = "hospital_settings"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), unique=True, nullable=False)
    max_advance_booking_days = db.Column(db.Integer, default=30)
    queue_buffer_minutes = db.Column(db.Integer, default=10)
    allow_walkins = db.Column(db.Boolean, default=True)
    auto_call_next = db.Column(db.Boolean, default=False)
    emergency_priority_weight = db.Column(db.Float, default=3.0)
    urgent_priority_weight = db.Column(db.Float, default=2.0)
    grace_period_minutes = db.Column(db.Integer, default=15)

    def to_dict(self):
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "max_advance_booking_days": self.max_advance_booking_days,
            "queue_buffer_minutes": self.queue_buffer_minutes,
            "allow_walkins": self.allow_walkins,
            "auto_call_next": self.auto_call_next,
            "emergency_priority_weight": self.emergency_priority_weight,
            "urgent_priority_weight": self.urgent_priority_weight,
            "grace_period_minutes": self.grace_period_minutes,
        }

class OperatingHours(db.Model):
    __tablename__ = "operating_hours"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False) # 0 = Monday, 6 = Sunday
    opening_time = db.Column(db.String(10), default="08:00")
    closing_time = db.Column(db.String(10), default="20:00")
    is_closed = db.Column(db.Boolean, default=False)

    def to_dict(self):
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "day_of_week": self.day_of_week,
            "day_name": days[self.day_of_week] if 0 <= self.day_of_week <= 6 else str(self.day_of_week),
            "opening_time": self.opening_time,
            "closing_time": self.closing_time,
            "is_closed": self.is_closed,
        }
