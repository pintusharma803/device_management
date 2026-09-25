import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Modular Components
import DeviceTable from '../components/devices/DeviceTable';
import DeviceModal from '../components/devices/DeviceModal';
import DeviceEmptyState from '../components/devices/DeviceEmptyState';

const INITIAL_FORM = {
  serialNumber: '',
  deviceUniqueId: '',
  location: '',
};

export default function DevicePage() {
  const { showToast } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize modal state directly if URL query param was passed
  const [isModalOpen, setIsModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('action') === 'new' || params.get('action') === 'add';
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await api.get('/devices');
      if (res.data.success) {
        setDevices(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
      showToast('Could not load devices.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const openAddModal = useCallback(() => {
    setFormData(INITIAL_FORM);
    setFormError('');
    setIsModalOpen(true);
  }, []);

  // Clear query parameters from URL once consumed
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new' || params.get('action') === 'add') {
      navigate('/devices', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const res = await api.get('/devices');
        if (!ignore && res.data.success) {
          setDevices(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load devices:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formError) setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.serialNumber.trim()) {
      setFormError('Serial Number is required.');
      return;
    }
    if (!formData.deviceUniqueId.trim()) {
      setFormError('Device Unique ID is required.');
      return;
    }

    setFormLoading(true);
    try {
      const res = await api.post('/devices', formData);
      if (res.data.success) {
        showToast('Device registered successfully!', 'success');
        setIsModalOpen(false);
        fetchDevices();
      }
    } catch (err) {
      setFormError(
        err.response?.data?.error || err.response?.data?.message || 'Failed to save device. Please check inputs.'
      );
    } finally {
      setFormLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied "${text}" to clipboard`, 'info');
    setTimeout(() => {
      setCopiedKey('');
    }, 2000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {loading ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading registered hardware nodes...</p>
        </div>
      ) : devices.length === 0 ? (
        <DeviceEmptyState hasFilters={false} onAddDevice={openAddModal} />
      ) : (
        <DeviceTable
          devices={devices}
          onCopy={copyToClipboard}
          copiedKey={copiedKey}
        />
      )}

      <DeviceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleFormSubmit}
        formLoading={formLoading}
        formError={formError}
      />

      <div className="flex justify-end">
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Device</span>
        </button>
      </div>
    </div>
  );
}
