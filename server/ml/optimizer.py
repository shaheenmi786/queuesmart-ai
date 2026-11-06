import math
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db
from models.queue import QueueToken
from models.department import Department
from models.doctor import Doctor
from models.hospital import Hospital

def calculate_mmc_queue_metrics(arrival_rate_lambda: float, service_rate_mu: float, num_servers_c: int) -> Dict[str, float]:
    """
    Erlang-C M/M/c multi-server queue formulas:
    - lambda: arrival rate (patients per hour)
    - mu: service rate (patients per hour per server)
    - c: number of servers (counters/doctors)
    """
    if num_servers_c <= 0 or service_rate_mu <= 0:
        return {"utilization": 1.0, "p0": 0.0, "waiting_time_mins": 60.0}

    rho = arrival_rate_lambda / (num_servers_c * service_rate_mu)
    if rho >= 1.0:
        return {
            "utilization": min(1.0, round(rho, 2)),
            "is_overloaded": True,
            "waiting_time_mins": round(30.0 * rho, 1),
            "expected_queue_length": 15
        }

    sum_terms = sum([(arrival_rate_lambda / service_rate_mu) ** n / math.factorial(n) for n in range(num_servers_c)])
    c_term = ((arrival_rate_lambda / service_rate_mu) ** num_servers_c) / (math.factorial(num_servers_c) * (1.0 - rho))
    p0 = 1.0 / (sum_terms + c_term)

    prob_delay = c_term * p0
    wq_hours = prob_delay / (num_servers_c * service_rate_mu - arrival_rate_lambda)
    wq_minutes = max(1.0, wq_hours * 60.0)
    lq = arrival_rate_lambda * wq_hours

    return {
        "utilization": round(rho, 2),
        "is_overloaded": False,
        "p0": round(p0, 3),
        "prob_delay": round(prob_delay, 3),
        "waiting_time_mins": round(wq_minutes, 1),
        "expected_queue_length": max(0, round(lq, 1))
    }

def get_counter_recommendations(hospital_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Analyze active queue state per department across persistent database records
    and generate optimal counter allocation recommendations with multi-hospital support.
    """
    recommendations = []
    dept_query = Department.query.filter_by(is_active=True)
    if hospital_id:
        dept_query = dept_query.filter_by(hospital_id=hospital_id)
    departments = dept_query.all()

    for dept in departments:
        token_query = QueueToken.query.filter(
            QueueToken.department_id == dept.id,
            QueueToken.status.in_(["waiting", "calling", "consulting"])
        )
        if hospital_id:
            token_query = token_query.filter_by(hospital_id=hospital_id)
        waiting_count = token_query.count()

        doc_query = Doctor.query.filter(
            Doctor.department_id == dept.id,
            Doctor.status == "available"
        )
        if hospital_id:
            doc_query = doc_query.filter_by(hospital_id=hospital_id)
        active_doctors = doc_query.count()

        avg_service_mins = dept.average_service_time_mins or 15.0
        service_rate_mu = 60.0 / avg_service_mins
        
        arrival_rate_lambda = max(1.0, float(waiting_count * 2.2))
        c = max(1, active_doctors)

        metrics = calculate_mmc_queue_metrics(arrival_rate_lambda, service_rate_mu, c)
        utilization = metrics["utilization"]

        status = "Optimal"
        action = "Maintain Current Allocation"
        reason = f"Current capacity ({c} counter/doctor) satisfies flow."
        recommended_counters = c

        if utilization >= 0.85 or waiting_count > 6:
            status = "Congested"
            recommended_counters = c + 1
            action = f"Add +1 Counter for {dept.name}"
            reason = f"Traffic intensity ({int(utilization * 100)}%) is elevated with {waiting_count} waiting. Adding 1 counter will reduce wait time by ~{round(metrics['waiting_time_mins'] * 0.45, 1)} mins."
        elif utilization < 0.35 and c > 1 and waiting_count <= 1:
            status = "Underutilized"
            recommended_counters = max(1, c - 1)
            action = f"Consolidate {dept.name} to {recommended_counters} Counter"
            reason = f"Counter utilization is low ({int(utilization * 100)}%). Reassigning 1 counter can support busier departments."

        recommendations.append({
            "hospital_id": dept.hospital_id,
            "department_id": dept.id,
            "department_name": dept.name,
            "department_code": dept.code,
            "current_counters": c,
            "waiting_patients": waiting_count,
            "traffic_intensity": utilization,
            "queue_status": status,
            "traffic_state": status,
            "recommended_counters": recommended_counters,
            "action": action,
            "reason": reason,
            "projected_wait_mins": metrics["waiting_time_mins"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    return recommendations

def get_hourly_crowd_forecast(hospital_id: Optional[int] = None) -> List[Dict[str, Any]]:
    hour_distribution = [
        {"hour": "08:00", "weight": 0.45},
        {"hour": "09:00", "weight": 0.85},
        {"hour": "10:00", "weight": 1.00},
        {"hour": "11:00", "weight": 0.95},
        {"hour": "12:00", "weight": 0.70},
        {"hour": "13:00", "weight": 0.50},
        {"hour": "14:00", "weight": 0.65},
        {"hour": "15:00", "weight": 0.80},
        {"hour": "16:00", "weight": 0.90},
        {"hour": "17:00", "weight": 0.75},
        {"hour": "18:00", "weight": 0.40},
    ]

    dept_query = Department.query.filter_by(is_active=True)
    if hospital_id:
        dept_query = dept_query.filter_by(hospital_id=hospital_id)
    active_dept_count = dept_query.count() or 5
    base_hourly_patients = active_dept_count * 5

    forecast = []
    for item in hour_distribution:
        projected = int(round(base_hourly_patients * item["weight"]))
        status_str = "Peak" if item["weight"] >= 0.90 else ("Moderate" if item["weight"] >= 0.60 else "Light")
        forecast.append({
            "hour": item["hour"],
            "projected_arrivals": projected,
            "capacity_threshold": int(base_hourly_patients * 0.85),
            "status": status_str,
            "traffic_level": status_str
        })

    return forecast
