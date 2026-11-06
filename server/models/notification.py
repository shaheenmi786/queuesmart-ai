from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True, index=True)
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), default="general") # 'appointment', 'queue', 'doctor', 'general'
    channel = db.Column(db.String(20), default="in_app") # 'in_app', 'sms', 'email'
    is_read = db.Column(db.Boolean, default=False)
    is_delivered = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "hospital_id": self.hospital_id,
            "title": self.title,
            "message": self.message,
            "category": self.category,
            "channel": self.channel,
            "is_read": self.is_read,
            "is_delivered": self.is_delivered,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
