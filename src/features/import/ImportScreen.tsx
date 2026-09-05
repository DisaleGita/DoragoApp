import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Sparkles,
  Upload,
  FileText,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Plane,
  Building,
  Utensils,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { AiImportService } from '../../services/aiImportService';
import { ParserResult, Trip } from '../../types';

interface ImportScreenProps {
  trips: Trip[];
  preselectedTripId?: string;
  onBack: () => void;
  onParseSuccess: (result: ParserResult, targetTripId?: string) => void;
}

const SAMPLE_CONFIRMATIONS = [
  {
    title: 'United Airlines Flight Confirmation',
    category: 'Flight',
    icon: Plane,
    text: `United Airlines Confirmation: H7Y9KP
Passenger: Alex Rivera
Date: Sep 18, 2026
Flight UA 211
Depart: Chicago O'Hare (ORD) at 4:20 PM - Terminal 1, Gate B12
Arrive: San Francisco International (SFO) at 7:05 PM - Terminal 3
Seat: 14B (Economy)
Cost: $342.50 USD`,
  },
  {
    title: 'Grand Hyatt Hotel Booking',
    category: 'Lodging',
    icon: Building,
    text: `Grand Hyatt San Francisco
Confirmation #: GHY-99214-SF
Guest: Alex Rivera
Check-in: Sep 18, 2026 at 3:00 PM
Check-out: Sep 22, 2026 at 11:00 AM
Address: 345 Stockton St, San Francisco, CA 94108
Room: 1 King Bed Deluxe Bay View
Total Amount: $789.20 USD`,
  },
  {
    title: 'Nobu Restaurant Dinner',
    category: 'Dining',
    icon: Utensils,
    text: `Nobu Dining Reservation
Reservation Code: NOBU-8812
Date: Friday, Sep 19, 2026 at 7:30 PM
Party Size: 2 Guests
Location: Nobu Palo Alto, 180 Hamilton Ave, Palo Alto, CA
Dress Code: Smart Casual`,
  },
];

export const ImportScreen: React.FC<ImportScreenProps> = ({
  trips,
  preselectedTripId,
  onBack,
  onParseSuccess,
}) => {
  const [inputText, setInputText] = useState('');
  const [targetTripId, setTargetTripId] = useState<string | undefined>(preselectedTripId);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await AiImportService.parseTravelText(inputText, targetTripId);
      onParseSuccess(result, targetTripId);
    } catch (err: any) {
      setErrorMessage('Unable to parse travel confirmation. Please check text or connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await AiImportService.parseTravelFile(file, targetTripId);
      onParseSuccess(result, targetTripId);
    } catch (err: any) {
      setErrorMessage('Failed to extract data from file. Please try pasting raw text.');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleLoadSample = (sampleText: string) => {
    setInputText(sampleText);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24 text-slate-100">
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
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              <Sparkles size={16} className="text-teal-400" />
              <span>Import Travel Confirmation</span>
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Banner Info */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/30 border border-teal-500/20 shadow-sm">
          <h2 className="text-sm sm:text-base font-bold text-slate-100 mb-1">
            Server-Side Gemini Travel Parser
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Paste any booking email confirmation, airline receipt, flight change notice, or upload a
            PDF screenshot. Dorago extracts flights, hotels, trains, and dinner bookings.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-teal-300/90 font-medium">
            <ShieldCheck size={14} className="text-teal-400" />
            <span>Server-side verification · Full review before saving</span>
          </div>
        </div>

        {/* Target Trip Selection */}
        {trips.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Assign to Trip (Optional)
            </label>
            <select
              value={targetTripId || ''}
              onChange={(e) => setTargetTripId(e.target.value || undefined)}
              className="w-full bg-slate-900 text-slate-100 text-sm rounded-xl px-3.5 py-2.5 border border-slate-800 focus:border-teal-500 outline-none"
            >
              <option value="">Auto-create new trip or select during review</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.primaryDestination})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Text Input Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Paste Confirmation Text / Email
            </label>
            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Clear text
              </button>
            )}
          </div>

          <textarea
            rows={6}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your flight confirmation, hotel booking email, Airbnb details, or rail tickets..."
            className="w-full bg-slate-900 text-slate-100 placeholder:text-slate-500 text-sm rounded-2xl p-4 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none font-mono resize-y"
          />

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle size={14} className="text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              isLoading={isLoading}
              disabled={!inputText.trim()}
              onClick={handleParse}
              leftIcon={<Sparkles size={16} />}
            >
              Parse Confirmation
            </Button>

            {/* File Upload Option */}
            <label className="cursor-pointer">
              <input
                type="file"
                onChange={handleFileUpload}
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={isLoading}
              />
              <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-sm font-semibold transition-all">
                <Upload size={16} className="text-teal-400" />
                <span>Upload PDF / Image</span>
              </span>
            </label>
          </div>
        </div>

        {/* One-Tap Sample Snippets for Instant Testing */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quick Test Confirmations (One-tap fill)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {SAMPLE_CONFIRMATIONS.map((sample, idx) => {
              const Icon = sample.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadSample(sample.text)}
                  className="w-full text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-teal-500/40 flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-teal-400 shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-200 group-hover:text-teal-300 transition-colors">
                        {sample.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{sample.category}</div>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-teal-400/90 group-hover:text-teal-300 flex items-center gap-1 shrink-0">
                    Load <ArrowRight size={12} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
