import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PlanCategory, PlanItem, Trip } from '../../types';
import { PlanTypeIcon, getPlanTypeLabel } from '../ui/PlanTypeIcon';
import { createUtcTimestamp } from '../../utils/dateTime';
import { ChevronDown, Plus } from 'lucide-react';

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onSubmit: (planData: any) => void;
  initialData?: PlanItem | null;
}

const PRIMARY_PLAN_TYPES: PlanCategory[] = [
  'flight',
  'lodging',
  'car_rental',
  'rail',
  'dining',
  'activity',
  'event',
  'meeting',
  'rideshare',
];

const MORE_PLAN_TYPES: PlanCategory[] = [
  'bus',
  'ferry',
  'cruise',
  'parking',
  'tour',
  'attraction',
  'ticket',
  'insurance',
  'visa_appointment',
  'custom_note',
  'generic_reservation',
];

export const AddPlanModal: React.FC<AddPlanModalProps> = ({
  isOpen,
  onClose,
  trip,
  onSubmit,
  initialData,
}) => {
  const [selectedType, setSelectedType] = useState<PlanCategory>('flight');
  const [showMoreTypes, setShowMoreTypes] = useState(false);

  // Common Fields
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(trip.startDate);
  const [startTime, setStartTime] = useState('12:00');
  const [endDate, setEndDate] = useState(trip.startDate);
  const [endTime, setEndTime] = useState('14:00');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [providerName, setProviderName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costCurrency, setCostCurrency] = useState('USD');
  const [notes, setNotes] = useState('');

  // Flight Specific
  const [flightNumber, setFlightNumber] = useState('');
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [departureTerminal, setDepartureTerminal] = useState('');
  const [departureGate, setDepartureGate] = useState('');
  const [seat, setSeat] = useState('');
  const [cabinClass, setCabinClass] = useState('Economy');

  // Lodging Specific
  const [roomType, setRoomType] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('');

  // Dining / Activity
  const [partySize, setPartySize] = useState('2');
  const [dressCode, setDressCode] = useState('');

  // Rail Specific
  const [trainNumber, setTrainNumber] = useState('');
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    if (initialData) {
      setSelectedType(initialData.planType);
      setTitle(initialData.title);
      const [sDate, sTime] = initialData.startAtLocal.split('T');
      setStartDate(sDate || trip.startDate);
      setStartTime(sTime || '12:00');

      if (initialData.endAtLocal) {
        const [eDate, eTime] = initialData.endAtLocal.split('T');
        setEndDate(eDate || trip.startDate);
        setEndTime(eTime || '14:00');
      }

      setConfirmationNumber(initialData.confirmationNumber || '');
      setProviderName(initialData.providerName || '');
      setLocationName(initialData.locationName || '');
      setAddress(initialData.address || '');
      setCostAmount(initialData.costAmount ? String(initialData.costAmount) : '');
      setCostCurrency(initialData.costCurrency || 'USD');
      setNotes(initialData.notes || '');

      const details = (initialData.details || {}) as any;
      setFlightNumber(details.flightNumber || '');
      setDepartureAirport(details.departureAirport || '');
      setArrivalAirport(details.arrivalAirport || '');
      setDepartureTerminal(details.departureTerminal || '');
      setDepartureGate(details.departureGate || '');
      setSeat(details.seat || '');
      setCabinClass(details.cabinClass || 'Economy');
      setRoomType(details.roomType || '');
      setCancellationPolicy(details.cancellationPolicy || '');
      setPartySize(details.partySize ? String(details.partySize) : '2');
      setDressCode(details.dressCode || '');
      setTrainNumber(details.trainNumber || '');
      setPlatform(details.platform || '');
    } else {
      // Reset form defaults
      setSelectedType('flight');
      setTitle('');
      setStartDate(trip.startDate);
      setStartTime('12:00');
      setEndDate(trip.startDate);
      setEndTime('14:00');
      setConfirmationNumber('');
      setProviderName('');
      setLocationName('');
      setAddress('');
      setCostAmount('');
      setNotes('');
      setFlightNumber('');
      setDepartureAirport('');
      setArrivalAirport('');
      setDepartureTerminal('');
      setDepartureGate('');
      setSeat('');
    }
  }, [initialData, trip, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const startAtLocal = `${startDate}T${startTime}`;
    const endAtLocal = endDate && endTime ? `${endDate}T${endTime}` : undefined;

    // Build specific details payload
    let details: Record<string, any> = {};
    let autoTitle = title;

    if (selectedType === 'flight') {
      details = {
        airline: providerName,
        flightNumber,
        departureAirport: departureAirport.toUpperCase(),
        arrivalAirport: arrivalAirport.toUpperCase(),
        departureTerminal,
        departureGate,
        seat,
        cabinClass,
        recordLocator: confirmationNumber,
      };
      if (!autoTitle) {
        autoTitle = flightNumber
          ? `Flight ${flightNumber} (${departureAirport.toUpperCase()} → ${arrivalAirport.toUpperCase()})`
          : `Flight to ${arrivalAirport.toUpperCase() || trip.primaryDestination}`;
      }
    } else if (selectedType === 'lodging') {
      details = {
        propertyName: locationName || providerName,
        address,
        checkInTime: startTime,
        checkOutTime: endTime,
        roomType,
        cancellationPolicy,
      };
      if (!autoTitle) autoTitle = locationName || providerName || 'Hotel Check-in';
    } else if (selectedType === 'dining') {
      details = {
        venueName: locationName,
        partySize: parseInt(partySize, 10) || 2,
        dressCode,
      };
      if (!autoTitle) autoTitle = `Dinner at ${locationName || 'Restaurant'}`;
    } else if (selectedType === 'rail') {
      details = {
        carrier: providerName,
        trainNumber,
        platform,
      };
      if (!autoTitle) autoTitle = trainNumber ? `Train ${trainNumber}` : `Rail to ${locationName}`;
    } else {
      if (!autoTitle) autoTitle = `${getPlanTypeLabel(selectedType)} - ${locationName || trip.primaryDestination}`;
    }

    const planPayload = {
      tripId: trip.id,
      planType: selectedType,
      title: autoTitle,
      startAtLocal,
      endAtLocal,
      timezone: trip.timezone,
      startAtUtc: createUtcTimestamp(startAtLocal, trip.timezone),
      endAtUtc: endAtLocal ? createUtcTimestamp(endAtLocal, trip.timezone) : undefined,
      isAllDay: false,
      providerName,
      confirmationNumber: confirmationNumber || undefined,
      locationName: locationName || departureAirport || undefined,
      address: address || undefined,
      costAmount: costAmount ? parseFloat(costAmount) : undefined,
      costCurrency,
      notes: notes || undefined,
      status: 'confirmed',
      sourceType: 'manual',
      details,
    };

    onSubmit(planPayload);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Travel Plan' : 'Add Travel Plan'}
      subtitle={`Add to ${trip.title}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Progressive Plan-Type Selector */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Select Plan Category
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {PRIMARY_PLAN_TYPES.map((type) => {
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-teal-500/15 border-teal-500 text-teal-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <PlanTypeIcon type={type} size={20} className={isSelected ? 'text-teal-400' : 'text-slate-400'} />
                  <span className="mt-1 truncate max-w-full">{getPlanTypeLabel(type).split('/')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* More Categories Accordion */}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowMoreTypes(!showMoreTypes)}
              className="text-xs text-slate-400 hover:text-teal-400 flex items-center gap-1 font-medium transition-colors"
            >
              <span>{showMoreTypes ? 'Hide additional categories' : '+ More plan categories (Bus, Ferry, Cruise, Tour...)'}</span>
              <ChevronDown size={14} className={`transition-transform ${showMoreTypes ? 'rotate-180' : ''}`} />
            </button>

            {showMoreTypes && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-800">
                {MORE_PLAN_TYPES.map((type) => {
                  const isSelected = selectedType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-teal-500/15 border-teal-500 text-teal-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <PlanTypeIcon type={type} size={16} />
                      <span className="truncate">{getPlanTypeLabel(type)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Category Specific Fields */}
        {selectedType === 'flight' && (
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="text-xs font-bold text-teal-400 uppercase tracking-wider">Flight Information</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Input
                label="Airline"
                placeholder="e.g. United Airlines"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
              />
              <Input
                label="Flight Number"
                placeholder="e.g. UA 211"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
              />
              <Input
                label="Seat"
                placeholder="e.g. 14B"
                value={seat}
                onChange={(e) => setSeat(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Departure Airport"
                placeholder="e.g. ORD"
                value={departureAirport}
                onChange={(e) => setDepartureAirport(e.target.value)}
              />
              <Input
                label="Arrival Airport"
                placeholder="e.g. SFO"
                value={arrivalAirport}
                onChange={(e) => setArrivalAirport(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Departure Terminal"
                placeholder="e.g. Terminal 1"
                value={departureTerminal}
                onChange={(e) => setDepartureTerminal(e.target.value)}
              />
              <Input
                label="Departure Gate"
                placeholder="e.g. Gate B12"
                value={departureGate}
                onChange={(e) => setDepartureGate(e.target.value)}
              />
            </div>
          </div>
        )}

        {selectedType === 'lodging' && (
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Lodging Details</div>
            <Input
              label="Property / Hotel Name"
              placeholder="e.g. The Example Hotel San Francisco"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              required
            />
            <Input
              label="Hotel Address"
              placeholder="e.g. 123 Market Street, San Francisco, CA"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Room Type"
                placeholder="e.g. Deluxe King Bay View"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
              />
              <Input
                label="Cancellation Policy"
                placeholder="e.g. Free until 48h prior"
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
              />
            </div>
          </div>
        )}

        {selectedType === 'dining' && (
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">Dining & Reservation</div>
            <Input
              label="Restaurant / Venue Name"
              placeholder="e.g. Mission Bistro"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Party Size"
                type="number"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
              />
              <Input
                label="Dress Code"
                placeholder="e.g. Smart Casual"
                value={dressCode}
                onChange={(e) => setDressCode(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Date & Time Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Input
            label="End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        {/* Confirmation & Cost */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Input
            label="Confirmation Number / PNR"
            placeholder="e.g. X7Y9PL"
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
          />
          <Input
            label="Cost"
            type="number"
            step="0.01"
            placeholder="e.g. 180.00"
            value={costAmount}
            onChange={(e) => setCostAmount(e.target.value)}
          />
          <Input
            label="Currency"
            placeholder="USD"
            value={costCurrency}
            onChange={(e) => setCostCurrency(e.target.value.toUpperCase())}
          />
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Notes & Instructions</label>
          <textarea
            rows={2}
            className="w-full bg-slate-900/90 text-slate-100 placeholder:text-slate-500 text-sm rounded-xl px-3.5 py-2.5 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
            placeholder="Important booking instructions, directions, confirmation notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md">
            {initialData ? 'Save Plan' : 'Add to Itinerary'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
