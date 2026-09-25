import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Activity, ArrowUpRight } from 'lucide-react';

export default function ActivityTimeline({ activities }) {
  const navigate = useNavigate();
  const hasActivities = activities && activities.length > 0;

  return (
    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Operational Activity Log</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audit trail for device events, OTP validations, and security logins
          </p>
        </div>
        <button
          onClick={() => navigate('/devices')}
          className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition cursor-pointer"
        >
          <span>View Devices</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
        {hasActivities ? (
          activities.map((act) => (
            <div key={act.id} className="py-3.5 flex items-start gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {act.action}
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex-shrink-0">
                    {act.created_at
                      ? new Date(act.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Just now'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                  {act.details}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
            No recent activity recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
