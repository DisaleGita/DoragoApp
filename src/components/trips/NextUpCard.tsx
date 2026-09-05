import React from 'react';
import { motion } from 'motion/react';
import { Clock, ArrowRight, MapPin, ChevronRight } from 'lucide-react';
import { PlanItem, Trip } from '../../types';
import { PlanTypeIcon } from '../ui/PlanTypeIcon';
import { formatTimeDisplay, getRelativeDepartureText } from '../../utils/dateTime';

interface NextUpCardProps {
  plan: PlanItem;
  trip: Trip;
  onPress: () => void;
}

export const NextUpCard: React.FC<NextUpCardProps> = ({ plan, trip, onPress }) => {
  const details = (plan.details || {}) as any;
  const isFlight = plan.planType === 'flight';
  const relativeText = getRelativeDepartureText(plan.startAtUtc);
  const timeFormatted = formatTimeDisplay(plan.startAtLocal);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onPress}
      className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/95 to-teal-950/40 border border-teal-500/30 rounded-2xl p-4.5 shadow-xl shadow-teal-950/20 cursor-pointer mb-6"
    >
      {/* Accent glow corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Eyebrow */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-teal-400">
            Next Up · {trip.title}
          </span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
          {relativeText}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center shrink-0 shadow-inner">
          <PlanTypeIcon type={plan.planType} size={20} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Flight specific layout */}
          {isFlight && details.departureAirport && details.arrivalAirport ? (
            <div>
              <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
                <span>{details.departureAirport}</span>
                <ArrowRight size={14} className="text-slate-500" />
                <span>{details.arrivalAirport}</span>
                {details.flightNumber && (
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    ({details.flightNumber})
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1 font-medium text-teal-200">
                  <Clock size={12} />
                  {timeFormatted}
                </span>
                {details.departureTerminal && (
                  <span className="text-slate-400">{details.departureTerminal}</span>
                )}
                {details.departureGate && (
                  <span className="text-teal-300 font-semibold">{details.departureGate}</span>
                )}
                {details.seat && <span className="text-slate-400">Seat {details.seat}</span>}
              </div>
            </div>
          ) : (
            // Generic plan layout
            <div>
              <h4 className="text-base font-bold text-slate-100 truncate">{plan.title}</h4>
              <div className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1 font-medium text-teal-200">
                  <Clock size={12} />
                  {timeFormatted}
                </span>
                {plan.locationName && (
                  <span className="flex items-center gap-1 text-slate-400 truncate max-w-[180px]">
                    <MapPin size={12} />
                    {plan.locationName}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="self-center pl-1 text-slate-500">
          <ChevronRight size={18} />
        </div>
      </div>
    </motion.div>
  );
};
