import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle color theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform duration-200" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600 hover:-rotate-12 transition-transform duration-200" />
      )}
    </button>
  );
}
