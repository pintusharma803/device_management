import React, { useRef, useEffect } from 'react';

export default function OtpInputBoxes({
  otp,
  setOtp,
  onComplete,
  onClearError,
  disabled = false,
}) {
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (onClearError) onClearError();

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.join('').length === 6 && onComplete) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      if (onClearError) onClearError();
      if (onComplete) onComplete(pasted);
    }
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
      {otp.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputRefs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          className="w-11 h-13 sm:w-12 sm:h-14 text-center font-bold text-xl sm:text-2xl text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition shadow-inner disabled:opacity-50"
        />
      ))}
    </div>
  );
}
