import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Trip, TripPurpose } from '../../types';
import { formatTripDateRange, getSystemTimezone } from '../../utils/dateTime';
import { Calendar, MapPin, Sparkles } from 'lucide-react';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tripData: any) => void;
  initialData?: Trip | null;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [destination, setDestination] = useState('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timezone, setTimezone] = useState(getSystemTimezone());
  const [purpose, setPurpose] = useState<TripPurpose>('leisure');
  const [notes, setNotes] = useState('');
  const [travelerNames, setTravelerNames] = useState('Alex Rivera');
  const [hasUserCustomTitle, setHasUserCustomTitle] = useState(false);

  useEffect(() => {
    if (initialData) {
      setDestination(initialData.primaryDestination);
      setTitle(initialData.title);
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setTimezone(initialData.timezone);
      setPurpose(initialData.purpose);
      setNotes(initialData.notes || '');
      setTravelerNames(initialData.travelers?.map((t) => t.fullName).join(', ') || 'Primary Traveler');
      setHasUserCustomTitle(true);
    } else {
      // Default dates 2 weeks out
      const today = new Date();
      const s = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const e = new Date(today.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(s);
      setEndDate(e);
      setDestination('');
      setTitle('');
      setNotes('');
      setHasUserCustomTitle(false);
    }
  }, [initialData, isOpen]);

  // Smart title suggestion per PRD Section 11:
  // e.g., If destination is "Paris" and dates "Sep 10–15" -> suggest "Paris · Sep 10–15"
  useEffect(() => {
    if (!hasUserCustomTitle && destination && startDate && endDate) {
      const range = formatTripDateRange(startDate, endDate);
      setTitle(`${destination} · ${range}`);
    }
  }, [destination, startDate, endDate, hasUserCustomTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !startDate || !endDate) return;

    const travelers = travelerNames
      .split(',')
      .map((name, i) => ({
        id: `trav_${Date.now()}_${i}`,
        userId: 'usr_local',
        fullName: name.trim() || 'Traveler',
        isPrimaryUser: i === 0,
      }))
      .filter((t) => t.fullName.length > 0);

    onSubmit({
      title: title || `${destination} Trip`,
      primaryDestination: destination,
      startDate,
      endDate,
      timezone,
      purpose,
      notes,
      travelers,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Trip' : 'Create New Trip'}
      subtitle="Organize flights, hotels, reservations and documents in one place."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Primary Destination"
          placeholder="e.g. San Francisco, CA or Paris, France"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          leftIcon={<MapPin size={16} />}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        <div className="relative">
          <Input
            label="Trip Title"
            placeholder="e.g. San Francisco Weekend"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasUserCustomTitle(true);
            }}
            helperText="Smart title auto-generated from destination and dates."
          />
        </div>

        {/* Purpose pills */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
            Trip Purpose
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['leisure', 'business', 'other'] as TripPurpose[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPurpose(p)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border capitalize transition-all ${
                  purpose === p
                    ? 'bg-teal-500/15 border-teal-500 text-teal-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Travelers"
          placeholder="Comma separated names (e.g. Alex, Morgan)"
          value={travelerNames}
          onChange={(e) => setTravelerNames(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Trip Notes
          </label>
          <textarea
            rows={2}
            className="w-full bg-slate-900/90 text-slate-100 placeholder:text-slate-500 text-sm rounded-xl px-3.5 py-2.5 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
            placeholder="General travel notes, packing reminders, packing list..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md">
            {initialData ? 'Save Changes' : 'Create Trip'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
