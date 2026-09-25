import React from 'react';
import { Cpu, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';

export default function DashboardKpis({ stats, loading }) {
  const total = stats?.totalDevices || 0;
  const online = stats?.onlineDevices || 0;
  const offline = stats?.offlineDevices || 0;
  const maintenance = stats?.maintenanceDevices || 0;

  const kpiList = [
    {
      title: 'Total Devices',
      value: total,
      subtext: 'Hardware units linked',
      icon: Cpu,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
      valueColor: 'text-slate-900 dark:text-white',
      subtextColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      title: 'Offline Devices',
      value: online,
      subtext: `${total > 0 ? Math.round((online / total) * 100) : 100}% of fleet healthy`,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
      subtextColor: 'text-slate-500 dark:text-slate-400',
      hasPulseDot: true,
    },
    {
      title: 'Online devices',
      value: offline,
      subtext: offline > 0 ? 'Requires attention' : 'No connection issues',
      icon: AlertTriangle,
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      valueColor: 'text-rose-600 dark:text-rose-400',
      subtextColor: 'text-slate-500 dark:text-slate-400',
    },
    {
      title: 'Maintenance',
      value: maintenance,
      subtext: 'Firmware & servicing',
      icon: Wrench,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-600 dark:text-amber-400',
      subtextColor: 'text-slate-500 dark:text-slate-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiList.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {item.title}
              </span>
              <div className={`w-8 h-8 rounded-2xl flex items-center justify-center ${item.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className={`text-xl font-extrabold ${item.valueColor}`}>
                {loading ? '...' : item.value}
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-medium mt-1 ${item.subtextColor}`}>
                {item.hasPulseDot && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                )}
                <span>{item.subtext}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

