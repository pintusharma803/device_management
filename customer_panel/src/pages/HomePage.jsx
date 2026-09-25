import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Modular Home Components
import QuickStatsGrid from '../components/home/QuickStatsGrid';
import QuickStartGuide from '../components/home/QuickStartGuide';
import RecentDevicesWidget from '../components/home/RecentDevicesWidget';

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, devRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/devices'),
        ]);
        if (statsRes.data.success) setStats(statsRes.data.data);
        if (devRes.data.success) setDevices(devRes.data.data.slice(0, 4));
      } catch (err) {
        console.error('Failed to fetch home summary:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Quick Stat Highlights */}
      <QuickStatsGrid
        stats={stats}
        loading={loading}
        twoFactorEnabled={user?.two_factor_enabled}
      />

      {/* Quick Launch & Getting Started Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickStartGuide />
        <RecentDevicesWidget devices={devices} />
      </div>
    </div>
  );
}
