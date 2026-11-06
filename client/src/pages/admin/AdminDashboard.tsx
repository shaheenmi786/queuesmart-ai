import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/analytics/adminService';
import { queueService } from '../../services/queue/queueService';
import { AdminDashboardMetrics, QueueToken } from '../../types';
import { useSocket } from '../../context/SocketContext';
import { Skeleton } from '../../components/common/Skeleton';
import { Button } from '../../components/common/Button';
import { QueueTable } from '../../components/queue/QueueTable';
import {
  Building2,
  Stethoscope,
  Users,
  Clock,
  Activity,
  Calendar,
  CheckCircle,
  Sliders,
  FileText,
  TrendingUp,
  Cpu,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [activeQueue, setActiveQueue] = useState<QueueToken[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { subscribe } = useSocket();

  const fetchAdminData = async () => {
    try {
      const [dashRes, queueRes, analyticsRes] = await Promise.all([
        adminService.getDashboard(),
        queueService.getQueue(),
        adminService.getAnalytics(),
      ]);
      setMetrics(dashRes.metrics);
      setActiveQueue(queueRes.queue);
      setAnalytics(analyticsRes);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();

    const unsub = subscribe('queue_updated', () => {
      fetchAdminData();
    });

    return () => unsub();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  const m = metrics || {
    registered_patients: 0,
    total_doctors: 0,
    available_doctors: 0,
    active_departments: 0,
    active_appointments: 0,
    patients_waiting: 0,
    completed_consultations: 0,
    average_waiting_time_mins: 0,
    average_service_duration_mins: 0,
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div>
          <span className="text-xs uppercase font-bold text-teal-400 tracking-wider">Hospital Administration Console</span>
          <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">Clinical Operations Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time facility metrics, queue congestion monitoring, and counter capacity management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/counter-allocation">
            <Button variant="secondary" size="sm" leftIcon={<Sliders className="w-4 h-4" />}>
              Counter Allocation
            </Button>
          </Link>
          <Link to="/ai-predictions">
            <Button variant="primary" size="sm" leftIcon={<Cpu className="w-4 h-4" />}>
              AI Engine
            </Button>
          </Link>
        </div>
      </div>

      {/* 8 Primary Real Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Patients Waiting</span>
            <Users className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{m.patients_waiting}</p>
          <span className="text-[11px] text-slate-400">Hospital-wide active</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Available Doctors</span>
            <Stethoscope className="w-5 h-5 text-teal-500" />
          </div>
          <p className="text-2xl font-extrabold text-teal-600">{m.available_doctors} / {m.total_doctors}</p>
          <span className="text-[11px] text-slate-400">Active in consultation</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Visits</span>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{m.active_appointments}</p>
          <span className="text-[11px] text-slate-400">Scheduled bookings</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Visits</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{m.completed_consultations}</p>
          <span className="text-[11px] text-slate-400">Recorded in database</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Departments</span>
            <Building2 className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{m.active_departments}</p>
          <span className="text-[11px] text-slate-400">Configured clinics</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Waiting Time</span>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{m.average_waiting_time_mins}m</p>
          <span className="text-[11px] text-slate-400">Historical average</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Service Time</span>
            <Activity className="w-5 h-5 text-teal-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{m.average_service_duration_mins}m</p>
          <span className="text-[11px] text-slate-400">Per patient consultation</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Registered Patients</span>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{m.registered_patients}</p>
          <span className="text-[11px] text-slate-400">Total accounts</span>
        </div>
      </div>

      {/* Department Workload Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Department Workload Distribution</h3>
              <p className="text-xs text-slate-500">Real consultation records and token counts by clinic department</p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.department_workload || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="total_tokens" name="Total Tokens" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-base font-bold text-slate-900">Administration Links</h3>
          <p className="text-xs text-slate-500 mb-4">Direct shortcuts to manage facility configuration:</p>

          <div className="space-y-2">
            <Link
              to="/admin/departments"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">Manage Departments</span>
              </div>
              <span className="text-xs text-slate-400">→</span>
            </Link>

            <Link
              to="/admin/doctors"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-teal-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-semibold text-slate-800">Doctors & Schedules</span>
              </div>
              <span className="text-xs text-slate-400">→</span>
            </Link>

            <Link
              to="/admin/counter-allocation"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-slate-800">Dynamic Counter Allocation</span>
              </div>
              <span className="text-xs text-slate-400">→</span>
            </Link>

            <Link
              to="/admin/audit-logs"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-amber-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-slate-800">System Audit Trail</span>
              </div>
              <span className="text-xs text-slate-400">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Hospital-Wide Active Queue Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Hospital-Wide Active Queue Monitor
          </h2>
          <span className="text-xs text-slate-400">Synchronized via Socket.IO</span>
        </div>

        {activeQueue.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
            No active queue tokens currently waiting in the hospital.
          </div>
        ) : (
          <QueueTable
            queue={activeQueue}
            onActionComplete={fetchAdminData}
            showDoctorControls={true}
          />
        )}
      </div>
    </div>
  );
};
