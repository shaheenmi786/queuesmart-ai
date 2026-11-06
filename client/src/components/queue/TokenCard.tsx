import React from 'react';
import { QueueToken } from '../../types';
import { Badge } from '../common/Badge';
import { Clock, Users, MapPin, Stethoscope, Sparkles, ShieldAlert, AlertTriangle } from 'lucide-react';

interface TokenCardProps {
  token: QueueToken;
  onCancel?: (appointmentId: number) => void;
  isCancelling?: boolean;
}

export const TokenCard: React.FC<TokenCardProps> = ({ token, onCancel, isCancelling }) => {
  const isEmergency = token.priority === 'emergency' || token.token_number?.includes('-EMG');
  const isUrgent = token.priority === 'urgent' || token.token_number?.includes('-U');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-6 relative overflow-hidden transition-all hover:shadow-lg">
      {/* Top Banner Accent */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          isEmergency
            ? 'bg-red-600 animate-pulse'
            : token.status === 'calling'
            ? 'bg-purple-600 animate-pulse'
            : isUrgent
            ? 'bg-amber-500'
            : token.status === 'consulting'
            ? 'bg-blue-600'
            : 'bg-emerald-500'
        }`}
      />

      {/* Emergency Guidance Banner */}
      {isEmergency && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 animate-pulse" />
          <div className="text-xs">
            <span className="font-bold block">EMERGENCY PROTOCOL ESCALATED</span>
            Your case is flagged for high-priority clinical triage. Attending hospital staff have been alerted.
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Queue Token</span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{token.token_number}</h2>
            <Badge status={token.status} />
            <Badge priority={token.priority} size="sm" />
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 font-medium block">Department</span>
          <span className="text-sm font-semibold text-slate-800">
            {token.department_name} ({token.department_code})
          </span>
        </div>
      </div>

      {/* Primary Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 py-4 border-y border-slate-100 bg-slate-50/60 rounded-xl px-4">
        <div>
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            Queue Position
          </span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">#{token.queue_position || 1}</p>
          <span className="text-[10px] text-slate-400">
            {token.position_ahead ?? token.patients_ahead ?? 0} patient(s) ahead
          </span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-teal-500" />
            Est. Wait Time
          </span>
          <p className="text-xl font-bold text-teal-700 mt-0.5">
            {token.ml_predicted_wait_minutes
              ? `~${Math.round(token.ml_predicted_wait_minutes)}m`
              : 'Calculating...'}
          </p>
          <span className="text-[10px] text-teal-600 flex items-center gap-0.5">
            <Sparkles className="w-3 h-3" /> AI Predicted
          </span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-purple-500" />
            Assigned Counter
          </span>
          <p className="text-base font-bold text-slate-800 mt-0.5">{token.counter_number || 'Counter 1'}</p>
          <span className="text-[10px] text-slate-400">{token.room_number || 'Room 101'}</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
            Now Serving
          </span>
          <p className="text-base font-bold text-blue-600 mt-0.5">{token.now_serving || 'None'}</p>
          <span className="text-[10px] text-slate-400">Doctor: {token.doctor_status || 'available'}</span>
        </div>
      </div>

      {/* Attending Physician & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            MD
          </div>
          <div>
            <p className="font-semibold text-slate-900">{token.doctor_name}</p>
            <p className="text-slate-400 text-[11px]">
              Triage Status: <span className="font-medium text-slate-700 capitalize">{token.priority} Priority</span>
            </p>
          </div>
        </div>

        {token.appointment_id && onCancel && token.status === 'waiting' && (
          <button
            onClick={() => onCancel(token.appointment_id!)}
            disabled={isCancelling}
            className="text-xs text-red-600 hover:text-red-800 font-medium px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors self-start sm:self-auto"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
          </button>
        )}
      </div>

      {/* Safety Disclaimer Footer */}
      <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Preliminary triage priority is subject to clinical review by medical staff.</span>
        <span className="text-blue-600 font-medium">Live Queue Sync Active</span>
      </div>
    </div>
  );
};
