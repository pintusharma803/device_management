import React from 'react';
import { Lock, AlertCircle } from 'lucide-react';

export default function SecurityTab({
  passData,
  onChange,
  onSubmit,
  loading,
  error,
}) {
  return (
    <div className="max-w-md space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Change Account Password
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Ensure your account uses a secure password with at least 6 characters
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Current Password <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            value={passData.currentPassword}
            onChange={(e) => onChange('currentPassword', e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            New Password <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            value={passData.newPassword}
            onChange={(e) => onChange('newPassword', e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Confirm New Password <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            value={passData.confirmPassword}
            onChange={(e) => onChange('confirmPassword', e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? 'Updating...' : 'Update Password'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
