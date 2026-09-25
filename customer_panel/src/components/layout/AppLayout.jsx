import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* Sidebar Component */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          sidebarOpen={sidebarOpen}
        />

        {/* Content Area */}
        <main
          className={`flex-1 transition-all duration-300 p-2 sm:p-3 lg:p-4 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'
            }`}
        >
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
