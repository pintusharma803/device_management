import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Modular Settings Components
import SettingsNavTabs from '../components/settings/SettingsNavTabs';
import ProfileTab from '../components/settings/ProfileTab';
import SecurityTab from '../components/settings/SecurityTab';
import TwoFactorTab from '../components/settings/TwoFactorTab';

export default function SettingsPage() {
  const { user, updateProfile, changePassword, toggleTwoFactor, showToast } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');

  // Synchronize state when user changes
  const [prevUserId, setPrevUserId] = useState(user?.id);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatar_url || '',
  });
  const [twoFactorActive, setTwoFactorActive] = useState(Boolean(user?.two_factor_enabled));

  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    setProfileData({
      name: user?.name || '',
      phone: user?.phone || '',
      avatarUrl: user?.avatar_url || '',
    });
    setTwoFactorActive(Boolean(user?.two_factor_enabled));
  }

  const [profileLoading, setProfileLoading] = useState(false);

  // Password Form State
  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  const handleProfileFieldChange = (field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }
    setProfileLoading(true);
    try {
      await updateProfile(profileData);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePassFieldChange = (field, value) => {
    setPassData((prev) => ({ ...prev, [field]: value }));
    if (passError) setPassError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');

    if (passData.newPassword !== passData.confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    if (passData.newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await changePassword({
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword,
      });
      if (res.success) {
        setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPassError(res.error || 'Password update failed.');
      }
    } catch (err) {
      setPassError(err.response?.data?.error || 'Incorrect current password or server error.');
    } finally {
      setPassLoading(false);
    }
  };

  const handle2FAToggle = async () => {
    const nextState = !twoFactorActive;
    setTwoFactorLoading(true);
    try {
      await toggleTwoFactor(nextState);
      setTwoFactorActive(nextState);
    } catch {
      showToast('Could not update Two-Factor authentication setting.', 'error');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pt-2">
      <SettingsNavTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {activeTab === 'profile' && (
          <ProfileTab
            profileData={profileData}
            onChange={handleProfileFieldChange}
            onSubmit={handleProfileSubmit}
            loading={profileLoading}
            userEmail={user?.email}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTab
            passData={passData}
            onChange={handlePassFieldChange}
            onSubmit={handlePasswordSubmit}
            loading={passLoading}
            error={passError}
          />
        )}

        {activeTab === '2fa' && (
          <TwoFactorTab
            active={twoFactorActive}
            onToggle={handle2FAToggle}
            loading={twoFactorLoading}
          />
        )}
      </div>
    </div>
  );
}
