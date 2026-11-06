from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

class ServiceRecord(db.Model):
    """
    Historical completed consultation record used for continuous ML retraining.
    """
    __tablename__ = "service_records"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True, index=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id"), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), nullable=True)
    token_id = db.Column(db.Integer, db.ForeignKey("queue_tokens.id"), nullable=True)

    actual_wait_minutes = db.Column(db.Float, nullable=False)
    actual_service_minutes = db.Column(db.Float, nullable=False)
    ml_predicted_wait_minutes = db.Column(db.Float, nullable=True)
    ml_predicted_service_minutes = db.Column(db.Float, nullable=True)
    
    hour_of_day = db.Column(db.Integer, nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)
    priority = db.Column(db.String(20), default="normal")
    reason_for_visit = db.Column(db.String(150), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "department_id": self.department_id,
            "doctor_id": self.doctor_id,
            "actual_wait_minutes": self.actual_wait_minutes,
            "actual_service_minutes": self.actual_service_minutes,
            "ml_predicted_wait_minutes": self.ml_predicted_wait_minutes,
            "ml_predicted_service_minutes": self.ml_predicted_service_minutes,
            "hour_of_day": self.hour_of_day,
            "day_of_week": self.day_of_week,
            "priority": self.priority,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class PredictionLog(db.Model):
    """
    Logs every individual ML inference call for auditing, drift detection, and accuracy analysis.
    """
    __tablename__ = "prediction_logs"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True)
    model_name = db.Column(db.String(80), nullable=False) # 'service_duration', 'waiting_time', 'no_show', 'cost'
    model_version = db.Column(db.String(50), nullable=False)
    input_features_json = db.Column(db.Text, nullable=False)
    predicted_value = db.Column(db.Float, nullable=False)
    calibrated_uncertainty = db.Column(db.Float, nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)
    actual_value = db.Column(db.Float, nullable=True) # Populated post-consultation
    absolute_error = db.Column(db.Float, nullable=True)
    latency_ms = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "predicted_value": self.predicted_value,
            "calibrated_uncertainty": self.calibrated_uncertainty,
            "confidence_score": self.confidence_score,
            "actual_value": self.actual_value,
            "absolute_error": self.absolute_error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class ModelVersion(db.Model):
    __tablename__ = "model_versions"

    id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(80), nullable=False) # 'service_duration', 'waiting_time', 'no_show', 'cost'
    version = db.Column(db.String(50), nullable=False, unique=True) # e.g. "v1.2.0-rf-prod"
    algorithm = db.Column(db.String(100), nullable=False) # e.g. "RandomForestRegressor with OneHotEncoding"
    dataset_provenance = db.Column(db.String(255), default="Hospital Historical Clinical Dataset (200 records, 50 patients)")
    sample_count = db.Column(db.Integer, default=200)
    r2_score = db.Column(db.Float, nullable=True)
    mae_score = db.Column(db.Float, nullable=True)
    rmse_score = db.Column(db.Float, nullable=True)
    accuracy_score = db.Column(db.Float, nullable=True)
    macro_f1 = db.Column(db.Float, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    artifact_path = db.Column(db.String(255), nullable=True)
    trained_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "model_name": self.model_name,
            "version": self.version,
            "algorithm": self.algorithm,
            "dataset_provenance": self.dataset_provenance,
            "sample_count": self.sample_count,
            "r2_score": self.r2_score,
            "mae_score": self.mae_score,
            "rmse_score": self.rmse_score,
            "accuracy_score": self.accuracy_score,
            "macro_f1": self.macro_f1,
            "is_active": self.is_active,
            "trained_at": self.trained_at.isoformat() if self.trained_at else None,
        }
