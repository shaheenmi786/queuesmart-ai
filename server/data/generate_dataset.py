import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_csv_datasets(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    random.seed(42)
    np.random.seed(42)

    # 1. Patients (50 patients)
    patient_ids = [f"P{i:03d}" for i in range(1, 51)]
    genders = [random.choice(["M", "F"]) for _ in patient_ids]
    
    # Random DOB between 1945 and 2005
    start_dob = datetime(1945, 1, 1)
    end_dob = datetime(2005, 1, 1)
    dob_days = (end_dob - start_dob).days
    dobs = [(start_dob + timedelta(days=random.randint(0, dob_days))).strftime("%Y-%m-%d") for _ in patient_ids]
    
    # Registration dates between 2021 and 2023
    start_reg = datetime(2021, 1, 1)
    end_reg = datetime(2023, 6, 1)
    reg_days = (end_reg - start_reg).days
    regs = [(start_reg + timedelta(days=random.randint(0, reg_days))).strftime("%Y-%m-%d") for _ in patient_ids]

    insurances = ["BlueCross", "Medicare", "Aetna", "UnitedHealth", "Kaiser", "None"]
    ins_choices = [random.choice(insurances) for _ in patient_ids]

    df_patients = pd.DataFrame({
        "patient_id": patient_ids,
        "gender": genders,
        "date_of_birth": dobs,
        "registration_date": regs,
        "insurance_provider": ins_choices
    })
    df_patients.to_csv(os.path.join(output_dir, "patients.csv"), index=False)

    # 2. Doctors (10 doctors)
    doctor_ids = [f"D{i:03d}" for i in range(1, 11)]
    specs = [
        "Cardiology", "Cardiology",
        "Orthopedics", "Orthopedics",
        "Pediatrics", "Pediatrics",
        "General Medicine", "General Medicine",
        "Neurology", "Dermatology"
    ]
    experiences = [random.randint(3, 28) for _ in doctor_ids]
    branches = ["Main Campus", "West Wing", "Downtown Clinic", "North Pavilion"]
    branch_choices = [random.choice(branches) for _ in doctor_ids]

    df_doctors = pd.DataFrame({
        "doctor_id": doctor_ids,
        "specialization": specs,
        "years_experience": experiences,
        "hospital_branch": branch_choices
    })
    df_doctors.to_csv(os.path.join(output_dir, "doctors.csv"), index=False)

    # 3. Appointments (200 records across the 50 patients)
    appointment_ids = [f"A{i:03d}" for i in range(1, 201)]
    # Distribute across patients so each patient has ~4 appointments
    assigned_patients = []
    for i in range(200):
        assigned_patients.append(patient_ids[i % 50])
    # Shuffle to mix
    random.shuffle(assigned_patients)

    assigned_doctors = [random.choice(doctor_ids) for _ in range(200)]
    
    # Dates between 2023-01-01 and 2024-06-30
    start_appt = datetime(2023, 1, 1)
    appt_dates = [(start_appt + timedelta(days=random.randint(0, 500))).strftime("%Y-%m-%d") for _ in range(200)]
    
    times = ["08:30:00", "09:00:00", "09:30:00", "10:00:00", "10:30:00", "11:00:00", "11:30:00",
             "13:30:00", "14:00:00", "14:30:00", "15:00:00", "15:30:00", "16:00:00", "16:30:00"]
    appt_times = [random.choice(times) for _ in range(200)]

    statuses = ["Completed", "Completed", "Completed", "Scheduled", "Cancelled", "No-show"]
    appt_statuses = [random.choice(statuses) for _ in range(200)]

    reasons = ["Follow-up", "Consultation", "Routine Checkup", "Emergency", "Diagnostic Review"]
    appt_reasons = [random.choice(reasons) for _ in range(200)]

    df_appts = pd.DataFrame({
        "appointment_id": appointment_ids,
        "patient_id": assigned_patients,
        "doctor_id": assigned_doctors,
        "appointment_date": appt_dates,
        "appointment_time": appt_times,
        "status": appt_statuses,
        "reason_for_visit": appt_reasons
    })
    df_appts = df_appts.sort_values("appointment_date").reset_index(drop=True)
    df_appts["appointment_id"] = [f"A{i:03d}" for i in range(1, 201)]
    df_appts.to_csv(os.path.join(output_dir, "appointments.csv"), index=False)

    # 4. Treatments (200 records mapped 1-to-1 with appointments)
    treatment_ids = [f"T{i:03d}" for i in range(1, 201)]
    treatment_types = ["Medication", "Physical Therapy", "Surgery Consultation", "Diagnostic Scan", "ECG Monitoring"]
    t_types = [random.choice(treatment_types) for _ in range(200)]
    descriptions = [
        "Clinical examination and therapy",
        "Diagnostic evaluation with review",
        "Prescription adjustment and counseling",
        "Specialist referral and laboratory test",
        "Routine vital sign monitoring"
    ]
    t_descs = [random.choice(descriptions) for _ in range(200)]

    # Generate correlated service durations in minutes (10 to 45 mins)
    service_durations = []
    for tt in t_types:
        base = 20.0
        if tt == "Surgery Consultation": base = 35.0
        elif tt == "Physical Therapy": base = 30.0
        elif tt == "Medication": base = 15.0
        dur = max(8.0, round(float(np.random.normal(base, 5.0)), 1))
        service_durations.append(dur)

    df_treatments = pd.DataFrame({
        "treatment_id": treatment_ids,
        "appointment_id": df_appts["appointment_id"],
        "treatment_type": t_types,
        "description": t_descs,
        "service_duration_minutes": service_durations
    })
    df_treatments.to_csv(os.path.join(output_dir, "treatments.csv"), index=False)

    # 5. Billing (200 records mapped 1-to-1 with treatments)
    billing_ids = [f"B{i:03d}" for i in range(1, 201)]
    costs = []
    for tt in t_types:
        base_cost = 250.0
        if tt == "Surgery Consultation": base_cost = 1800.0
        elif tt == "Diagnostic Scan": base_cost = 950.0
        elif tt == "ECG Monitoring": base_cost = 450.0
        cost = max(80.0, round(float(np.random.normal(base_cost, base_cost * 0.25)), 2))
        costs.append(cost)

    pay_methods = ["Insurance", "Credit Card", "Cash", "Direct Deposit"]
    p_methods = [random.choice(pay_methods) for _ in range(200)]
    pay_statuses = ["Paid", "Paid", "Paid", "Pending", "Failed"]
    p_statuses = [random.choice(pay_statuses) for _ in range(200)]

    df_billing = pd.DataFrame({
        "billing_id": billing_ids,
        "treatment_id": treatment_ids,
        "patient_id": df_appts["patient_id"],
        "cost": costs,
        "payment_method": p_methods,
        "payment_status": p_statuses
    })
    df_billing.to_csv(os.path.join(output_dir, "billing.csv"), index=False)

    print(f"[Dataset Generator] Successfully generated 5 dataset files in {output_dir}:")
    print(f"patients.csv: {len(df_patients)} rows")
    print(f"doctors.csv: {len(df_doctors)} rows")
    print(f"appointments.csv: {len(df_appts)} rows")
    print(f"treatments.csv: {len(df_treatments)} rows")
    print(f"billing.csv: {len(df_billing)} rows")

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "hospital_data")
    generate_csv_datasets(out)
