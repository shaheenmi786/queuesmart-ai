import React, { useState } from 'react';
import { QueueToken } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { queueService } from '../../services/queue/queueService';
import { PhoneCall, Play, CheckCircle, UserX, Clock, MapPin, Sparkles } from 'lucide-react';

interface QueueTableProps {
  queue: QueueToken[];
  onActionComplete: () => void;
  showDoctorControls?: boolean;
}

export const QueueTable: React.FC<QueueTableProps> = ({
  queue,
  onActionComplete,
  showDoctorControls = true,
}) => {
  const [loadingTokenId, setLoadingTokenId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAction = async (action: 'call' | 'start' | 'complete' | 'absent', tokenId: number) => {
    try {
      setLoadingTokenId(tokenId);
      setErrorMsg(null);

      if (action === 'call') {
        await queueService.callToken(tokenId);
      } else if (action === 'start') {
        await queueService.startConsultation(tokenId);
      } else if (action === 'complete') {
        await queueService.completeConsultation(tokenId);
      } else if (action === 'absent') {
        await queueService.markAbsent(tokenId);
      }

      onActionComplete();
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed on server.');
    } finally {
      setLoadingTokenId(null);
    }
  };

  return (
    <div className="space-y-3">
      {errorMsg && (
        <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
          {errorMsg}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Token #</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">AI Est. Wait</th>
              <th className="px-4 py-3">Room / Counter</th>
              {showDoctorControls && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {queue.map((token) => (
              <tr
                key={token.id}
                className={`hover:bg-slate-50 transition-colors ${
                  token.status === 'calling'
                    ? 'bg-purple-50/60 font-semibold'
                    : token.status === 'consulting'
                    ? 'bg-blue-50/50'
                    : ''
                }`}
              >
                {/* Token */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="font-extrabold text-slate-900 text-base">{token.token_number}</div>
                  <span className="text-[10px] text-slate-400">Pos: #{token.queue_position}</span>
                </td>

                {/* Patient */}
                <td className="px-4 py-3.5">
                  <div className="font-medium text-slate-800">{token.patient_name}</div>
                  {token.patient_phone && (
                    <span className="text-[11px] text-slate-400">{token.patient_phone}</span>
                  )}
                </td>

                {/* Department */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="font-medium text-slate-700">{token.department_name}</span>
                  <span className="text-[10px] text-slate-400 block">{token.department_code}</span>
                </td>

                {/* Priority */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <Badge priority={token.priority} size="sm" />
                </td>

                {/* Status */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <Badge status={token.status} size="sm" />
                </td>

                {/* AI Est Wait */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1 font-semibold text-teal-700">
                    <Sparkles className="w-3 h-3 text-teal-500" />
                    <span>{token.ml_predicted_wait_minutes ? `~${Math.round(token.ml_predicted_wait_minutes)}m` : '10m'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">ML Calibrated</span>
                </td>

                {/* Room / Counter */}
                <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{token.counter_number || 'Counter 1'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 pl-4">{token.room_number || 'Room 1'}</span>
                </td>

                {/* Doctor actions */}
                {showDoctorControls && (
                  <td className="px-4 py-3.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {token.status === 'waiting' && (
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={loadingTokenId === token.id}
                          leftIcon={<PhoneCall className="w-3.5 h-3.5" />}
                          onClick={() => handleAction('call', token.id)}
                        >
                          Call
                        </Button>
                      )}

                      {token.status === 'calling' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={loadingTokenId === token.id}
                          leftIcon={<Play className="w-3.5 h-3.5" />}
                          onClick={() => handleAction('start', token.id)}
                        >
                          Start Consult
                        </Button>
                      )}

                      {token.status === 'consulting' && (
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={loadingTokenId === token.id}
                          leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                          onClick={() => handleAction('complete', token.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Complete
                        </Button>
                      )}

                      {(token.status === 'waiting' || token.status === 'calling') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={loadingTokenId === token.id}
                          onClick={() => handleAction('absent', token.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Mark absent"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
