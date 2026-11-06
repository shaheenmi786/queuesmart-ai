import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { doctorService, DoctorQueueResponse } from '../../services/doctors/doctorService';
import { queueService } from '../../services/queue/queueService';
import { triageService } from '../../services/triage/triageService';
import { QueueTable } from '../../components/queue/QueueTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { Modal } from '../../components/common/Modal';
import { AlertBanner } from '../../components/common/AlertBanner';
import { TriagePendingItem, PriorityLevel } from '../../types';
import {
  Stethoscope,
  Users,
  Clock,
  CheckCircle,
  Play,
  PhoneCall,
  PauseCircle,
  AlertCircle,
  Sparkles,
  MapPin,
  ShieldAlert,
  FileText,
  AlertTriangle,
  Activity,
  Check,
  Edit3
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { subscribe } = useSocket();

  const [queueData, setQueueData] = useState<DoctorQueueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Triage state
  const [pendingTriage, setPendingTriage] = useState<TriagePendingItem[]>([]);
  const [isLoadingTriage, setIsLoadingTriage] = useState(false);
  const [selectedTriageItem, setSelectedTriageItem] = useState<TriagePendingItem | null>(null);

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);

  // Priority edit form state
  const [newPriority, setNewPriority] = useState<PriorityLevel>('urgent');
  const [clinicalReason, setClinicalReason] = useState<string>('');
  const [assessmentNotes, setAssessmentNotes] = useState<string>('');
  const [triageSubmitting, setTriageSubmitting] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [triageSuccess, setTriageSuccess] = useState<string | null>(null);

  const fetchDoctorQueue = async () => {
    try {
      const res = await doctorService.getDoctorQueue();
      setQueueData(res);
    } catch (err) {
      console.error('Failed to load doctor queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingTriage = async () => {
    try {
      setIsLoadingTriage(true);
      const res = await triageService.getPendingTriage();
      setPendingTriage(res.pending_triage || []);
    } catch (err) {
      console.error('Failed to load pending triage:', err);
    } finally {
      setIsLoadingTriage(false);
    }
  };

  useEffect(() => {
    fetchDoctorQueue();
    fetchPendingTriage();

    // Listen for queue updates in real-time
    const unsubQueue = subscribe('queue_updated', () => {
      fetchDoctorQueue();
      fetchPendingTriage();
    });

    // Listen for triage updates in real-time
    const unsubTriage = subscribe('triage_updated', () => {
      fetchDoctorQueue();
      fetchPendingTriage();
    });

    return () => {
      unsubQueue();
      unsubTriage();
    };
  }, []);

  const handleStatusChange = async (newStatus: 'available' | 'paused' | 'offline') => {
    try {
      setIsUpdatingStatus(true);
      await doctorService.updateAvailability({ status: newStatus });
      await fetchDoctorQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to update availability.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Call the next waiting patient immediately
  const handleCallNext = async () => {
    const nextWaiting = queueData?.queue.find((t) => t.status === 'waiting');
    if (!nextWaiting) {
      alert('No waiting patients in queue.');
      return;
    }

    try {
      setActionLoading(true);
      await queueService.callToken(nextWaiting.id);
      await fetchDoctorQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to call patient.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick approve preliminary recommendation
  const handleQuickApprove = async (item: TriagePendingItem) => {
    const targetPriority: PriorityLevel =
      item.preliminary_urgency === 'emergency_warning'
        ? 'emergency'
        : item.preliminary_urgency === 'urgent_review'
        ? 'urgent'
        : 'normal';

    try {
      setTriageSubmitting(true);
      setTriageError(null);
      await triageService.updatePriority(item.id, {
        priority: targetPriority,
        reason: `Approved preliminary triage assessment: ${item.preliminary_urgency.replace('_', ' ').toUpperCase()}`,
        action: 'approved',
      });
      setTriageSuccess(`Case ${item.token_number || item.id} approved with ${targetPriority.toUpperCase()} priority.`);
      await Promise.all([fetchDoctorQueue(), fetchPendingTriage()]);
    } catch (err: any) {
      setTriageError(err.message || 'Failed to approve triage priority.');
    } finally {
      setTriageSubmitting(false);
    }
  };

  // Open modal to modify priority
  const openModifyPriority = (item: TriagePendingItem) => {
    setSelectedTriageItem(item);
    const initialPriority: PriorityLevel =
      item.preliminary_urgency === 'emergency_warning'
        ? 'emergency'
        : item.preliminary_urgency === 'urgent_review'
        ? 'urgent'
        : 'normal';
    setNewPriority(initialPriority);
    setClinicalReason('');
    setAssessmentNotes('');
    setTriageError(null);
    setIsPriorityModalOpen(true);
  };

  // Submit priority modification
  const handleSavePriority = async () => {
    if (!selectedTriageItem) return;
    if (!clinicalReason.trim()) {
      setTriageError('Clinical justification reason is mandatory when reviewing or altering priority.');
      return;
    }

    try {
      setTriageSubmitting(true);
      setTriageError(null);
      await triageService.updatePriority(selectedTriageItem.id, {
        priority: newPriority,
        reason: clinicalReason.trim(),
        action: 'modified',
        assessment_notes: assessmentNotes.trim() || undefined,
      });

      setTriageSuccess(`Case updated: Priority confirmed as ${newPriority.toUpperCase()}.`);
      setIsPriorityModalOpen(false);
      await Promise.all([fetchDoctorQueue(), fetchPendingTriage()]);
    } catch (err: any) {
      setTriageError(err.message || 'Failed to update priority.');
    } finally {
      setTriageSubmitting(false);
    }
  };

  // Open escalation modal
  const openEscalateModal = (item: TriagePendingItem) => {
    setSelectedTriageItem(item);
    setClinicalReason('Immediate emergency clinical escalation triggered by attending clinician.');
    setTriageError(null);
    setIsEscalateModalOpen(true);
  };

  // Submit emergency escalation
  const handleConfirmEscalation = async () => {
    if (!selectedTriageItem) return;

    try {
      setTriageSubmitting(true);
      setTriageError(null);
      await triageService.escalateEmergency(selectedTriageItem.id, {
        reason: clinicalReason.trim() || 'Attending physician emergency escalation.',
      });

      setTriageSuccess(`Case escalated immediately to Emergency Protocol!`);
      setIsEscalateModalOpen(false);
      await Promise.all([fetchDoctorQueue(), fetchPendingTriage()]);
    } catch (err: any) {
      setTriageError(err.message || 'Failed to escalate emergency.');
    } finally {
      setTriageSubmitting(false);
    }
  };

  // Open details modal
  const openDetailModal = (item: TriagePendingItem) => {
    setSelectedTriageItem(item);
    setIsDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  const metrics = queueData?.metrics || {
    patients_waiting: 0,
    currently_consulting: null,
    completed_today: 0,
    average_service_duration_mins: 15.0,
    doctor_status: 'available',
  };

  const currentlyConsulting = metrics.currently_consulting;

  return (
    <div className="space-y-8">
      {/* Notifications / Alerts */}
      {triageSuccess && (
        <AlertBanner
          type="success"
          message={triageSuccess}
          onDismiss={() => setTriageSuccess(null)}
        />
      )}
      {triageError && (
        <AlertBanner
          type="error"
          message={triageError}
          onDismiss={() => setTriageError(null)}
        />
      )}

      {/* Doctor Header & Availability Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-teal-600 tracking-wider">Clinical Console</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {user?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Specialist Consultation Room</span>
            <span>•</span>
            <span className="font-semibold text-slate-700">Counter {user?.doctor_profile?.counter_number || '1'}</span>
            <span>•</span>
            <span className="font-medium text-blue-600">{user?.doctor_profile?.department_name || 'Department'}</span>
          </p>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <span className="text-xs font-semibold text-slate-500 pl-2 pr-1">Status:</span>
          <button
            onClick={() => handleStatusChange('available')}
            disabled={isUpdatingStatus}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              metrics.doctor_status === 'available'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Available
          </button>
          <button
            onClick={() => handleStatusChange('paused')}
            disabled={isUpdatingStatus}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              metrics.doctor_status === 'paused'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            Paused
          </button>
          <button
            onClick={() => handleStatusChange('offline')}
            disabled={isUpdatingStatus}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              metrics.doctor_status === 'offline'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Offline
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Patients Waiting</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{metrics.patients_waiting}</p>
          <span className="text-[11px] text-slate-400">In clinic queue</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Currently Consulting</span>
            <Stethoscope className="w-5 h-5 text-teal-500" />
          </div>
          <p className="text-2xl font-extrabold text-teal-600">
            {currentlyConsulting ? currentlyConsulting.token_number : 'None'}
          </p>
          <span className="text-[11px] text-slate-400">
            {currentlyConsulting ? currentlyConsulting.patient_name : 'Counter idle'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Triage Pending Review</span>
            <Activity className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600">{pendingTriage.length}</p>
          <span className="text-[11px] text-slate-400">Cases requiring sign-off</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Today</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{metrics.completed_today}</p>
          <span className="text-[11px] text-slate-400">Finished consultations</span>
        </div>
      </div>

      {/* Primary Action Banner & Active Consultation Card */}
      {currentlyConsulting ? (
        <div className="bg-gradient-to-r from-blue-50 to-teal-50 border-2 border-blue-400 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase font-extrabold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
              In Active Consultation
            </span>
            <h3 className="text-2xl font-black text-slate-900 pt-1">
              Token {currentlyConsulting.token_number} – {currentlyConsulting.patient_name}
            </h3>
            <p className="text-xs text-slate-600">
              Department: {currentlyConsulting.department_name} • Priority: <Badge priority={currentlyConsulting.priority} size="sm" />
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            isLoading={actionLoading}
            leftIcon={<CheckCircle className="w-5 h-5" />}
            onClick={async () => {
              setActionLoading(true);
              try {
                await queueService.completeConsultation(currentlyConsulting.id);
                await fetchDoctorQueue();
              } finally {
                setActionLoading(false);
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full md:w-auto"
          >
            Complete Consultation
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Ready for Next Consultation</h3>
            <p className="text-xs text-slate-500">
              {metrics.patients_waiting > 0
                ? `${metrics.patients_waiting} patient(s) waiting in queue.`
                : 'No patients currently waiting in this department.'}
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            isLoading={actionLoading}
            disabled={metrics.patients_waiting === 0 || metrics.doctor_status === 'paused'}
            leftIcon={<PhoneCall className="w-4 h-4" />}
            onClick={handleCallNext}
          >
            Call Next Patient
          </Button>
        </div>
      )}

      {/* FEATURE SECTION: Symptom Review & Priority Queue Management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Symptom-Based Smart Triage & Clinical Priority Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review rule-based triage flags and approve or adjust clinical queue tokens with mandatory medical justification.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 self-start sm:self-auto">
            {pendingTriage.length} Case(s) Awaiting Review
          </span>
        </div>

        {isLoadingTriage ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading triage cases...
          </div>
        ) : pendingTriage.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">All Triage Reviews Completed</h4>
            <p className="text-xs text-slate-500 mt-1">
              There are no pending triage assessments awaiting staff approval in your department.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100 font-semibold">
                <tr>
                  <th className="px-6 py-3">Patient / Token</th>
                  <th className="px-6 py-3">Reported Symptoms</th>
                  <th className="px-6 py-3">Preliminary Urgency</th>
                  <th className="px-6 py-3">Clinical Warning Flags</th>
                  <th className="px-6 py-3 text-right">Clinical Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingTriage.map((item) => {
                  const symptoms = item.symptoms;
                  const isEmerg = item.preliminary_urgency === 'emergency_warning';
                  const isUrg = item.preliminary_urgency === 'urgent_review';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isEmerg ? 'bg-red-50/40' : isUrg ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">
                          {item.appointment?.patient_name || symptoms?.patient_name || `Patient #${item.patient_id}`}
                        </div>
                        <div className="text-[11px] font-mono text-blue-600 font-bold mt-0.5">
                          {item.token_number || 'Token Pending'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.appointment?.appointment_time}
                        </div>
                      </td>

                      <td className="px-6 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-800">
                          {symptoms?.main_symptoms || 'General Consultation'}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {symptoms?.symptom_description}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              symptoms?.reported_severity === 'severe'
                                ? 'bg-red-100 text-red-800'
                                : symptoms?.reported_severity === 'moderate'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {symptoms?.reported_severity?.toUpperCase() || 'MODERATE'}
                          </span>
                          {symptoms?.is_worsening && (
                            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              WORSENING
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            Onset: {symptoms?.symptom_duration || 'Recent'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <Badge triageUrgency={item.preliminary_urgency} size="sm" />
                        <div className="text-[10px] text-slate-400 mt-1">
                          Status: <span className="font-medium text-slate-600">{item.review_status.replace('_', ' ')}</span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 max-w-xs">
                        {item.warning_flags && item.warning_flags.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {item.warning_flags.slice(0, 2).map((flag, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium truncate"
                              >
                                {flag}
                              </span>
                            ))}
                            {item.warning_flags.length > 2 && (
                              <span className="text-[10px] text-slate-400">
                                +{item.warning_flags.length - 2} more warning(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No acute warning signs</span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Approve */}
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={triageSubmitting}
                            onClick={() => handleQuickApprove(item)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1"
                            title="Approve preliminary urgency recommendation"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>

                          {/* Modify Priority */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openModifyPriority(item)}
                            className="text-xs px-2.5 py-1 text-slate-700 border-slate-300 hover:bg-slate-100"
                            title="Adjust priority tier with clinical reason"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" /> Adjust
                          </Button>

                          {/* Escalate Emergency */}
                          <button
                            type="button"
                            onClick={() => openEscalateModal(item)}
                            className="p-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                            title="Escalate directly to Emergency Department"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>

                          {/* View Full Symptoms */}
                          <button
                            type="button"
                            onClick={() => openDetailModal(item)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                            title="View complete clinical symptom profile"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Queue Management Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            Active Clinic Queue
          </h2>
          <span className="text-xs text-slate-400">Real-time bi-directional synchronization</span>
        </div>

        {queueData?.queue.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Queue is Empty"
            description="There are currently no waiting, calling, or consulting patients assigned to your department."
          />
        ) : (
          <QueueTable
            queue={queueData?.queue || []}
            onActionComplete={fetchDoctorQueue}
            showDoctorControls={true}
          />
        )}
      </div>

      {/* MODAL 1: Modify Priority with Mandatory Reason */}
      {isPriorityModalOpen && selectedTriageItem && (
        <Modal
          isOpen={isPriorityModalOpen}
          onClose={() => setIsPriorityModalOpen(false)}
          title="Adjust Triage Priority Tier"
          description={`Set final approved clinical priority for ${
            selectedTriageItem.appointment?.patient_name || 'Patient'
          } (Token: ${selectedTriageItem.token_number || 'Pending'})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {triageError && <AlertBanner type="error" message={triageError} />}

            {/* Target Priority Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Target Priority Level *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setNewPriority('normal')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    newPriority === 'normal'
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-sm">Normal Priority</span>
                  <span className="text-[10px] text-slate-500">Standard Queue Order (N-prefix)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewPriority('urgent')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    newPriority === 'urgent'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-sm">Urgent Review</span>
                  <span className="text-[10px] text-slate-500">Expedited Priority (U-prefix)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewPriority('emergency')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    newPriority === 'emergency'
                      ? 'border-red-500 bg-red-50 text-red-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-sm">Emergency Warning</span>
                  <span className="text-[10px] text-slate-500">Immediate Escalation (EMG-prefix)</span>
                </button>
              </div>
            </div>

            {/* Mandatory Reason */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[11px]">
                Mandatory Clinical Justification Reason *
              </label>
              <textarea
                rows={3}
                value={clinicalReason}
                onChange={(e) => setClinicalReason(e.target.value)}
                placeholder="Enter mandatory clinical reason for approving or altering this priority tier (e.g. 'Patient presents with severe acute peritoneal pain and peritoneal rebound on physical check...')"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Required by hospital clinical governance audit requirements. Recorded permanently in audit logs.
              </span>
            </div>

            {/* Assessment Notes */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[11px]">
                Internal Assessment Notes (Optional)
              </label>
              <input
                type="text"
                value={assessmentNotes}
                onChange={(e) => setAssessmentNotes(e.target.value)}
                placeholder="Optional notes for attending triage nurse or clinic staff..."
                className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="ghost" type="button" onClick={() => setIsPriorityModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                isLoading={triageSubmitting}
                onClick={handleSavePriority}
              >
                Save & Update Queue Priority
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Full Symptom Details */}
      {isDetailModalOpen && selectedTriageItem && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="Complete Clinical Symptom Record"
          description={`Patient: ${selectedTriageItem.appointment?.patient_name || 'Patient'} • Token: ${
            selectedTriageItem.token_number || 'Pending'
          }`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block font-medium">Main Symptoms</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedTriageItem.symptoms?.main_symptoms || 'General Consultation'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Reported Severity</span>
                <span className="font-bold text-slate-900 capitalize">
                  {selectedTriageItem.symptoms?.reported_severity || 'Moderate'}{' '}
                  {selectedTriageItem.symptoms?.is_worsening && '(Worsening)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Onset Duration</span>
                <span className="font-semibold text-slate-800">
                  {selectedTriageItem.symptoms?.symptom_duration || 'Not specified'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Preliminary Triage Category</span>
                <Badge triageUrgency={selectedTriageItem.preliminary_urgency} size="sm" />
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-1">Detailed Description</span>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap">
                {selectedTriageItem.symptoms?.symptom_description || 'No description provided.'}
              </div>
            </div>

            {selectedTriageItem.symptoms?.existing_conditions && (
              <div>
                <span className="font-bold text-slate-700 block mb-1">Existing Conditions</span>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-800">
                  {selectedTriageItem.symptoms.existing_conditions}
                </div>
              </div>
            )}

            {selectedTriageItem.symptoms?.additional_notes && (
              <div>
                <span className="font-bold text-slate-700 block mb-1">Patient Notes</span>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-800">
                  {selectedTriageItem.symptoms.additional_notes}
                </div>
              </div>
            )}

            <div>
              <span className="font-bold text-slate-700 block mb-1">Automated Clinical Rule Summary</span>
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-950">
                {selectedTriageItem.clinical_summary || 'Rule evaluation executed successfully.'}
              </div>
            </div>

            <div className="p-2.5 bg-slate-100 rounded-lg text-[11px] text-slate-500 italic">
              Preliminary assessment engine does not prescribe treatments or replace qualified medical diagnosis. Final priority decisions must be confirmed by attending hospital staff.
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="ghost" type="button" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Emergency Escalation Confirmation */}
      {isEscalateModalOpen && selectedTriageItem && (
        <Modal
          isOpen={isEscalateModalOpen}
          onClose={() => setIsEscalateModalOpen(false)}
          title="Escalate to Emergency Protocol"
          description="Direct immediate emergency routing."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-red-100 border border-red-300 rounded-xl text-red-950">
              <div className="flex items-center gap-2 font-bold text-red-800 text-sm mb-1">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Emergency Department Escalation
              </div>
              <p className="text-red-900 leading-relaxed text-xs">
                You are about to transfer token{' '}
                <span className="font-bold">{selectedTriageItem.token_number || selectedTriageItem.id}</span> to the
                Hospital Emergency Workflow. Token will be updated to EMG-priority sequence and an emergency alert will be dispatched to staff.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[11px]">
                Clinical Reason for Escalation *
              </label>
              <textarea
                rows={2}
                value={clinicalReason}
                onChange={(e) => setClinicalReason(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="ghost" type="button" onClick={() => setIsEscalateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                isLoading={triageSubmitting}
                onClick={handleConfirmEscalation}
              >
                Confirm Immediate Escalation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
