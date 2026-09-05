import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ParserResult, ExtractedPlanProposal, Trip } from '../../types';
import { PlanTypeIcon, getPlanTypeLabel } from '../ui/PlanTypeIcon';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Check,
  ChevronDown,
  Copy,
  PlusCircle,
  FolderPlus,
} from 'lucide-react';

interface ImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ParserResult | null;
  trips: Trip[];
  onAccept: (
    selectedProposals: ExtractedPlanProposal[],
    targetTripId: string,
    userOverrides: Record<string, Record<string, any>>
  ) => void;
  onCreateTripAndAccept: (
    tripData: any,
    selectedProposals: ExtractedPlanProposal[],
    userOverrides: Record<string, Record<string, any>>
  ) => void;
}

export const ImportReviewModal: React.FC<ImportReviewModalProps> = ({
  isOpen,
  onClose,
  result,
  trips,
  onAccept,
  onCreateTripAndAccept,
}) => {
  if (!result) return null;

  const [proposals, setProposals] = useState<ExtractedPlanProposal[]>(result.plans || []);
  const [selectedTripId, setSelectedTripId] = useState<string>(
    trips.length > 0 ? trips[0].id : 'NEW_TRIP'
  );
  const [newTripTitle, setNewTripTitle] = useState(result.proposedTripTitle || 'My Imported Trip');
  const [newTripDest, setNewTripDest] = useState(result.proposedDestination || 'Destination');
  const [newTripStart, setNewTripStart] = useState(result.proposedStartDate || '2026-09-18');
  const [newTripEnd, setNewTripEnd] = useState(result.proposedEndDate || '2026-09-22');

  // Track field-level user overrides per proposal tempId
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [userOverrides, setUserOverrides] = useState<Record<string, Record<string, any>>>({});

  const toggleSelectPlan = (tempId: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, selectedForImport: !p.selectedForImport } : p))
    );
  };

  const handleFieldOverride = (tempId: string, fieldKey: string, newValue: any) => {
    setUserOverrides((prev) => ({
      ...prev,
      [tempId]: {
        ...(prev[tempId] || {}),
        [fieldKey]: newValue,
      },
    }));
  };

  const selectedCount = proposals.filter((p) => p.selectedForImport).length;

  const handleFinalSubmit = () => {
    const selected = proposals.filter((p) => p.selectedForImport);
    if (selected.length === 0) return;

    if (selectedTripId === 'NEW_TRIP') {
      onCreateTripAndAccept(
        {
          title: newTripTitle,
          primaryDestination: newTripDest,
          startDate: newTripStart,
          endDate: newTripEnd,
          timezone: 'UTC',
          purpose: 'leisure',
        },
        selected,
        userOverrides
      );
    } else {
      onAccept(selected, selectedTripId, userOverrides);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review AI Extracted Plans"
      subtitle={`Dorago parsed ${proposals.length} travel plan${proposals.length > 1 ? 's' : ''} with server-side verification.`}
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Confidence & Provenance Bar */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-teal-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-teal-400" />
            <span className="text-xs text-slate-300">
              Extraction Confidence: <strong>{Math.round((result.overallConfidence || 0.9) * 100)}%</strong>
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {result.parserVersion || 'Gemini 3.8 Flash'}
          </span>
        </div>

        {/* Global Warnings if any */}
        {result.warnings && result.warnings.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle size={14} className="text-amber-400" />
              <span>Parser Notes</span>
            </div>
            {result.warnings.map((w, idx) => (
              <p key={idx} className="text-amber-200/80 pl-5">
                • {w}
              </p>
            ))}
          </div>
        )}

        {/* Destination / Trip Target Assignment */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Assign Plans To Trip
          </label>
          <div className="flex flex-wrap gap-2">
            {trips.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTripId(t.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  selectedTripId === t.id
                    ? 'bg-teal-500/15 border-teal-500 text-teal-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedTripId('NEW_TRIP')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
                selectedTripId === 'NEW_TRIP'
                  ? 'bg-teal-500/15 border-teal-500 text-teal-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlusCircle size={13} /> Create New Trip
            </button>
          </div>

          {/* New Trip Quick Inputs */}
          {selectedTripId === 'NEW_TRIP' && (
            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="New Trip Title"
                value={newTripTitle}
                onChange={(e) => setNewTripTitle(e.target.value)}
              />
              <Input
                label="Destination"
                value={newTripDest}
                onChange={(e) => setNewTripDest(e.target.value)}
              />
              <Input
                label="Start Date"
                type="date"
                value={newTripStart}
                onChange={(e) => setNewTripStart(e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={newTripEnd}
                onChange={(e) => setNewTripEnd(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Extracted Plan Proposal Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold uppercase tracking-wider">Candidate Plans ({proposals.length})</span>
            <span>{selectedCount} selected</span>
          </div>

          {proposals.map((plan) => {
            const isEditing = editingPlanId === plan.tempId;
            const overrides = userOverrides[plan.tempId] || {};
            const f = plan.fields || {};

            return (
              <div
                key={plan.tempId}
                className={`rounded-2xl border p-4 transition-all ${
                  plan.selectedForImport
                    ? 'bg-slate-900/90 border-teal-500/40'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={plan.selectedForImport}
                      onChange={() => toggleSelectPlan(plan.tempId)}
                      className="w-5 h-5 rounded-md border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500 mt-0.5 cursor-pointer"
                    />
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <PlanTypeIcon type={plan.planType} size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                        {overrides.title || plan.title}
                        <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {getPlanTypeLabel(plan.planType)}
                        </span>
                      </h4>
                      <p className="text-xs text-teal-300 font-medium mt-0.5">
                        {f.departureAirport?.value && f.arrivalAirport?.value
                          ? `${f.departureAirport.value} → ${f.arrivalAirport.value}`
                          : f.propertyName?.value || f.providerName?.value || 'Travel Detail'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingPlanId(isEditing ? null : plan.tempId)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
                  >
                    <Edit2 size={13} className="text-teal-400" />
                    <span>{isEditing ? 'Done' : 'Edit'}</span>
                  </button>
                </div>

                {/* Duplicate Warning per PRD Section 27 */}
                {plan.isDuplicate && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-300 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                    <span>
                      <strong>Possible Duplicate:</strong> {plan.duplicateReason}
                    </span>
                  </div>
                )}

                {/* Key Extracted Details Display */}
                {!isEditing ? (
                  <div className="mt-3 pt-3 border-t border-slate-800/70 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {f.confirmationNumber?.value && (
                      <div className="text-slate-300">
                        <span className="text-slate-500 block text-[10px] uppercase">Confirmation:</span>
                        <strong className="font-mono text-teal-300">
                          {overrides.confirmationNumber || f.confirmationNumber.value}
                        </strong>
                      </div>
                    )}
                    {f.departureDate?.value && (
                      <div className="text-slate-300">
                        <span className="text-slate-500 block text-[10px] uppercase">Date & Time:</span>
                        <span>
                          {f.departureDate.value} · {f.departureTime?.value || '12:00'}
                        </span>
                      </div>
                    )}
                    {f.seat?.value && (
                      <div className="text-slate-300">
                        <span className="text-slate-500 block text-[10px] uppercase">Seat:</span>
                        <span>{overrides.seat || f.seat.value}</span>
                      </div>
                    )}
                    {f.costAmount?.value && (
                      <div className="text-slate-300">
                        <span className="text-slate-500 block text-[10px] uppercase">Cost:</span>
                        <span>
                          {f.costCurrency?.value || '$'}
                          {f.costAmount.value}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  // Inline Quick Edit for User Overrides
                  <div className="mt-3 pt-3 border-t border-slate-800/70 space-y-3">
                    <div className="text-[11px] font-bold text-teal-400 uppercase">Edit Extracted Values (User Overrides)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        label="Plan Title"
                        value={overrides.title || plan.title}
                        onChange={(e) => handleFieldOverride(plan.tempId, 'title', e.target.value)}
                      />
                      <Input
                        label="Confirmation Number"
                        value={overrides.confirmationNumber || f.confirmationNumber?.value || ''}
                        onChange={(e) =>
                          handleFieldOverride(plan.tempId, 'confirmationNumber', e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={selectedCount === 0}
            onClick={handleFinalSubmit}
            leftIcon={<CheckCircle2 size={16} />}
          >
            Add {selectedCount} Travel Plan{selectedCount > 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
