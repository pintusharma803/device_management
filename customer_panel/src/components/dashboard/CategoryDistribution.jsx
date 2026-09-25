import React from 'react';
import { Layers, Activity } from 'lucide-react';

export default function CategoryDistribution({ distribution, total, uptime = 100 }) {
  const hasData = distribution && Object.keys(distribution).length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
        <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <span>Hardware Categories</span>
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Distribution by device classification
      </p>

      <div className="mt-6 space-y-4">
        {hasData ? (
          Object.entries(distribution).map(([type, count]) => {
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={type} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>{type}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {count} ({percent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
            No device category metrics recorded yet.
          </div>
        )}
      </div>

      <div className="mt-8 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-indigo-950 dark:text-indigo-200 text-xs">
        <p className="font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-300">
          <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Operational Uptime: {uptime}%</span>
        </p>
        <p className="text-indigo-700/80 dark:text-indigo-300/70 mt-1">
          Based on telemetry heartbeats and active gateway health.
        </p>
      </div>
    </div>
  );
}
