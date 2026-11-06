import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { patientService, PatientDashboardData } from '../../services/patients/patientService';
import { appointmentService } from '../../services/appointments/appointmentService';
import { Appointment, QueueToken } from '../../types';
import { TokenCard } from '../../components/queue/TokenCard';
import { BookingModal } from '../../components/appointments/BookingModal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import {
  CalendarPlus,
  Clock,
  Calendar,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  History,
  XCircle
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { subscribe } = useSocket();

  const [dashboardData, setDashboardData] = useState<PatientDashboardData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchPatientData = async () => {
    try {
      const [profileRes, apptsRes] = await Promise.all([
        patientService.getProfile(),
        patientService.getAppointments(),
      ]);
      setDashboardData(profileRes);
      setAppointments(apptsRes.appointments);
    } catch (err) {
      console.error('Failed to load patient data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();

    // Listen for live socket events (e.g. token called, consultation started, triage priority updated)
    const unsubQueue = subscribe('queue_updated', () => {
      fetchPatientData();
    });

    const unsubTriage = subscribe('triage_updated', () => {
      fetchPatientData();
    });

    return () => {
      unsubQueue();
      unsubTriage();
    };
  }, []);

  const handleCancel = async (appointmentId: number) => {
    if (!window.confirm('Are you sure you want to cancel this appointment and release your queue token?')) {
      return;
    }

    try {
      setCancellingId(appointmentId);
      await appointmentService.cancelAppointment(appointmentId);
      await fetchPatientData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment.');
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  const activeToken = dashboardData?.active_token;
  const upcomingAppointment = dashboardData?.upcoming_appointment;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl p-6 text-white shadow-md">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-blue-200">Patient Workspace</span>
          <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">Welcome, {user?.name}</h1>
          <p className="text-xs text-blue-100 mt-1">
            Track your consultations, live token updates, and AI waiting time forecasts.
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          leftIcon={<CalendarPlus className="w-4 h-4" />}
          onClick={() => setIsBookingOpen(true)}
          className="bg-white text-blue-700 hover:bg-blue-50 shadow-sm self-start sm:self-auto font-semibold"
        >
          Book New Consultation
        </Button>
      </div>

      {/* Main Grid: Active Token & Upcoming Appointment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Queue Token Card */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Active Queue Status
            </h2>
            <span className="text-xs text-slate-400">Auto-synchronized</span>
          </div>

          {activeToken ? (
            <TokenCard
              token={activeToken}
              onCancel={handleCancel}
              isCancelling={cancellingId === activeToken.appointment_id}
            />
          ) : (
            <EmptyState
              icon={Clock}
              title="No Active Queue Token"
              description="You do not currently have a waiting or consulting token in the hospital queue."
              actionLabel="Book an Appointment"
              onAction={() => setIsBookingOpen(true)}
            />
          )}
        </div>

        {/* Upcoming Appointment Info */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            Upcoming Visit
          </h2>

          {upcomingAppointment ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Department</span>
                  <h3 className="text-lg font-bold text-slate-900">{upcomingAppointment.department_name}</h3>
                  <p className="text-xs text-slate-500 font-medium">Dr. {upcomingAppointment.doctor_name}</p>
                </div>
                <Badge status={upcomingAppointment.token_status || 'waiting'} />
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Date</span>
                  <span className="font-semibold text-slate-800">{upcomingAppointment.appointment_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Time Slot</span>
                  <span className="font-semibold text-slate-800">{upcomingAppointment.appointment_time}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Reason</span>
                  <span className="font-medium text-slate-700 truncate block">{upcomingAppointment.reason}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Token Code</span>
                  <span className="font-bold text-blue-600">{upcomingAppointment.token_number || 'Pending'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Priority: <Badge priority={upcomingAppointment.priority} size="sm" />
                </span>
                <button
                  onClick={() => handleCancel(upcomingAppointment.id)}
                  disabled={cancellingId === upcomingAppointment.id}
                  className="text-xs text-red-600 hover:text-red-800 font-medium hover:underline"
                >
                  {cancellingId === upcomingAppointment.id ? 'Cancelling...' : 'Cancel Visit'}
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No Upcoming Appointments"
              description="You have no scheduled clinical visits booked."
              actionLabel="Schedule Appointment"
              onAction={() => setIsBookingOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Appointment History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              Appointment History
            </h2>
            <p className="text-xs text-slate-500">Persistent consultation records from backend database.</p>
          </div>
        </div>

        {appointments.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Past Appointments"
            description="When you complete visits, your historical records and tokens will appear here."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                      {appt.appointment_date} <span className="text-slate-400 font-normal">at {appt.appointment_time}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {appt.department_name} ({appt.department_code})
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-800">
                      Dr. {appt.doctor_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-600 font-mono">
                      {appt.token_number || 'N/A'}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-600">
                      {appt.reason}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        appt.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : appt.status === 'cancelled'
                          ? 'bg-slate-100 text-slate-500 line-through'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {appt.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={() => {
          fetchPatientData();
        }}
      />
    </div>
  );
};
