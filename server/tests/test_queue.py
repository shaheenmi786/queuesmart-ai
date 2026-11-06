import json
from datetime import datetime, timezone
from conftest import get_auth_token

def test_generate_queue_token(client, app, seed_test_data):
    p_id = seed_test_data["patient_id"]
    doc_id = seed_test_data["doctor_id"]
    dept_id = seed_test_data["department_id"]

    token = get_auth_token(app, p_id, role="patient")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "department_id": dept_id,
        "doctor_id": doc_id,
        "priority": "normal"
    }

    response = client.post("/api/v1/queue/tokens", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.get_json()
    assert "token" in data
    assert data["token"]["status"] == "waiting"
    assert "CARD-" in data["token"]["token_number"]

def test_doctor_calls_next_patient(client, app, seed_test_data):
    doc_user_id = seed_test_data["doctor_user_id"]
    doc_id = seed_test_data["doctor_id"]
    dept_id = seed_test_data["department_id"]
    patient_id = seed_test_data["patient_id"]

    p_token = get_auth_token(app, patient_id, role="patient")
    p_headers = {"Authorization": f"Bearer {p_token}"}

    # Generate token
    res = client.post("/api/v1/queue/tokens", json={
        "department_id": dept_id,
        "doctor_id": doc_id,
        "priority": "normal"
    }, headers=p_headers)
    assert res.status_code == 201

    # Doctor calls next
    d_token = get_auth_token(app, doc_user_id, role="doctor")
    d_headers = {"Authorization": f"Bearer {d_token}"}

    call_res = client.post("/api/v1/queue/call-next", json={
        "counter_number": "Counter 1",
        "doctor_id": doc_id,
        "department_id": dept_id
    }, headers=d_headers)
    assert call_res.status_code == 200
    call_data = call_res.get_json()
    assert call_data["token"]["status"] == "calling"
    assert call_data["token"]["counter_number"] == "Counter 1"

def test_full_queue_lifecycle_start_complete(client, app, seed_test_data):
    doc_user_id = seed_test_data["doctor_user_id"]
    doc_id = seed_test_data["doctor_id"]
    dept_id = seed_test_data["department_id"]
    patient_id = seed_test_data["patient_id"]

    # 1. Create Token
    p_headers = {"Authorization": f"Bearer {get_auth_token(app, patient_id, role='patient')}"}
    tok_res = client.post("/api/v1/queue/tokens", json={
        "department_id": dept_id,
        "doctor_id": doc_id,
        "priority": "urgent"
    }, headers=p_headers)
    assert tok_res.status_code == 201
    tok_id = tok_res.get_json()["token"]["id"]

    # 2. Doctor Calls Next
    d_headers = {"Authorization": f"Bearer {get_auth_token(app, doc_user_id, role='doctor')}"}
    client.post("/api/v1/queue/call-next", json={
        "counter_number": "Counter 1",
        "doctor_id": doc_id,
        "department_id": dept_id
    }, headers=d_headers)

    # 3. Start Consultation
    start_res = client.post(f"/api/v1/queue/{tok_id}/start", headers=d_headers)
    assert start_res.status_code == 200
    assert start_res.get_json()["token"]["status"] in ["consulting", "in_progress"]

    # 4. Complete Consultation
    comp_res = client.post(f"/api/v1/queue/{tok_id}/complete", json={
        "actual_service_minutes": 22.5,
        "treatment_type": "ECG & Consultation",
        "notes": "Patient stable"
    }, headers=d_headers)
    assert comp_res.status_code == 200
    comp_data = comp_res.get_json()
    assert comp_data["token"]["status"] == "completed"
    assert comp_data["token"]["actual_service_minutes"] == 22.5
