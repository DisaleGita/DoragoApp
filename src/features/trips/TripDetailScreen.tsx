import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Plus,
  Sparkles,
  Calendar,
  MapPin,
  FileText,
  Info,
  Map as MapIcon,
  MoreVertical,
  Edit,
  Archive,
  Trash2,
  Share2,
  ExternalLink,
  Upload,
  Clock,
  DollarSign,
  Users,
  Copy,
  Check,
  Navigation,
} from 'lucide-react';
import { Trip, PlanItem, TravelDocument } from '../../types';
import { TimelineCard } from '../../components/trips/TimelineCard';
import { Button } from '../../components/ui/Button';
import { formatDateToDayHeader, formatTripDateRange, calculateTripDays } from '../../utils/dateTime';
import { PlanTypeIcon, getPlanTypeLabel } from '../../components/ui/PlanTypeIcon';

interface TripDetailScreenProps {
  trip: Trip;
  plans: PlanItem[];
  documents: TravelDocument[];
  onBack: () => void;
  onAddPlan: () => void;
  onImportToTrip: () => void;
  onEditTrip: () => void;
  onArchiveTrip: () => void;
  onDeleteTrip: () => void;
  onEditPlan: (plan: PlanItem) => void;
  onDeletePlan: (planId: string) => void;
  onDuplicatePlan: (planId: string) => void;
  onAddReminder: (plan: PlanItem) => void;
  onUploadDocument: (file: File, planId?: string) => void;
  onDeleteDocument: (docId: string) => void;
}

type TripTab = 'timeline' | 'documents' | 'map' | 'info';

