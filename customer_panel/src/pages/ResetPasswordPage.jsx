import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Modular Components
import AuthHeader from '../components/auth/AuthHeader';
import DevOtpBanner from '../components/auth/DevOtpBanner';
import OtpInputBoxes from '../components/auth/OtpInputBoxes';
import ThemeToggle from '../components/common/ThemeToggle';

export default function ResetPasswordPage() {
  const { resetPassword, forgotPassword, showToast } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get('email') || '';
  const initialDevOtp = location.state?.devOtp || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devOtpCode, setDevOtpCode] = useState(initialDevOtp);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canResend = timer === 0;

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleFillDevOtp = () => {
    if (devOtpCode && devOtpCode.length === 6) {
      setOtp(devOtpCode.split(''));
      if (error) setError('');
    }
  };

  const handleResend = async () => {
    if (!canResend || !email) return;
    setLoading(true);
    setError('');

    try {
      const res = await forgotPassword(email);
      if (res.success) {
        showToast('New password reset code dispatched to your email!', 'info');
        setTimer(60);
        if (res.devOtp) setDevOtpCode(res.devOtp);
      } else {
        setError(res.error || 'Failed to resend code.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otp.join('');

    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the reset code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await resetPassword({
        email,
        otpCode: fullOtp,
        newPassword,
      });

      if (res.success) {
        showToast('Password reset successfully! You can now log in.', 'success');
        navigate('/login');
      } else {
        setError(res.error || 'Failed to reset password.');
      }
    } catch (err) {
      setError(
        err.response?.data?.error || 'Invalid or expired reset code. Please request a new code.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden transition-colors duration-200">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md" />
      </div>

      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-purple-600/10 dark:bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <AuthHeader
          icon={Lock}
          title="Reset Your Password"
          subtitle={
            <>
              Enter the 6-digit code sent to{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {email || 'your email'}
              </span>
            </>
          }
        />

        <DevOtpBanner devOtpCode={devOtpCode} onAutoFill={handleFillDevOtp} />

        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl">
          {error && (
            <div className="mb-6 flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                6-Digit Reset Code
              </label>
              <OtpInputBoxes
                otp={otp}
                setOtp={setOtp}
                onClearError={() => setError('')}
                disabled={loading}
              />
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError('');
                  }}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-11 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <ShieldCheck className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError('');
                  }}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading || otp.join('').length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Set New Password</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span>Didn't receive the code?</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend Code</span>
                </button>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Resend in{' '}
                  <strong className="text-slate-700 dark:text-slate-300 font-mono">
                    {timer}s
                  </strong>
                </span>
              )}
            </div>

            <Link
              to="/forgot-password"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change email address</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
