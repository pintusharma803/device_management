import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ isMobileOpen, setIsMobileOpen, sidebarOpen }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Title generator
  const getPageTitle = () => {
    const p = location.pathname;
    if (p === '/') return { title: 'Customer Home', subtitle: 'Overview & Quick Launch' };
    if (p.startsWith('/dashboard')) return { title: 'Analytics Dashboard', subtitle: 'Live telemetry & device health' };
    if (p.startsWith('/devices')) return { title: 'Device Management', subtitle: 'Hardware registry, serials & unique IDs' };
    if (p.startsWith('/settings')) return { title: 'Account Settings', subtitle: 'Security, 2FA & profile details' };
    return { title: 'Customer Panel', subtitle: 'Workspace' };
  };

  const pageInfo = getPageTitle();

  return (
    <header
      className={`sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-all duration-300 ${
        sidebarOpen ? 'md:ml-64' : 'md:ml-20'
      }`}
    >
      <div className="flex items-center justify-between px-4 md:px-8 py-2">
        {/* Left: Mobile Toggle & Page Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight">
              {pageInfo.title}
            </h2>
          </div>
        </div>

        {/* Right: Notifications & User Dropdown */}
        <div className="flex items-center gap-2 md:gap-1">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900"></span>
            </button>


            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800 dark:text-white">Notifications</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                    2 unread
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                  <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Email Verified</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Your customer account OTP was verified successfully.
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Just now</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Device Telemetry</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          All registered devices connected and healthy.
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">15m ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm overflow-hidden">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {user?.name || 'Customer'}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Verified
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800 py-2 z-50">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  {user?.phone && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{user.phone}</p>
                  )}
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50/60 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                  >
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/devices');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50/60 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                  >
                    <Cpu className="w-4 h-4" />
                    Registered Devices
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 transition text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
