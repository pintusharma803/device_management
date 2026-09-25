import React from 'react';
import { CheckCircle2, Save } from 'lucide-react';

export default function ProfileTab({
  profileData,
  onChange,
  onSubmit,
  loading,
  userEmail,
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Customer Profile Information
        </h3>
        {/* <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Update your contact details and visible display settings
        </p> */}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Customer Avatar
          </label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
              {profileData.avatarUrl ? (
                <img
                  src={profileData.avatarUrl}
                  alt="Avatar Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
            </div>
            <div className="flex-1">
              <input
                type="url"
                value={profileData.avatarUrl}
                onChange={(e) => onChange('avatarUrl', e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Optional image URL for your user avatar
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => onChange('name', e.target.value)}
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Account Email Address
          </label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={userEmail || ''}
              disabled
              className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400 font-mono cursor-not-allowed"
            />
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex-shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            Verified with 6-digit OTP during registration
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
