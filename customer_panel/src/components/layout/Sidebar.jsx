import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Cpu,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({
  isOpen,
  setIsOpen,
  isMobileOpen,
  setIsMobileOpen,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Devices', path: '/devices', icon: Cpu },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 select-none border-r border-slate-200 dark:border-slate-800 transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Piezo Pulse
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {/* <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> */}
                Customer Panel
              </div>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hidden md:flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                      }`}
                  />
                  {isOpen && <span className="leading-snug">{item.name}</span>}
                  {/* Floating tooltip for collapsed desktop mode */}
                  {!isOpen && (
                    <div className="hidden group-hover:block absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-md shadow-xl whitespace-nowrap z-50 pointer-events-none border border-slate-700">
                      <p className="font-semibold">{item.name}</p>
                    </div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
        <div
          className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'
            } p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/30 text-xs flex-shrink-0 overflow-hidden">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : user?.name ? (
                user.name.charAt(0).toUpperCase()
              ) : (
                'C'
              )}
            </div>
            {isOpen && (
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user?.name || 'Customer'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || 'user@panel.io'}
                </p>
              </div>
            )}
          </div>

          {isOpen && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'
          }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
