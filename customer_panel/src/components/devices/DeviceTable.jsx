import React from 'react';
import { Check, Copy } from 'lucide-react';

export default function DeviceTable({ devices, onCopy, copiedKey }) {
  const getStatusBadge = (state) => {
    const s = (state || '').toLowerCase();
    if (s === 'online') {
      return {
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
        dotClass: 'bg-emerald-500 animate-pulse',
      };
    }
    if (s === 'maintenance') {
      return {
        badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
        dotClass: 'bg-amber-500',
      };
    }
    return {
      badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
      dotClass: 'bg-rose-500',
    };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 uppercase tracking-wider font-bold">
            <tr>
              <th className="px-5 py-3.5">Device Name</th>
              <th className="px-5 py-3.5">Serial Number</th>
              <th className="px-5 py-3.5">Device Unique ID</th>
              <th className="px-5 py-3.5">Type</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {devices.map((device) => {
              const statusInfo = getStatusBadge(device.status || device.state);
              return (
                <tr
                  key={device.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                >
                  <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {device.device_name || device.deviceName || 'Unnamed Device'}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                        {device.serial_number || device.serialNumber}
                      </span>
                      <button
                        onClick={() =>
                          onCopy(device.serial_number || device.serialNumber, `sn-tbl-${device.id}`)
                        }
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                        title="Copy Serial Number"
                      >
                        {copiedKey === `sn-tbl-${device.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                        {device.device_unique_id || device.unique_id || device.deviceUniqueId}
                      </span>
                      <button
                        onClick={() =>
                          onCopy(
                            device.device_unique_id || device.unique_id || device.deviceUniqueId,
                            `uid-tbl-${device.id}`
                          )
                        }
                        className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                        title="Copy Unique ID"
                      >
                        {copiedKey === `uid-tbl-${device.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                    {device.device_type || device.deviceType || 'IoT Sensor'}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                      {device.status || device.state || 'Offline'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {device.location || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

