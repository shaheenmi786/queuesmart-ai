import pytest
from datetime import datetime
from services.triage_engine import TriageEngine
from tests.conftest import get_auth_token

def test_triage_engine_emergency_warning_signs():
    """Verify rule engine detects emergency red flags without diagnosing."""
    res = TriageEngine.evaluate_symptoms({
        "main_symptoms": "Severe crushing chest pain radiating to left arm",
        "symptom_description": "Started suddenly 30 minutes ago, sweating profusely",
        "symptom_duration": "30 minutes",
        "reported_severity": "severe",
        "is_worsening": True
    })
    assert res["preliminary_urgency"] == "emergency_warning"
    assert res["requires_immediate_escalation"] is True
    assert res["emergency_message"] is not None
    assert any("chest" in flag.lower() for flag in res["warning_flags"])
    assert "Preliminary rule-based assessment" in res["clinical_disclaimer"]

def test_triage_engine_urgent_review_signs():
    """Verify rule engine detects urgent signs requiring prompt assessment."""
    res = TriageEngine.evaluate_symptoms({
        "main_symptoms": "Suspected bone broken in ankle after fall",
        "symptom_description": "Unable to bear weight, severe swelling and deformity",
        "symptom_duration": "2 hours",
        "reported_severity": "severe",
        "is_worsening": False
    })
    assert res["preliminary_urgency"] == "urgent_review"
    assert res["requires_immediate_escalation"] is False
    assert res["staff_initial_priority"] == "urgent"

def test_triage_engine_routine_symptoms():
    """Verify routine symptoms are classified into normal priority queue."""
    res = TriageEngine.evaluate_symptoms({
        "main_symptoms": "Mild seasonal runny nose and sneezing",
        "symptom_description": "Occasional sneezes during spring pollen",
        "symptom_duration": "3 days",
        "reported_severity": "mild",
        "is_worsening": False
    })
    assert res["preliminary_urgency"] == "normal_priority"
    assert res["staff_initial_priority"] == "normal"
    assert res["requires_immediate_escalation"] is False

def test_api_preliminary_assess(app, client, seed_test_data):
    """Test preview /assess endpoint available for live booking forms."""
    token = get_auth_token(app, seed_test_data["patient_id"], role="patient", hospital_id=seed_test_data["hospital_id"])
    response = client.post(
        "/api/v1/triage/assess",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "main_symptoms": "Sudden slurred speech and facial droop",
            "symptom_description": "Started 10 minutes ago",
            "symptom_duration": "10 minutes",
            "reported_severity": "severe",
            "is_worsening": True
        }
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "assessment" in data
    assert data["assessment"]["preliminary_urgency"] == "emergency_warning"
    assert data["assessment"]["requires_immediate_escalation"] is True

def test_appointment_booking_with_symptoms_and_priority_token(app, client, seed_test_data):
    """Test patient booking appointment with symptoms generates U or N token."""
    patient_token = get_auth_token(app, seed_test_data["patient_id"], role="patient", hospital_id=seed_test_data["hospital_id"])
    
    # 1. Normal appointment
    res_normal = client.post(
        "/api/v1/appointments",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "department_id": seed_test_data["department_id"],
            "doctor_id": seed_test_data["doctor_id"],
            "appointment_date": "2026-11-20",
            "appointment_time": "09:00",
            "main_symptoms": "Routine annual cardiovascular wellness check",
            "symptom_description": "No active symptoms, checkup only",
            "symptom_duration": "1 month",
            "reported_severity": "mild",
            "is_worsening": False,
            "consent_acknowledged": True
        }
    )
    assert res_normal.status_code == 201
    norm_data = res_normal.get_json()
    assert "token" in norm_data
    assert "CARD-N" in norm_data["token"]["token_number"]
    assert "triage" in norm_data
    assert norm_data["triage"]["assessment"]["preliminary_urgency"] == "normal_priority"

    # 2. Urgent appointment
    res_urgent = client.post(
        "/api/v1/appointments",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "department_id": seed_test_data["department_id"],
            "doctor_id": seed_test_data["doctor_id"],
            "appointment_date": "2026-11-20",
            "appointment_time": "10:00",
            "main_symptoms": "Severe acute chest palpitations with rapid progression",
            "symptom_description": "Heart racing, intense pressure, worsening by the hour",
            "symptom_duration": "2 hours",
            "reported_severity": "severe",
            "is_worsening": True,
            "consent_acknowledged": True
        }
    )
    assert res_urgent.status_code == 201
    urg_data = res_urgent.get_json()
    assert urg_data["token"]["priority"] in ["urgent", "emergency"]
    assert ("CARD-U" in urg_data["token"]["token_number"] or "CARD-EMG" in urg_data["token"]["token_number"])

