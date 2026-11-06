import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/analytics/adminService';
import { AuditLogItem } from '../../types';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { FileText, ShieldCheck, Clock, User } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminService.getAuditLogs()
      .then((res) => setLogs(res.audit_logs))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-amber-600" />
          Administrative Audit Trail
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Immutable logging of authorized events, queue modifications, doctor status changes, and patient bookings.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Audit Logs Recorded"
          description="Administrative and queue events will be securely recorded here as system activities occur."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Operator / User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                    {log.user_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono text-[11px] font-semibold">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono">
                    {log.resource_type}:{log.resource_id}
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-sm">
                    {log.details || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
