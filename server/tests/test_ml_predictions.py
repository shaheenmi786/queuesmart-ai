import json

def test_service_duration_prediction(client):
    payload = {
        "department": "Cardiology",
        "doctor_id": "D001",
        "years_experience": 24,
        "age": 45,
        "treatment_type": "Physical Therapy",
        "hour_of_day": 10,
        "day_of_week": 1,
        "insurance_provider": "Medicare"
    }

    response = client.post("/api/v1/predictions/service-duration", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "predicted_duration_minutes" in data
    assert 5.0 <= data["predicted_duration_minutes"] <= 60.0
    assert "confidence_interval" in data
    assert "feature_contributions" in data
    assert data["model_metadata"]["service_duration"]["r2"] >= 0.5

def test_waiting_time_prediction(client):
    payload = {
        "department": "Cardiology",
        "doctor_id": "D001",
        "queue_length": 3,
        "hour_of_day": 11,
        "day_of_week": 2,
        "priority": "normal"
    }

    response = client.post("/api/v1/predictions/waiting-time", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "predicted_wait_minutes" in data
    assert data["predicted_wait_minutes"] >= 0
    assert "confidence_interval" in data

def test_no_show_risk_prediction(client):
    payload = {
        "age": 35,
        "gender": "M",
        "insurance_provider": "None",
        "lead_time_days": 10,
        "hour_of_day": 14,
        "day_of_week": 4
    }

    response = client.post("/api/v1/predictions/no-show", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "no_show_probability" in data
    assert 0.0 <= data["no_show_probability"] <= 1.0
    assert data["risk_category"] in ["Low Risk", "Moderate Risk", "High Risk"]

def test_treatment_cost_prediction(client):
    payload = {
        "treatment_type": "Specialist Consultation",
        "service_duration_minutes": 25.0,
        "insurance_provider": "Private Health",
        "age": 52
    }

    response = client.post("/api/v1/predictions/cost", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "predicted_cost" in data
    assert data["predicted_cost"] > 0
    assert "estimated_range" in data

def test_crowd_forecast_endpoint(client):
    response = client.get("/api/v1/predictions/crowd-forecast")
    assert response.status_code == 200
    data = response.get_json()
    assert "forecast" in data
    assert len(data["forecast"]) > 0
    first_slot = data["forecast"][0]
    assert "hour" in first_slot
    assert "traffic_level" in first_slot

def test_counter_recommendations_endpoint(client, seed_test_data):
    response = client.get("/api/v1/predictions/counter-recommendations")
    assert response.status_code == 200
    data = response.get_json()
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0
    rec = data["recommendations"][0]
    assert "department_name" in rec
    assert "recommended_counters" in rec
    assert "traffic_state" in rec
