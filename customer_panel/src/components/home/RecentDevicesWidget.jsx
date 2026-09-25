import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export default function RecentDevicesWidget({ devices }) {
  const navigate = useNavigate();

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Online':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
      case 'Maintenance':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
      default:
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Recent Devices
          </h3>
          <button
            onClick={() => navigate('/devices')}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition cursor-pointer"
          >
            View all
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Hardware recently provisioned
        </p>

        <div className="mt-4 space-y-3">
          {!devices || devices.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
              No devices registered yet. Click "Add New Device" above.
            </div>
          ) : (
            devices.map((d) => (
              <div
                key={d.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {d.device_name}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate">
                    SN: {d.serial_number}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusBadgeClass(
                    d.status
                  )}`}
                >
                  {d.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate('/devices')}
          className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <span>Manage Device Registry</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
