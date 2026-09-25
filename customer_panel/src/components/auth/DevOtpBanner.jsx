import React from 'react';
import { Sparkles } from 'lucide-react';

export default function DevOtpBanner({ devOtpCode, onAutoFill }) {
  if (!devOtpCode) return null;

  return (
    <div className="mb-5 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/40 text-indigo-800 dark:text-indigo-200 text-xs flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span>
          Dev Code: <strong className="font-mono tracking-wider font-bold">{devOtpCode}</strong>
        </span>
      </div>
      <button
        type="button"
        onClick={onAutoFill}
        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition shadow cursor-pointer"
      >
        Auto-fill Code
      </button>
    </div>
  );
}
