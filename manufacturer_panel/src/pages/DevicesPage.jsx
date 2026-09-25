import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Cpu,
  Trash2,
  Activity,
  UserCheck,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Layers,
  RefreshCw,
  AlertCircle,
  LayoutGrid,
  List,
  X
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AddDeviceModal from '../components/devices/AddDeviceModal';
import AssignCustomerModal from '../components/devices/AssignCustomerModal';
import DeviceTelemetryDrawer from '../components/devices/DeviceTelemetryDrawer';
import Pagination from '../components/common/Pagination';

export default function DevicesPage({ isAddModalOpen, setIsAddModalOpen, onDataChanged }) {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [devices, setDevices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modelFilter, setModelFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(initialPage > 0 ? initialPage : 1);
  const [pageSize, setPageSize] = useState(8);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 1
  });

  // Modals state
  const [assigningDevice, setAssigningDevice] = useState(null);
  const [telemetryDevice, setTelemetryDevice] = useState(null);
  const [deleteConfirmDevice, setDeleteConfirmDevice] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Debounce search input to prevent race conditions and excessive requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchDevices = async (
    targetPage = currentPage,
    targetLimit = pageSize,
    searchVal = debouncedSearch,
    statusVal = statusFilter,
    modelVal = modelFilter
  ) => {
    setIsLoading(true);
    try {
      const res = await api.getDevices({
        search: (searchVal || '').trim(),
        status: statusVal,
        model: modelVal,
        page: targetPage,
        limit: targetLimit
      });
      setDevices(res.devices || []);
      if (res.models && res.models.length > 0) {
        setAvailableModels(res.models);
      }
      if (res.pagination) {
        setPagination(res.pagination);
        if (targetPage > res.pagination.totalPages && res.pagination.totalPages > 0) {
          setCurrentPage(res.pagination.totalPages);
        }
      } else {
        setPagination({
          total: res.devices?.length || 0,
          page: 1,
          limit: targetLimit,
          totalPages: 1
        });
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('page');
      return next;
    });
    fetchDevices(1, pageSize, debouncedSearch, statusFilter, modelFilter);
    if (isAdmin) {
      fetchCustomers();
    }
  }, [debouncedSearch, statusFilter, modelFilter]);

  useEffect(() => {
    if ((isAddModalOpen || assigningDevice) && isAdmin) {
      fetchCustomers();
    }
  }, [isAddModalOpen, assigningDevice, isAdmin]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newPage === 1) {
        next.delete('page');
      } else {
        next.set('page', String(newPage));
      }
      return next;
    });
    fetchDevices(newPage, pageSize, debouncedSearch, statusFilter, modelFilter);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('page');
      return next;
    });
    fetchDevices(1, newSize, debouncedSearch, statusFilter, modelFilter);
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.getCustomers();
      setCustomers(res.customers || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const handleDeleteDevice = async (id) => {
    try {
      await api.deleteDevice(id);
      setDeleteConfirmDevice(null);
      fetchDevices(currentPage, pageSize, debouncedSearch, statusFilter, modelFilter);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert(err.message || 'Failed to delete device.');
    }
  };

  const copyUniqueId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const uniqueModels = availableModels.length > 0
    ? availableModels
    : Array.from(new Set(devices.map(d => d.model).filter(Boolean)));


  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-subtle">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by serial no, unique ID, model, customer..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {['ALL', 'AVAILABLE', 'ASSIGNED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${statusFilter === st
                  ? 'bg-blue-600 text-white shadow-glow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                {st.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Model Selector */}
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="ALL">All Models</option>
            {uniqueModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* View toggle */}
          {/* <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div> */}

          {/* Add Device Button */}
          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-xs font-semibold shadow-glow transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Device</span>
            </button>
          )}
        </div>
      </div>

      {/* Devices Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-500" />
          <p className="text-xs">Loading device fleet...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <Cpu className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No devices found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL' || modelFilter !== 'ALL'
              ? 'Try adjusting your search criteria or filter options.'
              : 'Start by adding your first IoT piezo sensor device.'}
          </p>
          {(search || statusFilter !== 'ALL' || modelFilter !== 'ALL') ? (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setModelFilter('ALL');
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition"
            >
              <span>Reset Filters</span>
            </button>
          ) : (
            isAdmin && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-glow"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Device</span>
              </button>
            )
          )}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Unique ID</th>
                  <th className="py-3.5 px-4">Model & Firmware</th>
                  <th className="py-3.5 px-4">Serial Number</th>
                  <th className="py-3.5 px-4">Mfg Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned Customer</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {devices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition group">
                    {/* Unique ID */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-800 dark:text-cyan-300 font-semibold  px-2 py-1 rounded-lg  text-[11px]">
                          {dev.unique_id}
                        </span>
                        <button
                          onClick={() => copyUniqueId(dev.unique_id)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                          title="Copy Unique ID"
                        >
                          {copiedId === dev.unique_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Model */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{dev.model}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">FW: {dev.firmware_version}</div>
                    </td>

                    {/* Serial Number */}
                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-200">
                      {dev.serial_number}
                    </td>

                    {/* Mfg Date */}
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {dev.mfg_date}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${(dev.status === 'ASSIGNED' || dev.customer_id)
                        ? ' text-blue-600 dark:text-blue-400 '
                        : ' text-emerald-600 dark:text-emerald-400 '
                        }`}>
                        {/* <span className={`w-1.5 h-1.5 rounded-full ${(dev.status === 'ASSIGNED' || dev.customer_id) ? 'bg-blue-500' : 'bg-emerald-500'}`}></span> */}
                        <span>{(dev.status === 'ASSIGNED' || dev.customer_id) ? 'ASSIGNED' : dev.status}</span>
                      </span>
                    </td>

                    {/* Assigned Customer */}
                    <td className="py-3.5 px-4">
                      {(dev.status === 'ASSIGNED' || dev.customer_id) && dev.customer_name ? (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800 dark:text-blue-300 truncate max-w-[180px]">{dev.customer_name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{dev.customer_email}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Telemetry */}
                        <button
                          onClick={() => setTelemetryDevice(dev)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="View Live Telemetry"
                        >
                          <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </button>

                        {/* Assign / Unassign (Admin only) */}
                        {isAdmin && (
                          <button
                            onClick={() => setAssigningDevice(dev)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 transition"
                            title={dev.status === 'ASSIGNED' ? 'Change Assignment / Unassign' : 'Assign to Customer'}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Device (Admin only) */}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteConfirmDevice(dev)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition"
                            title="Delete Device"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination for Table View */}
          <div className="px-4 sm:px-6 pb-2">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[4, 8, 12, 24]}
              itemName="devices"
            />
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceCreated={() => {
          fetchDevices(1, pageSize, debouncedSearch, statusFilter, modelFilter);
          if (onDataChanged) onDataChanged();
        }}
        customers={customers}
      />

      {/* Assign Customer Modal */}
      <AssignCustomerModal
        isOpen={!!assigningDevice}
        onClose={() => setAssigningDevice(null)}
        device={assigningDevice}
        customers={customers}
        onAssigned={() => {
          fetchDevices(currentPage, pageSize, debouncedSearch, statusFilter, modelFilter);
          if (onDataChanged) onDataChanged();
        }}
      />

      {/* Telemetry Drawer */}
      <DeviceTelemetryDrawer
        isOpen={!!telemetryDevice}
        onClose={() => setTelemetryDevice(null)}
        device={telemetryDevice}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 w-fit">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Device?</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Are you sure you want to permanently delete <strong>{deleteConfirmDevice.model}</strong> ({deleteConfirmDevice.unique_id})? Telemetry records will be purged.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmDevice(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDevice(deleteConfirmDevice.id)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
