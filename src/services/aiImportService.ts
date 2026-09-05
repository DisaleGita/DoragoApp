/**
 * Dorago AI Import Service
 * Connects to server-side Gemini 3.8 Flash Parser and manages plan proposals
 */

import { ParserResult, ExtractedPlanProposal, PlanItem, PlanCategory, Trip } from '../types';
import { TripService } from './tripService';
import { AnalyticsService } from './analyticsService';
import { createUtcTimestamp } from '../utils/dateTime';

export class AiImportService {
  static async parseTravelText(rawText: string, targetTripId?: string): Promise<ParserResult> {
    AnalyticsService.track('import_started', { channel: 'text_paste', textLength: rawText.length });

    try {
      const res = await fetch('/api/ai/parse-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });
      const data: ParserResult = await res.json();

      if (targetTripId && data.plans) {
        // Run duplicate candidate detection
        data.plans = data.plans.map((p) => {
          const dup = TripService.findDuplicateCandidates(targetTripId, {
            planType: p.planType,
            confirmationNumber: p.fields?.confirmationNumber?.value,
            title: p.title,
            date: p.fields?.departureDate?.value || p.fields?.checkInDate?.value,
          });
          if (dup) {
            p.isDuplicate = true;
            p.duplicatePlanId = dup.id;
            p.duplicateReason = `Matches existing plan: ${dup.title} (${dup.confirmationNumber || 'No confirmation'})`;
          }
          return p;
        });
      }

      AnalyticsService.track('import_completed', {
        planCount: data.plans.length,
        overallConfidence: data.overallConfidence,
      });

      return data;
    } catch (err) {
      console.error('AI parser error', err);
      AnalyticsService.track('import_failed', { error: String(err) });
      throw err;
    }
  }

  static async parseTravelFile(file: File, targetTripId?: string): Promise<ParserResult> {
    AnalyticsService.track('import_started', { channel: 'file_upload', fileName: file.name, fileSize: file.size });

    // Convert file to base64
    const base64 = await this.fileToBase64(file);

    try {
      const res = await fetch('/api/ai/parse-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: file.type || 'image/jpeg',
          fileName: file.name,
        }),
      });
      const data: ParserResult = await res.json();

      if (targetTripId && data.plans) {
        data.plans = data.plans.map((p) => {
          const dup = TripService.findDuplicateCandidates(targetTripId, {
            planType: p.planType,
            confirmationNumber: p.fields?.confirmationNumber?.value,
            title: p.title,
            date: p.fields?.departureDate?.value || p.fields?.checkInDate?.value,
          });
          if (dup) {
            p.isDuplicate = true;
            p.duplicatePlanId = dup.id;
            p.duplicateReason = `Matches existing plan: ${dup.title}`;
          }
          return p;
        });
      }

      AnalyticsService.track('import_completed', {
        planCount: data.plans.length,
        overallConfidence: data.overallConfidence,
      });

