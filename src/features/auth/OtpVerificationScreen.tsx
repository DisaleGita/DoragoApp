import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface OtpVerificationScreenProps {
  email: string;
  devHintCode?: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  onChangeEmail: () => void;
  isLoading: boolean;
  error?: string;
}

export const OtpVerificationScreen: React.FC<OtpVerificationScreenProps> = ({
  email,
  devHintCode,
  onVerify,
  onResend,
  onChangeEmail,
  isLoading,
  error,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState<number>(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      // Paste handling
      handlePasteValue(val);
      return;
    }

    const cleanChar = val.replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    setDigits(newDigits);

    // Auto-advance to next input
    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits entered
    const fullCode = newDigits.join('');
    if (fullCode.length === 6) {
      onVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain');
    handlePasteValue(pasted);
  };

  const handlePasteValue = (val: string) => {
    const cleanDigits = val.replace(/[^0-9]/g, '').slice(0, 6).split('');
    const newDigits = ['', '', '', '', '', ''];
    cleanDigits.forEach((char, idx) => {
      newDigits[idx] = char;
    });
    setDigits(newDigits);

    if (cleanDigits.length === 6) {
      onVerify(newDigits.join(''));
    } else if (cleanDigits.length > 0) {
      const nextIdx = Math.min(cleanDigits.length, 5);
      inputRefs.current[nextIdx]?.focus();
    }
  };

  const handleResendClick = () => {
    if (resendTimer === 0) {
      setResendTimer(30);
      onResend();
    }
  };

  const fullEntered = digits.join('').length === 6;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-6 sm:p-8 max-w-md mx-auto relative">
      {/* Top Bar */}
      <div className="pt-4 flex items-center justify-between">
        <button
          onClick={onChangeEmail}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg"
        >
          <ArrowLeft size={16} />
          <span>Change email</span>
        </button>

        <span className="text-xs font-bold tracking-wider text-slate-400 font-mono uppercase">
          Step 2 of 2
        </span>
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-auto py-8 text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={24} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          Check your email
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          We sent a 6-digit code to <br />
          <strong className="text-slate-200 font-semibold">{email}</strong>
        </p>

        {/* 6-digit OTP Inputs */}
        <div className="mt-8 mb-6">
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl border bg-slate-900/90 text-slate-100 outline-none transition-all duration-150 ${
                  error
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : digit
                    ? 'border-teal-500/60 ring-1 ring-teal-500/30'
                    : 'border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                }`}
              />
            ))}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium"
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Dev Hint Helper for instant smooth demoing */}
          {devHintCode && (
            <div className="mt-4 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400 flex items-center justify-between max-w-xs mx-auto">
              <span>Dev Code: <strong className="text-teal-300 font-mono">{devHintCode}</strong></span>
              <button
                type="button"
                onClick={() => handlePasteValue(devHintCode)}
                className="text-[11px] font-bold text-teal-400 hover:underline"
              >
                Auto-fill
              </button>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full max-w-xs mx-auto"
          disabled={!fullEntered}
          isLoading={isLoading}
          onClick={() => onVerify(digits.join(''))}
        >
          Verify & Continue
        </Button>

        {/* Resend Section */}
        <div className="mt-6 text-xs text-slate-400">
          {resendTimer > 0 ? (
            <span>Resend code in <strong className="text-slate-300">{resendTimer}s</strong></span>
          ) : (
            <button
              onClick={handleResendClick}
              className="font-semibold text-teal-400 hover:text-teal-300 transition-colors inline-flex items-center gap-1"
            >
              <RefreshCw size={12} />
              <span>Resend verification code</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Footer */}
      <div className="pb-4 text-center text-xs text-slate-400">
        Email OTP verifies your email securely without passwords.
      </div>
    </div>
  );
};
