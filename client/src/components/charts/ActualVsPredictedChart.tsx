import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface ActualVsPredictedChartProps {
  data: Array<{
    token: string;
    department: string;
    actual: number;
    predicted: number;
  }>;
  title: string;
  metricLabel: string;
}

export const ActualVsPredictedChart: React.FC<ActualVsPredictedChartProps> = ({
  data,
  title,
  metricLabel,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
        No completed consultations recorded in persistent database yet.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <span className="text-[11px] text-slate-500 font-medium">Minutes (min)</span>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="token" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="actual" name={`Actual ${metricLabel}`} fill="#2563EB" radius={[4, 4, 0, 0]} />
            <Bar dataKey="predicted" name={`ML Predicted ${metricLabel}`} fill="#0D9488" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
