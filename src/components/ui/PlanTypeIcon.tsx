/**
 * Dorago Plan Type Icon Engine
 * Restrained, high-clarity travel icons for all 20+ plan categories
 */

import React from 'react';
import {
  Plane,
  Building,
  Car,
  Train,
  Bus,
  Ship,
  Anchor,
  Navigation,
  SquareParking,
  Utensils,
  Compass,
  Calendar,
  Users,
  MapPin,
  Ticket,
  ShieldCheck,
  FileCheck,
  StickyNote,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import { PlanCategory } from '../../types';

interface PlanTypeIconProps {
  type: PlanCategory | string;
  size?: number;
  className?: string;
}

export const PlanTypeIcon: React.FC<PlanTypeIconProps> = ({ type, size = 18, className = '' }) => {
  switch (type) {
    case 'flight':
      return <Plane size={size} className={className || 'text-teal-400'} />;
    case 'lodging':
      return <Building size={size} className={className || 'text-indigo-400'} />;
    case 'car_rental':
      return <Car size={size} className={className || 'text-amber-400'} />;
    case 'rail':
      return <Train size={size} className={className || 'text-emerald-400'} />;
    case 'bus':
      return <Bus size={size} className={className || 'text-orange-400'} />;
    case 'ferry':
      return <Ship size={size} className={className || 'text-cyan-400'} />;
    case 'cruise':
      return <Anchor size={size} className={className || 'text-sky-400'} />;
    case 'rideshare':
      return <Navigation size={size} className={className || 'text-yellow-400'} />;
    case 'parking':
      return <SquareParking size={size} className={className || 'text-slate-400'} />;
    case 'dining':
      return <Utensils size={size} className={className || 'text-rose-400'} />;
    case 'activity':
    case 'tour':
      return <Compass size={size} className={className || 'text-emerald-400'} />;
    case 'event':
      return <Calendar size={size} className={className || 'text-purple-400'} />;
    case 'meeting':
      return <Users size={size} className={className || 'text-blue-400'} />;
    case 'attraction':
      return <MapPin size={size} className={className || 'text-pink-400'} />;
    case 'ticket':
      return <Ticket size={size} className={className || 'text-violet-400'} />;
    case 'insurance':
      return <ShieldCheck size={size} className={className || 'text-emerald-300'} />;
    case 'visa_appointment':
      return <FileCheck size={size} className={className || 'text-cyan-300'} />;
    case 'custom_note':
      return <StickyNote size={size} className={className || 'text-amber-300'} />;
    default:
      return <Bookmark size={size} className={className || 'text-slate-400'} />;
  }
};

export const getPlanTypeLabel = (type: PlanCategory | string): string => {
  const map: Record<string, string> = {
    flight: 'Flight',
    lodging: 'Hotel / Stay',
    car_rental: 'Rental Car',
    rail: 'Train',
    bus: 'Bus',
    ferry: 'Ferry',
    cruise: 'Cruise',
    rideshare: 'Rideshare / Taxi',
    parking: 'Parking',
    dining: 'Restaurant',
    activity: 'Activity',
    event: 'Event',
    meeting: 'Meeting',
    tour: 'Tour',
    attraction: 'Attraction',
    ticket: 'Ticket',
    insurance: 'Travel Insurance',
    visa_appointment: 'Visa Appointment',
    custom_note: 'Custom Note',
    generic_reservation: 'Reservation',
  };
  return map[type] || 'Travel Plan';
};
