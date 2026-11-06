import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AlertBanner } from '../common/AlertBanner';
import { Department, Doctor, PriorityLevel } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { departmentService } from '../../services/departments/departmentService';
import { doctorService } from '../../services/doctors/doctorService';
import { appointmentService } from '../../services/appointments/appointmentService';
import { aiService } from '../../services/predictions/aiService';
import { triageService } from '../../services/triage/triageService';
import {
  Sparkles,
  Calendar,
  Clock,
  Stethoscope,
  AlertTriangle,
  ShieldAlert,
  PhoneCall,
  Activity,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (appointment: any, token: any) => void;
}

const COMMON_SYMPTOMS = [
  'General Medical Consultation / Checkup',
  'Chest Pain or Pressure',
  'Shortness of Breath / Breathing Difficulty',
  'Sudden Weakness, Numbness or Facial Droop',
  'High Fever with Chills / Shivering',
  'Acute Severe Abdominal / Stomach Pain',
  'Suspected Broken Bone or Joint Dislocation',
  'Persistent Cough or Flu Symptoms',
  'Severe Migraine / Acute Headache',
  'Skin Rash / Allergic Reaction',
  'Other Symptoms',
];

const DURATION_OPTIONS = [
  'Less than 2 hours ago',
  '2 to 6 hours ago',
  'Today (Within 24 hours)',
  '2 to 3 days',
  '1 to 2 weeks',
  'More than 1 month',
];

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');

  // Appointment schedule
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>('09:30');

  // Symptom-Based Smart Triage Fields
  const [selectedCommonSymptom, setSelectedCommonSymptom] = useState<string>(COMMON_SYMPTOMS[0]);
  const [customSymptom, setCustomSymptom] = useState<string>('');
  const [symptomDescription, setSymptomDescription] = useState<string>('');
  const [symptomDuration, setSymptomDuration] = useState<string>(DURATION_OPTIONS[2]);
  const [reportedSeverity, setReportedSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [isWorsening, setIsWorsening] = useState<boolean>(false);
  const [existingConditions, setExistingConditions] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [consentAcknowledged, setConsentAcknowledged] = useState<boolean>(false);

  // Emergency Warning Interceptor state
  const [detectedEmergency, setDetectedEmergency] = useState<boolean>(false);
  const [emergencyMessage, setEmergencyMessage] = useState<string | null>(null);
  const [warningFlags, setWarningFlags] = useState<string[]>([]);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);

  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ML Predictions preview
  const [predictedServiceMins, setPredictedServiceMins] = useState<number | null>(null);
  const [predictedWaitMins, setPredictedWaitMins] = useState<number | null>(null);
  const [isCalculatingAI, setIsCalculatingAI] = useState(false);

  const availableSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  ];

  const effectiveMainSymptoms =
    selectedCommonSymptom === 'Other Symptoms' && customSymptom.trim()
      ? customSymptom.trim()
      : selectedCommonSymptom;

  // Load departments
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsLoadingMeta(true);
      departmentService
        .getDepartments()
        .then((res) => {
          setDepartments(res.departments);
          if (res.departments.length > 0) {
            setSelectedDeptId(res.departments[0].id);
          }
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Failed to load hospital departments.');
        })
        .finally(() => setIsLoadingMeta(false));
    }
  }, [isOpen]);

  // Load doctors when department changes
  useEffect(() => {
    if (selectedDeptId) {
      doctorService
        .getDoctors(Number(selectedDeptId))
        .then((res) => {
          setDoctors(res.doctors);
          if (res.doctors.length > 0) {
            setSelectedDoctorId(res.doctors[0].id);
          } else {
            setSelectedDoctorId('');
          }
        })
        .catch(() => setDoctors([]));
    }
  }, [selectedDeptId]);

  // Live Symptom Triage Assessment Evaluation
  useEffect(() => {
    if (!effectiveMainSymptoms) return;

    const timer = setTimeout(async () => {
      try {
        const res = await triageService.assessSymptoms({
          main_symptoms: effectiveMainSymptoms,
          symptom_description: symptomDescription,
          symptom_duration: symptomDuration,
          reported_severity: reportedSeverity,
          is_worsening: isWorsening,
          existing_conditions: existingConditions,
        });

        const assessment = res.assessment;
        if (assessment.requires_immediate_escalation) {
          setDetectedEmergency(true);
          setEmergencyMessage(assessment.emergency_message || null);
          setWarningFlags(assessment.warning_flags || []);
        } else {
          setDetectedEmergency(false);
          setEmergencyMessage(null);
          setWarningFlags(assessment.warning_flags || []);
        }
      } catch (e) {
        // Silent background check failure fallback
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [effectiveMainSymptoms, symptomDescription, symptomDuration, reportedSeverity, isWorsening, existingConditions]);

  // AI ML Prediction calculation
  useEffect(() => {
    const selectedDept = departments.find((d) => d.id === Number(selectedDeptId));
    if (selectedDept) {
      setIsCalculatingAI(true);
      const deptCode = selectedDept.code;

      Promise.all([
        aiService.predictServiceTime({
          department_code: deptCode,
          reason_category: effectiveMainSymptoms,
          priority: detectedEmergency ? 'emergency' : (reportedSeverity === 'severe' || isWorsening ? 'urgent' : 'normal'),
          hour_of_day: parseInt(time.split(':')[0], 10) || 10,
          day_of_week: new Date(date).getDay(),
        }),
        aiService.predictWaitingTime({
          department_code: deptCode,
          queue_length: 2,
          available_doctors: Math.max(1, doctors.length),
          priority: detectedEmergency ? 'emergency' : (reportedSeverity === 'severe' || isWorsening ? 'urgent' : 'normal'),
        }),
      ])
        .then(([serviceRes, waitRes]) => {
          if (serviceRes.predicted_service_minutes) {
            setPredictedServiceMins(serviceRes.predicted_service_minutes);
          }
          if (waitRes.predicted_wait_minutes) {
            setPredictedWaitMins(waitRes.predicted_wait_minutes);
          }
        })
        .catch(() => {
          setPredictedServiceMins(selectedDept.average_service_time_mins || 15);
          setPredictedWaitMins(15);
        })
        .finally(() => setIsCalculatingAI(false));
    }
  }, [selectedDeptId, effectiveMainSymptoms, reportedSeverity, isWorsening, detectedEmergency, time, date, doctors.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !selectedDoctorId) {
      setErrorMsg('Please select a department and an attending doctor.');
      return;
    }

    if (!consentAcknowledged) {
      setErrorMsg('Please acknowledge the clinical triage review consent notice before proceeding.');
      return;
    }

    // If emergency symptoms detected, show emergency confirmation warning first
    if (detectedEmergency && !showEmergencyModal) {
      setShowEmergencyModal(true);
      return;
    }

    proceedWithBooking();
  };

  const proceedWithBooking = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setShowEmergencyModal(false);

      const res = await appointmentService.createAppointment({
        department_id: Number(selectedDeptId),
        doctor_id: Number(selectedDoctorId),
        appointment_date: date,
        appointment_time: time,
        reason: effectiveMainSymptoms,
        main_symptoms: effectiveMainSymptoms,
        symptom_description: symptomDescription || effectiveMainSymptoms,
        symptom_duration: symptomDuration,
        reported_severity: reportedSeverity,
        is_worsening: isWorsening,
        existing_conditions: existingConditions,
        additional_notes: additionalNotes,
        consent_acknowledged: consentAcknowledged,
      });

      onSuccess(res.appointment, res.token);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to book appointment. Slot may be unavailable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Smart Appointment Booking & Symptom Triage"
        description="Provide your symptoms so our rule-based clinical engine and medical staff can assign your queue priority token."
        maxWidth="xl"
      >
        {errorMsg && (
          <AlertBanner
            type="error"
            message={errorMsg}
            onDismiss={() => setErrorMsg(null)}
            className="mb-4"
          />
        )}

        {/* Real-time Emergency Warning Interceptor Banner */}
        {detectedEmergency && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border-2 border-red-500 text-red-900 shadow-sm flex items-start gap-3 animate-pulse">
            <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm text-red-800 uppercase tracking-wide">
                Critical Warning: Potential Clinical Emergency
              </h4>
              <p className="text-xs text-red-700 mt-1">
                {emergencyMessage ||
                  'Your symptoms indicate potential acute emergency warning signs. If you are experiencing chest pain, severe breathlessness, or stroke symptoms, please dial 911 / 112 or proceed immediately to the nearest Emergency Department.'}
              </p>
              {warningFlags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {warningFlags.map((flag, idx) => (
                    <span
                      key={idx}
                      className="inline-block bg-red-200/80 text-red-900 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {isLoadingMeta ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Loading hospital departments & schedules...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Authenticated Patient Identification */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Patient</span>
                <span className="font-bold text-slate-800 text-sm">{user?.name || 'Authenticated Patient'}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-medium">Email / ID</span>
                <span className="text-slate-600 font-medium">{user?.email}</span>
              </div>
            </div>

            {/* Department & Attending Doctor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hospital Department *
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code}) - {dept.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attending Doctor *
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                  disabled={doctors.length === 0}
                >
                  {doctors.length === 0 ? (
                    <option value="">No doctors available in this department</option>
                  ) : (
                    doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} - {doc.specialization} ({doc.status})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Appointment Date *
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Preferred Slot *
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                >
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section: Symptom Information & Urgency Assessment */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Clinical Symptom Assessment
                </h3>
              </div>

              {/* Main Symptoms Selection */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Main Symptoms *
                  </label>
                  <select
                    value={selectedCommonSymptom}
                    onChange={(e) => setSelectedCommonSymptom(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    {COMMON_SYMPTOMS.map((symp) => (
                      <option key={symp} value={symp}>
                        {symp}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCommonSymptom === 'Other Symptoms' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Specify Other Symptoms *
                    </label>
                    <input
                      type="text"
                      value={customSymptom}
                      onChange={(e) => setCustomSymptom(e.target.value)}
                      placeholder="e.g. Earache, dizziness, joint swelling..."
                      className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                {/* Symptom Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Detailed Description of Symptoms *
                  </label>
                  <textarea
                    rows={2}
                    value={symptomDescription}
                    onChange={(e) => setSymptomDescription(e.target.value)}
                    placeholder="Describe how you feel, location of pain, any triggers, or associated symptoms..."
                    className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Duration & Reported Severity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      When did symptoms start? *
                    </label>
                    <select
                      value={symptomDuration}
                      onChange={(e) => setSymptomDuration(e.target.value)}
                      className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reported Severity *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['mild', 'moderate', 'severe'] as const).map((sev) => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setReportedSeverity(sev)}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            reportedSeverity === sev
                              ? sev === 'severe'
                                ? 'bg-red-600 text-white border-red-700 shadow-xs'
                                : sev === 'moderate'
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                : 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {sev.charAt(0).toUpperCase() + sev.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Worsening Toggle */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="worseningToggle"
                    checked={isWorsening}
                    onChange={(e) => setIsWorsening(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="worseningToggle" className="text-xs text-slate-800 font-medium cursor-pointer">
                    <span className="font-bold text-slate-900">Are symptoms rapidly getting worse?</span>
                    <span className="block text-slate-500 text-[11px]">
                      Check this box if your discomfort or symptoms have intensified significantly over recent hours.
                    </span>
                  </label>
                </div>

                {/* Existing Medical History (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Existing Medical Conditions (Optional)
                    </label>
                    <input
                      type="text"
                      value={existingConditions}
                      onChange={(e) => setExistingConditions(e.target.value)}
                      placeholder="e.g. Asthma, Hypertension, Diabetes..."
                      className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Additional Notes for Clinical Staff (Optional)
                    </label>
                    <input
                      type="text"
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="e.g. Requires wheelchair assistance, allergies..."
                      className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Duration & Waiting Prediction Panel */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200/70 text-xs text-slate-700 flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-xs text-blue-600 flex-shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">QueueSmart AI Service Prediction</span>
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-100 px-2 py-0.5 rounded-full">
                    Predictive Regression Engine
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-slate-500 block">Predicted Service Duration</span>
                    <span className="text-sm font-bold text-slate-900">
                      {isCalculatingAI ? 'Estimating...' : `${predictedServiceMins ?? 15} mins`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Estimated Queue Wait</span>
                    <span className="text-sm font-bold text-slate-900">
                      {isCalculatingAI ? 'Estimating...' : `~${predictedWaitMins ?? 10} mins`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mandatory Consent Notice */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="triageConsent"
                checked={consentAcknowledged}
                onChange={(e) => setConsentAcknowledged(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 mt-0.5"
                required
              />
              <label htmlFor="triageConsent" className="text-xs text-amber-900 cursor-pointer">
                <span className="font-bold block">Clinical Triage Consent Notice *</span>
                I acknowledge that symptom details are evaluated through hospital-approved rule sets for preliminary queue prioritization only and will be clinically reviewed by qualified medical staff. This system does not diagnose diseases or replace medical care.
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="ghost" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isSubmitting}
                disabled={!selectedDoctorId || doctors.length === 0 || !consentAcknowledged}
                className={detectedEmergency ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
              >
                {detectedEmergency ? 'Review Emergency Notice & Submit' : 'Confirm Booking & Issue Token'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Emergency Confirmation Interceptor Modal */}
      {showEmergencyModal && (
        <Modal
          isOpen={showEmergencyModal}
          onClose={() => setShowEmergencyModal(false)}
          title="Immediate Emergency Care Guidance"
          description="High-priority emergency warning indicators detected."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-100 text-red-950 rounded-xl border border-red-300">
              <div className="flex items-center gap-2 mb-2 font-black text-red-800 text-base">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                CRITICAL WARNING DETECTED
              </div>
              <p className="text-xs text-red-800 leading-relaxed">
                {emergencyMessage ||
                  'Your reported symptoms match emergency warning signs (such as acute chest pain, severe dyspnea, or stroke indicators). Do not delay care by waiting for a standard outpatient slot.'}
              </p>
              <div className="mt-3 p-2.5 bg-white/80 rounded-lg text-xs font-semibold text-red-900 flex items-center justify-between">
                <span>Emergency Services Dispatch</span>
                <span className="text-sm font-extrabold text-red-700 flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5" /> 911 / 112
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              If you still wish to submit this appointment, your case will be flagged with maximum priority for immediate clinical staff review and potential emergency protocol routing.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="ghost" type="button" onClick={() => setShowEmergencyModal(false)}>
                Back to Edit
              </Button>
              <Button
                variant="primary"
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={proceedWithBooking}
              >
                Proceed with Emergency Flag
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
