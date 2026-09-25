import React from 'react';

export default function AuthHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="text-center mb-6">
      {Icon && (
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 mb-3 text-white">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}