export const TripDetailScreen: React.FC<TripDetailScreenProps> = ({
  trip,
  plans,
  documents,
  onBack,
  onAddPlan,
  onImportToTrip,
  onEditTrip,
  onArchiveTrip,
  onDeleteTrip,
  onEditPlan,
  onDeletePlan,
  onDuplicatePlan,
  onAddReminder,
  onUploadDocument,
  onDeleteDocument,
}) => {
  const [activeTab, setActiveTab] = useState<TripTab>('timeline');
  const [showMenu, setShowMenu] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Group plans by calendar day (e.g., '2026-09-18')
  const groupedDays = useMemo(() => {
    const groups: Record<string, PlanItem[]> = {};
    for (const plan of plans) {
      const dayKey = plan.startAtLocal.split('T')[0] || trip.startDate;
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(plan);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [plans, trip.startDate]);

  const dateRange = formatTripDateRange(trip.startDate, trip.endDate);
  const daysCount = calculateTripDays(trip.startDate, trip.endDate);

  const handleShareTrip = () => {
    const itineraryText = `✈️ ${trip.title} (${trip.primaryDestination})\nDates: ${dateRange}\nPlans: ${plans.length}\nOrganized with Dorago.`;
    navigator.clipboard.writeText(itineraryText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadDocument(file);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-28 text-slate-100">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-900 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition-colors"
            aria-label="Back to trips"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="truncate max-w-[200px] sm:max-w-xs">
            <h1 className="text-base font-bold text-slate-100 truncate leading-tight">
              {trip.title}
            </h1>
            <p className="text-xs text-slate-400 truncate">{trip.primaryDestination}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShareTrip}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition-colors relative"
            title="Share itinerary"
          >
            {copiedShare ? <Check size={18} className="text-emerald-400" /> : <Share2 size={18} />}
          </button>

          {/* More options dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition-colors"
              aria-label="Trip actions"
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <div
                onClick={() => setShowMenu(false)}
                className="absolute right-0 top-10 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-30"
              >
                <button
                  onClick={onEditTrip}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Edit size={14} className="text-teal-400" /> Edit Trip Details
                </button>
                <button
                  onClick={onArchiveTrip}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Archive size={14} className="text-amber-400" />
                  {trip.isArchived ? 'Unarchive Trip' : 'Archive Trip'}
                </button>
                <div className="h-px bg-slate-800 my-1" />
                <button
                  onClick={onDeleteTrip}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                >
                  <Trash2 size={14} /> Delete Trip
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-4">
        {/* Trip Hero Card */}
        <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800/90 p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                {trip.purpose}
              </span>
              <h2 className="text-xl font-extrabold text-slate-100 mt-2">{trip.primaryDestination}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar size={13} className="text-slate-400" />
                  {dateRange}
                </span>
                <span className="text-slate-600">·</span>
                <span>{daysCount} days</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={onAddPlan}
              >
                Add Plan
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Sparkles size={12} className="text-teal-400" />}
                onClick={onImportToTrip}
              >
                Import AI
              </Button>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs per PRD Section 12 */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 mb-6">
          {(
            [
              { id: 'timeline', label: 'Timeline', icon: Clock },
              { id: 'documents', label: `Docs (${documents.length})`, icon: FileText },
              { id: 'map', label: 'Map / Places', icon: MapIcon },
              { id: 'info', label: 'Trip Info', icon: Info },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-slate-800 text-teal-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: TIMELINE (DEFAULT) */}
        {activeTab === 'timeline' && (
          <div>
            {groupedDays.length === 0 ? (
              <div className="text-center py-12 px-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
                <Clock size={32} className="mx-auto text-slate-500 mb-3" />
                <h3 className="text-base font-bold text-slate-200">No plans in itinerary yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Add flights, hotel stays, restaurants, or import booking confirmations using AI.
                </p>
                <div className="flex justify-center gap-2.5 mt-5">
                  <Button variant="primary" size="sm" onClick={onAddPlan}>
                    Add First Plan
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onImportToTrip}>
                    Import Travel Details
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedDays.map(([dayStr, dayPlans]) => (
                  <div key={dayStr} className="space-y-2.5">
                    {/* Day Group Header per PRD Section 13 */}
                    <div className="sticky top-14 z-10 bg-slate-950/95 backdrop-blur-sm py-1.5 flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-slate-300 font-mono bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                        {formatDateToDayHeader(dayStr)}
                      </span>
                      <div className="h-px bg-slate-800 flex-1" />
                      <span className="text-[11px] font-semibold text-slate-400">
                        {dayPlans.length} plan{dayPlans.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Timeline items for this day */}
                    <div className="space-y-2 pl-1 sm:pl-2">
                      {dayPlans.map((plan) => (
                        <TimelineCard
                          key={plan.id}
                          plan={plan}
                          onEdit={onEditPlan}
                          onDelete={onDeletePlan}
                          onDuplicate={onDuplicatePlan}
                          onAddReminder={onAddReminder}
                          onAttachDoc={() => {
                            // Quick attach document trigger
                            const input = document.getElementById('quick-doc-upload') as HTMLInputElement;
                            input?.click();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DOCUMENTS (Per PRD Section 28) */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Trip Documents</h3>
                <p className="text-xs text-slate-400">Boarding passes, vouchers, QR codes, receipts</p>
              </div>

              <label className="cursor-pointer">
                <input
                  id="quick-doc-upload"
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="application/pdf,image/*"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow transition-all">
                  <Upload size={14} /> Upload Doc
                </span>
              </label>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
                <FileText size={28} className="mx-auto text-slate-500 mb-2" />
                <p className="text-sm font-semibold text-slate-200">No documents attached yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Upload PDF boarding passes, hotel confirmations, receipts or tickets.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{doc.fileName}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="uppercase text-indigo-300 font-semibold">
                            {doc.documentCategory.replace('_', ' ')}
                          </span>
                          <span>·</span>
                          <span>{Math.round(doc.fileSizeBytes / 1024)} KB</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {doc.downloadUrl && (
                        <a
                          href={doc.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-teal-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="View / Download"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MAP / PLACES (Per PRD Section 29) */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Itinerary Places</h3>
                <p className="text-xs text-slate-400">Chronological itinerary locations with maps deep link</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {plans
                .filter((p) => p.locationName || p.address)
                .map((plan, index) => (
                  <div
                    key={plan.id}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold text-xs shrink-0 font-mono">
                        {index + 1}
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-slate-200 truncate">
                          {plan.locationName || plan.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {plan.address || plan.locationName}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const q = plan.address || plan.locationName || plan.title;
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
                          '_blank'
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-teal-300 flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <Navigation size={12} />
                      <span>Directions</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 4: TRIP INFO (Per PRD Section 12 & 40) */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Cost Summary grouped by currency */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <DollarSign size={14} /> Total Trip Cost
              </h4>
              {trip.totalCostGrouped && Object.keys(trip.totalCostGrouped).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(trip.totalCostGrouped).map(([curr, amount]) => (
                    <div key={curr} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{curr} Currency</span>
                      <span className="font-mono font-bold text-slate-100 text-base">
                        {curr === 'USD' ? '$' : `${curr} `}
                        {Number(amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No plan costs recorded yet.</p>
              )}
            </div>

            {/* Travelers */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users size={14} /> Travelers ({trip.travelers?.length || 1})
              </h4>
              <div className="space-y-2">
                {trip.travelers?.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{t.fullName}</span>
                    <span className="text-slate-400">{t.isPrimaryUser ? 'Primary User' : 'Traveler'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* General Notes */}
            {trip.notes && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Trip Notes
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{trip.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
