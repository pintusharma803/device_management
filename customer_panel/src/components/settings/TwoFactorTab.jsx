import React from 'react';
import { Smartphone } from 'lucide-react';

export default function TwoFactorTab({ active, onToggle, loading }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Two-Factor Authentication (2FA)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          6-digit OTP sent to your verified email address on every login
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Email OTP Two-Factor Protection
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              When active, a 6-digit code will be sent each time you sign in.
            </p>
            <span
              className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${active
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
            >
              Status: {active ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${active ? 'translate-x-5' : 'translate-x-0'
              }`}
          />
        </button>
      </div>
    </div>
  );
}
