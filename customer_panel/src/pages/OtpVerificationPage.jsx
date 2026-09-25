import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, RefreshCw, KeyRound, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Modular Components
import AuthHeader from '../components/auth/AuthHeader';
import DevOtpBanner from '../components/auth/DevOtpBanner';
import OtpInputBoxes from '../components/auth/OtpInputBoxes';
import ThemeToggle from '../components/common/ThemeToggle';

export default function OtpVerificationPage() {
  const { verifyOtp, resendOtp, showToast } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get('email') || '';
  const purpose = searchParams.get('purpose') || 'REGISTRATION';
  const initialDevOtp = location.state?.devOtp || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devOtpCode, setDevOtpCode] = useState(initialDevOtp);
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const fullCode = otp.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!email) {
      setError('Email address is missing. Please start registration again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await verifyOtp({
        email,
        otpCode: fullCode,
        purpose,
      });

      if (res.success) {
        showToast('Verification successful! Welcome to your customer panel.', 'success');
        navigate('/');
      } else {
        setError(res.error || 'Verification code failed. Please check and retry.');
      }
    } catch (err) {
      setError(
        err.response?.data?.error || 'Invalid or expired code. Please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !email) return;
    setLoading(true);
    setError('');

    try {
      const res = await resendOtp({ email, purpose });
      if (res.success) {
        showToast('New verification code sent to your email!', 'info');
        setTimer(60);
        if (res.devOtp) {
          setDevOtpCode(res.devOtp);
        }
      } else {
        setError(res.error || 'Could not resend OTP.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code.');
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
          icon={KeyRound}
          title="Verify Your Email"
          subtitle={
            <>
              We sent a 6-digit code to{' '}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <OtpInputBoxes
              otp={otp}
              setOtp={setOtp}
              onClearError={() => setError('')}
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Verify Account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 text-xs">
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
                  <span>Resend OTP</span>
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
              to="/register"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to registration</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
