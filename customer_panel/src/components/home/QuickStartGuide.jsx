import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function QuickStartGuide() {
  const navigate = useNavigate();

  const steps = [
    {
      num: 1,
      title: 'Register Hardware Device',
      desc: (
        <>
          Input the device name, physical <strong>Serial Number</strong> (e.g. SN-2026-X), and its{' '}
          <strong>Device Unique ID</strong>.
        </>
      ),
      route: '/devices?action=new',
      badgeColor: 'bg-indigo-600',
      hoverColor: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
      hoverBorder: 'hover:border-indigo-200 dark:hover:border-indigo-700',
    },
    {
      num: 2,
      title: 'View Fleet Telemetry on Dashboard',
      desc: 'Inspect online/offline status, type distributions, and operational activity logs.',
      route: '/dashboard',
      badgeColor: 'bg-purple-600',
      hoverColor: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
      hoverBorder: 'hover:border-purple-200 dark:hover:border-purple-700',
    },
    {
      num: 3,
      title: 'Enable Two-Factor (2FA) Security',
      desc: 'Protect account access with 6-digit OTP verification challenges on each login.',
      route: '/settings',
      badgeColor: 'bg-emerald-600',
      hoverColor: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
      hoverBorder: 'hover:border-emerald-200 dark:hover:border-emerald-700',
    },
  ];

  return (
    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
        <span>Quick Start Steps</span>
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Follow these simple steps to start tracking your IoT devices and telemetry
      </p>

      <div className="mt-6 space-y-4">
        {steps.map((step) => (
          <div
            key={step.num}
            onClick={() => navigate(step.route)}
            className={`flex items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 ${step.hoverBorder} transition group cursor-pointer`}
          >
            <div
              className={`w-8 h-8 rounded-xl ${step.badgeColor} text-white font-bold flex items-center justify-center text-sm flex-shrink-0`}
            >
              {step.num}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4
                  className={`text-sm font-bold text-slate-800 dark:text-slate-200 ${step.hoverColor} transition`}
                >
                  {step.title}
                </h4>
                <ArrowRight
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 ${step.hoverColor} group-hover:translate-x-1 transition`}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
