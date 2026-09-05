import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Compass, ArrowRight, Shield, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface LoginScreenProps {
  onEmailSubmitted: (email: string, devHintCode?: string) => void;
  isLoading: boolean;
  error?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onEmailSubmitted,
  isLoading,
  error,
}) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    onEmailSubmitted(email.trim().toLowerCase());
  };

  const handleQuickDemoEmail = (demoEmail: string) => {
    setEmail(demoEmail);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-6 sm:p-8 max-w-md mx-auto relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="pt-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/20 font-extrabold text-xl">
            D
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white font-sans">
            DORAGO
          </span>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="my-auto py-8"
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
          Your whole trip. <br />
          <span className="text-teal-400">One place.</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
          Flights, stays, plans and travel details — organized automatically.
        </p>

        {/* Strict Email Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            error={error}
            className="text-base py-3"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            rightIcon={<ArrowRight size={18} />}
          >
            Continue
          </Button>

          {/* Demo Quick Fill for testing convenience */}
          <div className="pt-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 font-semibold">
              Test Accounts (One-tap test)
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoEmail('alex.rivera@example.com')}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                alex.rivera@example.com
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoEmail('traveler@dorago.app')}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                traveler@dorago.app
              </button>
            </div>
          </div>
        </form>

        {/* Feature Highlights */}
        <div className="mt-8 pt-6 border-t border-slate-900 grid grid-cols-2 gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-teal-400 shrink-0" />
            <span>AI Travel Import</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-teal-400 shrink-0" />
            <span>Offline-Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-teal-400 shrink-0" />
            <span>Multi-Timezone</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-teal-400 shrink-0" />
            <span>Zero Password Auth</span>
          </div>
        </div>
      </motion.div>

      {/* Footer Disclaimer per PRD Screen 2 */}
      <div className="pt-4 text-center">
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-normal">
          By continuing, you agree to Dorago's{' '}
          <span className="text-slate-300 underline cursor-pointer">Terms</span> and{' '}
          <span className="text-slate-300 underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};
