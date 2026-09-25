/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('customer_token'));
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info' }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Check auth state on startup
  useEffect(() => {
    async function checkAuth() {
      const savedToken = localStorage.getItem('customer_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
        }
      } catch {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  // Register
  const register = async ({ name, email, password, phone }) => {
    const res = await api.post('/auth/register', { name, email, password, phone });
    return res.data;
  };

  // Verify OTP
  const verifyOtp = async ({ email, otpCode, purpose }) => {
    const res = await api.post('/auth/verify-otp', { email, otpCode, purpose });
    if (res.data.success && res.data.token) {
      localStorage.setItem('customer_token', res.data.token);
      localStorage.setItem('customer_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res.data;
  };

  // Resend OTP
  const resendOtp = async ({ email, purpose }) => {
    const res = await api.post('/auth/resend-otp', { email, purpose });
    return res.data;
  };

  // Login
  const login = async ({ email, password }) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success && !res.data.requires2FA && res.data.token) {
      localStorage.setItem('customer_token', res.data.token);
      localStorage.setItem('customer_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res.data;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    setToken(null);
    setUser(null);
    showToast('Logged out successfully.', 'info');
  };

  // Update Profile
  const updateProfile = async ({ name, phone, avatarUrl }) => {
    const res = await api.put('/user/profile', { name, phone, avatarUrl });
    if (res.data.success) {
      setUser(res.data.user);
      localStorage.setItem('customer_user', JSON.stringify(res.data.user));
      showToast('Profile updated successfully!', 'success');
    }
    return res.data;
  };

  // Change Password
  const changePassword = async ({ currentPassword, newPassword }) => {
    const res = await api.put('/user/password', { currentPassword, newPassword });
    if (res.data.success) {
      showToast('Password changed successfully!', 'success');
    }
    return res.data;
  };

  // Toggle 2FA
  const toggleTwoFactor = async (enabled) => {
    const res = await api.put('/user/two-factor', { enabled });
    if (res.data.success) {
      setUser(res.data.user);
      showToast(res.data.message, 'success');
    }
    return res.data;
  };

  // Forgot Password
  const forgotPassword = async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  };

  // Reset Password
  const resetPassword = async ({ email, otpCode, newPassword }) => {
    const res = await api.post('/auth/reset-password', { email, otpCode, newPassword });
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        register,
        verifyOtp,
        resendOtp,
        login,
        logout,
        updateProfile,
        changePassword,
        toggleTwoFactor,
        forgotPassword,
        resetPassword,
        showToast,
      }}
    >
      {children}

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-0 text-sm font-medium animate-bounce-short bg-slate-900 text-white border border-slate-700">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              toast.type === 'success'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : toast.type === 'error'
                ? 'bg-rose-400 shadow-[0_0_8px_#fb7185]'
                : 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'
            }`}
          />
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
