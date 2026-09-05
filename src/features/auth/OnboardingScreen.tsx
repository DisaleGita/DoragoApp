import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Plane, Globe, DollarSign, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UserProfile } from '../../types';
import { getSystemTimezone } from '../../utils/dateTime';

interface OnboardingScreenProps {
  user: UserProfile;
  onComplete: (updatedProfile: Partial<UserProfile>) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ user, onComplete }) => {
  const [displayName, setDisplayName] = useState(user.displayName || 'Alex Rivera');
  const [homeAirport, setHomeAirport] = useState(user.homeAirportCode || 'ORD');
  const [timezone, setTimezone] = useState(user.timezone || getSystemTimezone());
  const [currency, setCurrency] = useState(user.preferredCurrency || 'USD');
  const [timeFormat24h, setTimeFormat24h] = useState<boolean>(user.timeFormat24h || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      displayName,
      homeAirportCode: homeAirport.toUpperCase(),
      timezone,
      preferredCurrency: currency,
      timeFormat24h,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-6 sm:p-8 max-w-md mx-auto">
      <div className="pt-4">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-bold tracking-wider uppercase">
          <Sparkles size={14} />
          <span>Quick Traveler Setup</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-auto py-6"
      >
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          Welcome to Dorago
        </h1>
        <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
          Set up your travel preferences to personalize trip itineraries and local times.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Your Display Name"
            placeholder="e.g. Alex Rivera"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          <Input
            label="Home Airport (Optional)"
            placeholder="e.g. ORD, SFO, LHR, JFK"
            value={homeAirport}
            onChange={(e) => setHomeAirport(e.target.value)}
            leftIcon={<Plane size={16} />}
            helperText="Used to optimize return flight suggestions."
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preferred Currency"
              placeholder="USD, EUR, GBP"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              leftIcon={<DollarSign size={16} />}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Time Format
              </label>
              <div className="grid grid-cols-2 gap-1.5 h-[44px]">
                <button
                  type="button"
                  onClick={() => setTimeFormat24h(false)}
                  className={`rounded-xl border text-xs font-semibold transition-all ${
                    !timeFormat24h
                      ? 'bg-teal-500/15 border-teal-500 text-teal-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  12h (AM/PM)
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFormat24h(true)}
                  className={`rounded-xl border text-xs font-semibold transition-all ${
                    timeFormat24h
                      ? 'bg-teal-500/15 border-teal-500 text-teal-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  24h (16:00)
                </button>
              </div>
            </div>
          </div>

          <Input
            label="Detected Time Zone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            leftIcon={<Globe size={16} />}
          />

          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              rightIcon={<ArrowRight size={18} />}
            >
              Create your first trip
            </Button>
          </div>
        </form>
      </motion.div>

      <div className="pb-4 text-center text-xs text-slate-400">
        You can change these preferences anytime in Profile.
      </div>
    </div>
  );
};
