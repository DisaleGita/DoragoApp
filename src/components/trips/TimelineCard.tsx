import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  MapPin,
  FileText,
  Copy,
  Check,
  MoreVertical,
  Edit2,
  Trash2,
  CopyPlus,
  Bell,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { PlanItem } from '../../types';
import { PlanTypeIcon, getPlanTypeLabel } from '../ui/PlanTypeIcon';
import { formatTimeDisplay } from '../../utils/dateTime';

interface TimelineCardProps {
  plan: PlanItem;
  onEdit: (plan: PlanItem) => void;
  onDelete: (planId: string) => void;
  onDuplicate: (planId: string) => void;
  onAddReminder: (plan: PlanItem) => void;
  onAttachDoc: (plan: PlanItem) => void;
}

export const TimelineCard: React.FC<TimelineCardProps> = ({
  plan,
  onEdit,
  onDelete,
  onDuplicate,
  onAddReminder,
  onAttachDoc,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copiedConf, setCopiedConf] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const details = (plan.details || {}) as any;
  const timeFormatted = formatTimeDisplay(plan.startAtLocal);
  const endTimeFormatted = plan.endAtLocal ? formatTimeDisplay(plan.endAtLocal) : null;

  const handleCopyConfirmation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!plan.confirmationNumber) return;
    navigator.clipboard.writeText(plan.confirmationNumber);
    setCopiedConf(true);
    setTimeout(() => setCopiedConf(false), 2000);
  };

  const handleOpenMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    const query = plan.address || plan.locationName || plan.title;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative group mb-3">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 transition-all duration-200 shadow-sm cursor-pointer"
      >
        {/* Top bar: Time, Category Badge, Confirmation, Actions */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-teal-400 flex items-center gap-1 font-mono">
              <Clock size={12} className="text-teal-500" />
              {timeFormatted}
              {endTimeFormatted && ` → ${endTimeFormatted}`}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 uppercase tracking-wider">
              {getPlanTypeLabel(plan.planType)}
            </span>
            {plan.sourceType === 'ai_import' && (
              <span className="text-[10px] text-teal-400/80 flex items-center gap-0.5" title="Imported via AI">
                <Sparkles size={10} />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {plan.costAmount !== undefined && (
              <span className="text-xs font-semibold text-slate-300">
                {plan.costCurrency === 'USD' ? '$' : `${plan.costCurrency} `}
                {plan.costAmount.toFixed(2)}
              </span>
            )}

            {/* Actions button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="More options"
              >
                <MoreVertical size={16} />
              </button>

              {/* Action Dropdown Menu */}
              {showMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-7 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-30"
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(plan);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Edit2 size={13} className="text-teal-400" /> Edit Plan
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onAddReminder(plan);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Bell size={13} className="text-amber-400" /> Add Reminder
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onAttachDoc(plan);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <FileText size={13} className="text-indigo-400" /> Attach Document
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDuplicate(plan.id);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <CopyPlus size={13} className="text-sky-400" /> Duplicate Plan
                  </button>
                  <div className="h-px bg-slate-700 my-1" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(plan.id);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                  >
                    <Trash2 size={13} /> Delete Plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title & Core info */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700/50 flex items-center justify-center shrink-0 mt-0.5">
            <PlanTypeIcon type={plan.planType} size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-bold text-slate-100 leading-snug">{plan.title}</h4>

            {/* Flight specialized subline */}
            {plan.planType === 'flight' && (details.departureAirport || details.airline) && (
              <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                {details.departureAirport && details.arrivalAirport && (
                  <span className="font-semibold text-teal-300">
                    {details.departureAirport} → {details.arrivalAirport}
                  </span>
                )}
                {details.flightNumber && <span className="text-slate-400">{details.flightNumber}</span>}
                {details.departureGate && (
                  <span className="text-xs px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                    {details.departureGate}
                  </span>
                )}
                {details.seat && <span className="text-slate-400">Seat {details.seat}</span>}
              </div>
            )}

            {/* Hotel / Dining location subline */}
            {(plan.locationName || plan.address) && plan.planType !== 'flight' && (
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
                <MapPin size={12} className="text-slate-500 shrink-0" />
                <span className="truncate">{plan.locationName || plan.address}</span>
              </div>
            )}

            {/* Confirmation number pill */}
            {plan.confirmationNumber && (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={handleCopyConfirmation}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-mono text-slate-300 hover:text-white transition-colors"
                  title="Click to copy confirmation number"
                >
                  <span className="text-slate-500 text-[10px] uppercase font-sans">Conf:</span>
                  <span className="font-bold text-teal-300">{plan.confirmationNumber}</span>
                  {copiedConf ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <Copy size={11} className="text-slate-500" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expandable Extra Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-2"
            >
              {plan.notes && (
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300">
                  <p className="font-medium text-slate-400 text-[11px] uppercase mb-0.5">Notes</p>
                  <p>{plan.notes}</p>
                </div>
              )}

              {/* Action Buttons inside expansion */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(plan.address || plan.locationName) && (
                  <button
                    onClick={handleOpenMaps}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <ExternalLink size={12} className="text-teal-400" /> Open in Maps
                  </button>
                )}
                {plan.contactPhone && (
                  <a
                    href={`tel:${plan.contactPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    Call {plan.contactPhone}
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
