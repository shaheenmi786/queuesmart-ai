import re
from typing import Dict, Any, List, Tuple

class TriageEngine:
    """
    Hospital-Approved Rule-Based Clinical Triage & Urgency Evaluation Engine.
    
    Safety Guardrails:
    - Never independently diagnoses diseases or prescribes treatments.
    - Patient self-reported severity alone never dictates clinical priority.
    - Identifies high-risk warning signs to safeguard patients and support staff review.
    - All preliminary assessments require review and sign-off by qualified hospital clinicians.
    """

    # Red Flag Warning Signs requiring immediate emergency-care instructions & staff escalation
    EMERGENCY_WARNING_KEYWORDS = [
        # Cardiovascular
        r"\bchest\s+(pain|pressure|tightness|heaviness|crushing)\b",
        r"\bradiat(ing|es)\s+to\s+(left\s+)?(arm|jaw|neck|back)\b",
        r"\b(myocardial\s+infarction|heart\s+attack)\b",
        # Severe Respiratory
        r"\b(severe|acute|can\'?t\s+breathe|gasping|suffocating)\s+(shortness\s+of\s+breath|dyspnea|breathing)\b",
        r"\b(stridor|cyanosis|turning\s+blue|respiratory\s+arrest)\b",
        # Neurological / Acute Stroke (FAST)
        r"\b(facial\s+droop|slurred\s+speech|sudden\s+weakness|one[- ]sided\s+weakness|hemiplegia)\b",
        r"\b(sudden\s+numbness|arm\s+drift|stroke|cva|transient\s+ischemic)\b",
        # Altered Consciousness / Syncope
        r"\b(unconscious|loss\s+of\s+consciousness|unresponsive|collapsed|syncope|fainted\s+with\s+chest\s+pain)\b",
        r"\b(active\s+seizure|status\s+epilepticus)\b",
        # Severe Hemorrhage / Trauma
        r"\b(uncontrolled\s+bleeding|severe\s+hemorrhage|arterial\s+bleed)\b",
        r"\b(coughing\s+up\s+blood|vomiting\s+blood|hematemesis)\b",
        # Severe Anaphylaxis
        r"\b(throat\s+closing|throat\s+swelling|tongue\s+swelling|anaphylaxis|anaphylactic)\b"
    ]

    # Urgent Review Signs requiring prompt assessment by clinical staff
    URGENT_REVIEW_KEYWORDS = [
        r"\b(high\s+fever|fever\s+above\s+103|fever\s+with\s+stiff\s+neck)\b",
        r"\b(acute\s+severe|intense|unbearable)\s+(abdominal|belly|stomach)\s+pain\b",
        r"\b(appendicitis|peritonitis|acute\s+abdomen)\b",
        r"\b(suspected\s+fracture|bone\s+broken|dislocation|deformity|unable\s+to\s+bear\s+weight)\b",
        r"\b(deep\s+cut|deep\s+laceration|wound\s+requiring\s+stitches)\b",
        r"\b(severe\s+headache|worst\s+headache\s+of\s+life|thunderclap\s+headache)\b",
        r"\b(sudden\s+vision\s+loss|eye\s+trauma|chemical\s+in\s+eye)\b",
        r"\b(severe\s+dehydration|persistent\s+vomiting\s+for\s+days)\b",
        r"\b(pregnant\s+with\s+bleeding|vaginal\s+bleeding\s+in\s+pregnancy)\b"
    ]

    @classmethod
    def evaluate_symptoms(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates symptom input and outputs preliminary triage urgency,
        detected warning flags, and staff clinical summary.
        """
        main_symptoms = (data.get("main_symptoms") or "").strip()
        description = (data.get("symptom_description") or "").strip()
        duration = (data.get("symptom_duration") or "").strip()
        severity = (data.get("reported_severity") or "moderate").strip().lower()
        is_worsening = bool(data.get("is_worsening", False))
        existing_conditions = (data.get("existing_conditions") or "").strip()

        combined_text = f"{main_symptoms} {description} {existing_conditions}".lower()

        warning_flags: List[str] = []
        is_emergency = False
        is_urgent = False

        # 1. Check Emergency Red Flags
        for pattern in cls.EMERGENCY_WARNING_KEYWORDS:
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                matched_term = match.group(0)
                warning_flags.append(f"Emergency warning: {matched_term}")
                is_emergency = True

        # 2. Check Urgent Review Flags
        for pattern in cls.URGENT_REVIEW_KEYWORDS:
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                matched_term = match.group(0)
                warning_flags.append(f"Urgent sign: {matched_term}")
                is_urgent = True

        # 3. Clinical Combination Logic
        # Worsening acute pain or high reported severity with rapid onset promotes to urgent
        if is_worsening and severity == "severe":
            warning_flags.append("Patient reports severe symptoms that are progressively worsening")
            is_urgent = True

        if "hour" in duration.lower() and is_worsening and severity in ["moderate", "severe"]:
            warning_flags.append("Rapid symptom progression within hours")
            is_urgent = True

        # Determine preliminary urgency category
        if is_emergency:
            urgency = "emergency_warning"
            staff_initial_priority = "emergency"
            summary = (
                f"POTENTIAL CLINICAL EMERGENCY: Patient presents with '{main_symptoms}'. "
                f"Detected red flag indicators: {', '.join(warning_flags[:2])}. "
                f"Urgent staff escalation and emergency care instruction advised."
            )
            emergency_message = (
                "EMERGENCY WARNING: Your reported symptoms indicate potential emergency warning signs. "
                "Please seek immediate emergency medical care or call local emergency services (911/112). "
                "Do not wait for an outpatient consultation appointment."
            )
        elif is_urgent:
            urgency = "urgent_review"
            staff_initial_priority = "urgent"
            summary = (
                f"URGENT CLINICAL REVIEW: Patient reports '{main_symptoms}' (Severity: {severity.title()}, "
                f"Worsening: {'Yes' if is_worsening else 'No'}, Duration: {duration}). "
                f"Clinical flags: {', '.join(warning_flags[:2]) if warning_flags else 'Severe worsening condition'}. "
                f"Prompt qualified staff review required."
            )
            emergency_message = None
        else:
            urgency = "normal_priority"
            staff_initial_priority = "normal"
            summary = (
                f"ROUTINE CONSULTATION: Patient reports '{main_symptoms}' (Severity: {severity.title()}, "
                f"Duration: {duration}, Worsening: {'Yes' if is_worsening else 'No'}). "
                f"No acute emergency red flags identified. Standard outpatient scheduling indicated."
            )
            emergency_message = None

        return {
            "preliminary_urgency": urgency,
            "staff_initial_priority": staff_initial_priority,
            "warning_flags": warning_flags,
            "clinical_summary": summary,
            "emergency_message": emergency_message,
            "requires_immediate_escalation": is_emergency,
            "is_worsening": is_worsening,
            "reported_severity": severity,
            "clinical_disclaimer": (
                "Preliminary rule-based assessment only. Does not constitute a clinical diagnosis. "
                "Final triage priority is determined by hospital medical staff."
            )
        }
