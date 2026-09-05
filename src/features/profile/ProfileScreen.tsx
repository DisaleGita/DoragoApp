import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  User,
  Plane,
  Globe,
  DollarSign,
  Clock,
  Bell,
  HardDrive,
  Shield,
  Trash2,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Download,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ClientStorage } from '../../storage/clientStorage';
import { SeedData } from '../../data/seedData';

interface ProfileScreenProps {
  user: UserProfile;
  onBack: () => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onResetSeedData: () => void;
  onOpenTestRunner: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onBack,
  onUpdateProfile,
  onLogout,
  onDeleteAccount,
  onResetSeedData,
  onOpenTestRunner,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [homeAirport, setHomeAirport] = useState(user.homeAirportCode || '');
  const [timezone, setTimezone] = useState(user.timezone || 'America/Chicago');
  const [currency, setCurrency] = useState(user.preferredCurrency || 'USD');
  const [timeFormat24h, setTimeFormat24h] = useState(user.timeFormat24h || false);
  const [savedNotice, setSavedNotice] = useState(false);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSeedResetNotice, setShowSeedResetNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      displayName,
      homeAirportCode: homeAirport.toUpperCase(),
      timezone,
      preferredCurrency: currency,
      timeFormat24h,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleExportData = () => {
    const data = {
      profile: user,
      trips: ClientStorage.getTrips(),
      plans: ClientStorage.getPlans(),
      documents: ClientStorage.getDocuments(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dorago-travel-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-28 text-slate-100">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-900 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-bold text-slate-100">Profile & Settings</h1>
        </div>

        {savedNotice && (
          <span className="text-xs text-teal-400 flex items-center gap-1 font-semibold animate-fade-in">
            <CheckCircle2 size={14} /> Saved
          </span>
        )}
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* User Identity Banner */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-teal-400 text-slate-950 font-extrabold text-2xl flex items-center justify-center shadow-md">
            {displayName ? displayName.charAt(0) : 'U'}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">{displayName || 'Traveler'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Verified Email OTP
            </span>
          </div>
        </div>

        {/* Travel Preferences Form */}
        <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Travel Preferences</h3>

          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <Input
            label="Home Airport"
            placeholder="e.g. ORD"
            value={homeAirport}
            onChange={(e) => setHomeAirport(e.target.value)}
            leftIcon={<Plane size={16} />}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              leftIcon={<DollarSign size={16} />}
            />
            <Input
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              leftIcon={<Globe size={16} />}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">24-Hour Time Format</span>
              <span className="text-[11px] text-slate-400">e.g., 16:30 instead of 4:30 PM</span>
            </div>
            <button
              type="button"
              onClick={() => setTimeFormat24h(!timeFormat24h)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                timeFormat24h ? 'bg-teal-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  timeFormat24h ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            Save Preferences
          </Button>
        </form>

        {/* Developer & Test Runner Tools (Per Section 52) */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Terminal size={14} /> Developer & QA Verification
          </h3>
          <p className="text-xs text-slate-400">
            Run automated verification checks across the 12 core PRD criteria or reload demo trips.
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Terminal size={14} className="text-indigo-400" />}
              onClick={onOpenTestRunner}
            >
              Run PRD Tests
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={14} className="text-teal-400" />}
              onClick={() => {
                onResetSeedData();
                setShowSeedResetNotice(true);
                setTimeout(() => setShowSeedResetNotice(false), 2500);
              }}
            >
              {showSeedResetNotice ? 'Reloaded!' : 'Reset Demo Seed'}
            </Button>
          </div>
        </div>

        {/* Data & Privacy Actions */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <HardDrive size={14} /> Data & Storage
          </h3>

          <div className="text-xs text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Offline Trips in Cache:</span>
              <strong className="text-slate-200 font-mono">{ClientStorage.getTrips().length}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cached Plan Items:</span>
              <strong className="text-slate-200 font-mono">{ClientStorage.getPlans().length}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            className="w-full text-left py-2 text-xs font-medium text-slate-300 hover:text-teal-400 flex items-center gap-2 transition-colors"
          >
            <Download size={14} /> Export My Travel Data (JSON)
          </button>
        </div>

        {/* Account Actions */}
        <div className="space-y-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full justify-center"
            leftIcon={<LogOut size={16} />}
            onClick={onLogout}
          >
            Log Out
          </Button>

          <Button
            type="button"
            variant="danger"
            size="md"
            className="w-full justify-center"
            leftIcon={<Trash2 size={16} />}
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Account & Local Data
          </Button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account & Data"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            This will permanently remove all your trips, itinerary plans, attached documents, and
            local cache. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setShowDeleteModal(false);
                onDeleteAccount();
              }}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
