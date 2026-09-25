import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Modular Dashboard Components
import DashboardKpis from '../components/dashboard/DashboardKpis';
import CategoryDistribution from '../components/dashboard/CategoryDistribution';
import ActivityTimeline from '../components/dashboard/ActivityTimeline';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadStats() {
      try {
        const res = await api.get('/dashboard/summary');
        if (!ignore && res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadStats();
    return () => {
      ignore = true;
    };
  }, []);

  const total = stats?.totalDevices || 0;
  const uptime = stats?.uptimePercentage ?? 100;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Key Performance Indicators */}
      <DashboardKpis stats={stats} loading={loading} />

      {/* Distribution & Live Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CategoryDistribution
          distribution={stats?.typeDistribution}
          total={total}
          uptime={uptime}
        />
        <ActivityTimeline activities={stats?.recentActivities} />
      </div>
    </div>
  );
}