def test_pending_triage_review_and_staff_approval(app, client, seed_test_data):
    """Doctor/staff retrieves pending triage cases and approves priority with mandatory reason."""
    patient_token = get_auth_token(app, seed_test_data["patient_id"], role="patient", hospital_id=seed_test_data["hospital_id"])
    doctor_token = get_auth_token(app, seed_test_data["doctor_user_id"], role="doctor", hospital_id=seed_test_data["hospital_id"])

    # Create appointment
    create_res = client.post(
        "/api/v1/appointments",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "department_id": seed_test_data["department_id"],
            "doctor_id": seed_test_data["doctor_id"],
            "appointment_date": "2026-11-22",
            "appointment_time": "11:30",
            "main_symptoms": "High fever with persistent severe abdominal pain",
            "symptom_description": "Fever for 2 days, intense lower right belly pain",
            "symptom_duration": "2 days",
            "reported_severity": "severe",
            "is_worsening": True,
            "consent_acknowledged": True
        }
    )
    assert create_res.status_code == 201
    created_json = create_res.get_json()
    assessment_id = created_json["triage"]["assessment"]["id"]

    # Doctor views pending reviews
    pending_res = client.get(
        "/api/v1/triage/pending",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert pending_res.status_code == 200
    pending_items = pending_res.get_json()["pending"]
    assert any(item["id"] == assessment_id for item in pending_items)

    # Missing reason when changing priority must fail with HTTP 400
    fail_res = client.patch(
        f"/api/v1/triage/{assessment_id}/priority",
        headers={"Authorization": f"Bearer {doctor_token}"},
        json={"priority": "urgent", "reason": "   "}
    )
    assert fail_res.status_code == 400

    # Successful approval with clinical justification
    approve_res = client.patch(
        f"/api/v1/triage/{assessment_id}/priority",
        headers={"Authorization": f"Bearer {doctor_token}"},
        json={
            "priority": "urgent",
            "reason": "Confirmed acute peritoneal tenderness during pre-triage check. Expedited consultation required."
        }
    )
    assert approve_res.status_code == 200
    approved_data = approve_res.get_json()
    assert approved_data["assessment"]["staff_approved_priority"] == "urgent"
    assert approved_data["assessment"]["review_status"] == "approved"
    assert approved_data["audit_log"]["reason"] is not None

def test_emergency_escalation_workflow(app, client, seed_test_data):
    """Clinical staff can immediately escalate a case to hospital Emergency Department."""
    patient_token = get_auth_token(app, seed_test_data["patient_id"], role="patient", hospital_id=seed_test_data["hospital_id"])
    doctor_token = get_auth_token(app, seed_test_data["doctor_user_id"], role="doctor", hospital_id=seed_test_data["hospital_id"])

    # Create appointment
    create_res = client.post(
        "/api/v1/appointments",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "department_id": seed_test_data["department_id"],
            "doctor_id": seed_test_data["doctor_id"],
            "appointment_date": "2026-11-23",
            "appointment_time": "14:00",
            "main_symptoms": "Throat swelling and acute breathing difficulty after bee sting",
            "symptom_description": "Anaphylaxis signs, struggling to breathe",
            "symptom_duration": "15 minutes",
            "reported_severity": "severe",
            "is_worsening": True,
            "consent_acknowledged": True
        }
    )
    assert create_res.status_code == 201
    assessment_id = create_res.get_json()["triage"]["assessment"]["id"]

    # Escalate to Emergency
    escalate_res = client.post(
        f"/api/v1/triage/{assessment_id}/escalate",
        headers={"Authorization": f"Bearer {doctor_token}"},
        json={"reason": "Immediate airway compromise detected. Immediate ER transfer initiated."}
    )
    assert escalate_res.status_code == 200
    esc_data = escalate_res.get_json()
    assert esc_data["assessment"]["review_status"] == "escalated_emergency"
    assert esc_data["token"]["priority"] == "emergency"
    assert "-EMG" in esc_data["token"]["token_number"]

def test_patient_queue_token_lookup_with_position(app, client, seed_test_data):
    """Patient retrieves their active tokens with live position and urgency."""
    patient_token = get_auth_token(app, seed_test_data["patient_id"], role="patient", hospital_id=seed_test_data["hospital_id"])
    
    # Book appointment
    client.post(
        "/api/v1/appointments",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "department_id": seed_test_data["department_id"],
            "doctor_id": seed_test_data["doctor_id"],
            "appointment_date": "2026-11-25",
            "appointment_time": "09:30",
            "main_symptoms": "Followup after hypertension medication change",
            "symptom_description": "Blood pressure tracking",
            "symptom_duration": "2 weeks",
            "reported_severity": "mild",
            "is_worsening": False,
            "consent_acknowledged": True
        }
    )

    get_res = client.get(
        f"/api/v1/queue/patient/{seed_test_data['patient_id']}",
        headers={"Authorization": f"Bearer {patient_token}"}
    )
    assert get_res.status_code == 200
    data = get_res.get_json()
    assert "tokens" in data
    assert len(data["tokens"]) > 0
    assert "position_ahead" in data["tokens"][0]
    assert "triage_urgency" in data["tokens"][0]
