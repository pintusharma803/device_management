import React from 'react';
import { Cpu, Plus } from 'lucide-react';

export default function DeviceEmptyState({ hasFilters, onAddDevice }) {
  return (
    <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
        <Cpu className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-white">No devices found</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
        {hasFilters
          ? 'No devices match your selected search or filter criteria.'
          : 'You have not added any devices yet.'}
      </p>
      <button
        type="button"
        onClick={onAddDevice}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Add First Device</span>
      </button>
    </div>
  );
}