      return data;
    } catch (err) {
      console.error('File parsing error', err);
      AnalyticsService.track('import_failed', { error: String(err) });
      throw err;
    }
  }

  // Converts accepted proposals into persistent PlanItems
  static acceptProposals(
    proposals: ExtractedPlanProposal[],
    tripId: string,
    userOverrides: Record<string, Record<string, any>> = {}
  ): PlanItem[] {
    const trip = TripService.getTripById(tripId);
    const tripTz = trip?.timezone || 'UTC';
    const createdPlans: PlanItem[] = [];

    for (const proposal of proposals) {
      if (!proposal.selectedForImport) continue;

      const f = proposal.fields || {};
      const overrides = userOverrides[proposal.tempId] || {};

      // Determine local start/end times
      let startAtLocal = overrides.startAtLocal || f.departureDate?.value ? `${f.departureDate.value}T${f.departureTime?.value || '12:00'}` : `${trip?.startDate || '2026-09-18'}T12:00`;
      if (proposal.planType === 'lodging') {
        startAtLocal = overrides.startAtLocal || `${f.checkInDate?.value || trip?.startDate || '2026-09-18'}T${f.checkInTime?.value || '15:00'}`;
      }

      let endAtLocal = overrides.endAtLocal;
      if (!endAtLocal) {
        if (proposal.planType === 'lodging' && f.checkOutDate?.value) {
          endAtLocal = `${f.checkOutDate.value}T${f.checkOutTime?.value || '11:00'}`;
        } else if (f.arrivalDate?.value) {
          endAtLocal = `${f.arrivalDate.value}T${f.arrivalTime?.value || '14:00'}`;
        }
      }

      const planTitle = overrides.title || proposal.title;
      const confNumber = overrides.confirmationNumber !== undefined ? overrides.confirmationNumber : (f.confirmationNumber?.value || undefined);

      const plan: Omit<PlanItem, 'id' | 'versionNumber' | 'createdAt' | 'updatedAt'> = {
        tripId,
        userId: trip?.ownerUserId || 'usr_local',
        planType: (overrides.planType || proposal.planType) as PlanCategory,
        title: planTitle,
        startAtLocal,
        endAtLocal,
        timezone: tripTz,
        startAtUtc: createUtcTimestamp(startAtLocal, tripTz),
        endAtUtc: endAtLocal ? createUtcTimestamp(endAtLocal, tripTz) : undefined,
        isAllDay: false,
        providerName: overrides.providerName || f.airline?.value || f.propertyName?.value || f.providerName?.value,
        confirmationNumber: confNumber,
        locationName: overrides.locationName || f.departureAirport?.value || f.propertyName?.value || f.pickupLocation?.value,
        address: overrides.address || f.address?.value,
        costAmount: overrides.costAmount !== undefined ? Number(overrides.costAmount) : (f.costAmount?.value ? Number(f.costAmount.value) : undefined),
        costCurrency: overrides.costCurrency || f.costCurrency?.value || 'USD',
        notes: overrides.notes || f.notes?.value || '',
        status: 'confirmed',
        sourceType: 'ai_import',
        aiConfidence: proposal.overallConfidence,
        details: this.buildDetailsPayload(proposal, overrides),
        userOverrides: Object.keys(overrides).length > 0 ? { hasUserOverrides: true } : undefined,
      };

      const created = TripService.createPlan(plan);
      createdPlans.push(created);
    }

    AnalyticsService.track('import_accepted', {
      acceptedCount: createdPlans.length,
      tripId,
    });

    return createdPlans;
  }

  private static buildDetailsPayload(proposal: ExtractedPlanProposal, overrides: Record<string, any>): Record<string, any> {
    const f = proposal.fields || {};
    const details: Record<string, any> = {};

    if (proposal.planType === 'flight') {
      details.airline = overrides.airline || f.airline?.value || '';
      details.flightNumber = overrides.flightNumber || f.flightNumber?.value || '';
      details.departureAirport = overrides.departureAirport || f.departureAirport?.value || '';
      details.arrivalAirport = overrides.arrivalAirport || f.arrivalAirport?.value || '';
      details.departureTerminal = overrides.departureTerminal || f.departureTerminal?.value;
      details.departureGate = overrides.departureGate || f.departureGate?.value;
      details.arrivalTerminal = overrides.arrivalTerminal || f.arrivalTerminal?.value;
      details.arrivalGate = overrides.arrivalGate || f.arrivalGate?.value;
      details.seat = overrides.seat || f.seat?.value;
      details.cabinClass = overrides.cabinClass || f.cabinClass?.value;
      details.recordLocator = overrides.confirmationNumber || f.confirmationNumber?.value;
    } else if (proposal.planType === 'lodging') {
      details.propertyName = overrides.propertyName || f.propertyName?.value || '';
      details.address = overrides.address || f.address?.value;
      details.checkInTime = overrides.checkInTime || f.checkInTime?.value;
      details.checkOutTime = overrides.checkOutTime || f.checkOutTime?.value;
      details.roomType = overrides.roomType || f.roomType?.value;
    }

    return details;
  }

  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
}
