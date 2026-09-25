import React from 'react';
import { Cpu, CheckCircle2, Activity, ShieldCheck } from 'lucide-react';

export default function QuickStatsGrid({ stats, loading, twoFactorEnabled }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* Total Hardware */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Hardware
          </span>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {stats?.totalDevices ?? (loading ? '...' : 0)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configured hardware nodes</p>
        </div>
      </div>

      {/* Online Devices */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Online Devices
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats?.onlineDevices ?? (loading ? '...' : 0)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Transmitting telemetry</p>
        </div>
      </div>

      {/* Fleet Health */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Fleet Health
          </span>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats?.uptimePercentage ?? 100}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Overall operational uptime</p>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Account Security
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 text-lg sm:text-xl font-bold">Verified</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {twoFactorEnabled ? '2FA Protection: ON' : 'Email OTP Active'}
          </p>
        </div>
      </div>
    </div>
  );
}
