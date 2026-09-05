/**
 * Dorago Trip & Itinerary Operations Service
 * Full CRUD, Timeline Sorting, Next-Up Detection, and Versioning
 */

import { Trip, PlanItem, PlanVersion, TripStatus } from '../types';
import { ClientStorage } from '../storage/clientStorage';
import { OfflineSyncService } from './offlineSyncService';
import { AnalyticsService } from './analyticsService';
import { SEED_TRIPS, SEED_PLANS, SEED_DOCUMENTS } from '../data/seedData';
import { createUtcTimestamp } from '../utils/dateTime';

export class TripService {
  // Ensure default seed data if no trips exist
  static initializeStore(): void {
    const existingTrips = ClientStorage.getTrips();
    if (existingTrips.length === 0) {
      ClientStorage.setTrips(SEED_TRIPS);
      ClientStorage.setPlanItems(SEED_PLANS);
      ClientStorage.setDocuments(SEED_DOCUMENTS);
    }
  }

  // TRIPS CRUD
  static getTrips(): Trip[] {
    this.initializeStore();
    return ClientStorage.getTrips().filter((t) => !t.deletedAt);
  }

  static getAllTrips(): Trip[] {
    return this.getTrips();
  }

  static getTripById(tripId: string): Trip | null {
    const trips = this.getTrips();
    return trips.find((t) => t.id === tripId) || null;
  }

  static createTrip(tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'travelerCount' | 'isArchived' | 'status'> & { status?: TripStatus }): Trip {
    const session = ClientStorage.getSession();
    const userId = session?.userId || 'usr_local';

    const newTrip: Trip = {
      id: `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ownerUserId: userId,
      title: tripData.title,
      primaryDestination: tripData.primaryDestination,
      additionalDestinations: tripData.additionalDestinations || [],
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      timezone: tripData.timezone || 'UTC',
      purpose: tripData.purpose || 'leisure',
      status: tripData.status || 'upcoming',
      coverImageUrl: tripData.coverImageUrl || this.getDefaultCoverImage(tripData.primaryDestination),
      notes: tripData.notes || '',
      travelerCount: tripData.travelers?.length || 1,
      travelers: tripData.travelers || [
        { id: `trav_${Date.now()}`, userId, fullName: 'Primary Traveler', isPrimaryUser: true }
      ],
      isArchived: false,
      planCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const trips = ClientStorage.getTrips();
    trips.unshift(newTrip);
    ClientStorage.setTrips(trips);

    OfflineSyncService.queueMutation('CREATE_TRIP', newTrip);
    AnalyticsService.track('trip_created', { destination: newTrip.primaryDestination, purpose: newTrip.purpose });

    return newTrip;
  }

  static updateTrip(tripId: string, updates: Partial<Trip>): Trip | null {
    const trips = ClientStorage.getTrips();
    const idx = trips.findIndex((t) => t.id === tripId);
    if (idx === -1) return null;

    const updated = {
      ...trips[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    trips[idx] = updated;
    ClientStorage.setTrips(trips);

    OfflineSyncService.queueMutation('UPDATE_TRIP', { tripId, updates });
    AnalyticsService.track('trip_updated', { tripId });
    return updated;
  }

  static archiveTrip(tripId: string, isArchived: boolean = true): Trip | null {
    return this.updateTrip(tripId, { isArchived, status: isArchived ? 'archived' : 'upcoming' });
  }

  static deleteTrip(tripId: string): boolean {
    const trips = ClientStorage.getTrips();
    const idx = trips.findIndex((t) => t.id === tripId);
    if (idx === -1) return false;

    // Soft delete
    trips[idx].deletedAt = new Date().toISOString();
    ClientStorage.setTrips(trips.filter((t) => t.id !== tripId));

    // Also remove associated plans
    const allPlans = ClientStorage.getPlanItems();
    const remainingPlans = allPlans.filter((p) => p.tripId !== tripId);
    ClientStorage.setPlanItems(remainingPlans);

    OfflineSyncService.queueMutation('DELETE_TRIP', { tripId });
    AnalyticsService.track('trip_deleted', { tripId });
    return true;
  }

  // PLANS CRUD
  static getPlansForTrip(tripId: string): PlanItem[] {
    const plans = ClientStorage.getPlanItems().filter((p) => p.tripId === tripId);
    // Sort chronologically by startAtUtc
    return plans.sort((a, b) => new Date(a.startAtUtc).getTime() - new Date(b.startAtUtc).getTime());
  }

  static createPlan(planData: Omit<PlanItem, 'id' | 'versionNumber' | 'createdAt' | 'updatedAt'>): PlanItem {
    const session = ClientStorage.getSession();
    const userId = session?.userId || 'usr_local';

    const newPlan: PlanItem = {
      ...planData,
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: planData.userId || userId,
      versionNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const allPlans = ClientStorage.getPlanItems();
    allPlans.push(newPlan);
    ClientStorage.setPlanItems(allPlans);

    // Update trip plan count and total cost
    this.recomputeTripStats(planData.tripId);

    // Save initial version snapshot
    this.recordPlanVersion(newPlan, 'manual');

    OfflineSyncService.queueMutation('CREATE_PLAN', newPlan);
    AnalyticsService.track('plan_created', { planType: newPlan.planType, tripId: newPlan.tripId });

    return newPlan;
  }

  static updatePlan(planId: string, updates: Partial<PlanItem>, changeSource: 'manual' | 'ai_import' | 'user_override' = 'manual'): PlanItem | null {
    const allPlans = ClientStorage.getPlanItems();
    const idx = allPlans.findIndex((p) => p.id === planId);
    if (idx === -1) return null;

    const previous = allPlans[idx];
    const updated: PlanItem = {
      ...previous,
      ...updates,
      versionNumber: previous.versionNumber + 1,
      updatedAt: new Date().toISOString(),
    };

    allPlans[idx] = updated;
    ClientStorage.setPlanItems(allPlans);

    this.recomputeTripStats(updated.tripId);
    this.recordPlanVersion(updated, changeSource);

    OfflineSyncService.queueMutation('UPDATE_PLAN', { planId, updates });
    AnalyticsService.track('plan_updated', { planId, planType: updated.planType });

    return updated;
  }

  static deletePlan(planId: string): boolean {
    const allPlans = ClientStorage.getPlanItems();
    const idx = allPlans.findIndex((p) => p.id === planId);
    if (idx === -1) return false;

    const tripId = allPlans[idx].tripId;
    allPlans.splice(idx, 1);
    ClientStorage.setPlanItems(allPlans);

    this.recomputeTripStats(tripId);
    OfflineSyncService.queueMutation('DELETE_PLAN', { planId });
    AnalyticsService.track('plan_deleted', { planId });

    return true;
  }

  static duplicatePlan(planId: string): PlanItem | null {
    const allPlans = ClientStorage.getPlanItems();
    const original = allPlans.find((p) => p.id === planId);
    if (!original) return null;

    const copy = {
      ...original,
      title: `${original.title} (Copy)`,
      confirmationNumber: original.confirmationNumber ? `${original.confirmationNumber}-COPY` : undefined,
    };
    return this.createPlan(copy);
  }

  // NEXT UP ITEM CALCULATION
  static getNextUpPlan(tripId?: string): { plan: PlanItem; trip: Trip } | null {
    const trips = this.getTrips();
    const now = Date.now();

    // Check current trips first, or upcoming
    const candidateTrips = tripId ? trips.filter((t) => t.id === tripId) : trips.filter((t) => !t.isArchived);

    let nextItem: { plan: PlanItem; trip: Trip } | null = null;
    let closestDiff = Infinity;

    for (const trip of candidateTrips) {
      const plans = this.getPlansForTrip(trip.id);
      for (const plan of plans) {
        const planTime = new Date(plan.startAtUtc).getTime();
        const diff = planTime - now;

        // Plan is in the future or started within the last 2 hours
        if (diff > -2 * 60 * 60 * 1000 && diff < closestDiff) {
          closestDiff = diff;
          nextItem = { plan, trip };
        }
      }
    }

    // Fallback: If no future plan, pick the earliest plan of the primary trip
    if (!nextItem && candidateTrips.length > 0) {
      const firstTrip = candidateTrips[0];
      const plans = this.getPlansForTrip(firstTrip.id);
      if (plans.length > 0) {
        nextItem = { plan: plans[0], trip: firstTrip };
      }
    }

    return nextItem;
  }

  // DEDUPLICATION CHECK
  static findDuplicateCandidates(tripId: string, candidate: { planType: string; confirmationNumber?: string | null; title: string; date?: string }): PlanItem | null {
    const plans = this.getPlansForTrip(tripId);

    for (const plan of plans) {
      // 1. Exact confirmation number match
      if (candidate.confirmationNumber && plan.confirmationNumber && candidate.confirmationNumber.trim().toUpperCase() === plan.confirmationNumber.trim().toUpperCase()) {
        return plan;
      }

      // 2. Same type + same day + similar title
      if (candidate.planType === plan.planType && candidate.date && plan.startAtLocal.startsWith(candidate.date)) {
        if (this.isFuzzyTitleMatch(candidate.title, plan.title)) {
          return plan;
        }
      }
    }

    return null;
  }

  private static isFuzzyTitleMatch(a: string, b: string): boolean {
    const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanB = b.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanA.includes(cleanB) || cleanB.includes(cleanA);
  }

  private static recomputeTripStats(tripId: string): void {
    const plans = this.getPlansForTrip(tripId);
    const trips = ClientStorage.getTrips();
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    trip.planCount = plans.length;
    const totals: Record<string, number> = {};
    for (const p of plans) {
      if (p.costAmount && p.costCurrency) {
        totals[p.costCurrency] = (totals[p.costCurrency] || 0) + Number(p.costAmount);
      }
    }
    trip.totalCostGrouped = totals;
    ClientStorage.setTrips(trips);
  }

  private static recordPlanVersion(plan: PlanItem, changeSource: 'manual' | 'ai_import' | 'user_override' | 'system'): void {
    const version: PlanVersion = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      planId: plan.id,
      versionNumber: plan.versionNumber,
      changeSource,
      snapshotJson: plan,
      createdAt: new Date().toISOString(),
    };
    try {
      const stored = ClientStorage.getItem<PlanVersion[]>('dorago_plan_versions', []);
      stored.push(version);
      ClientStorage.setItem('dorago_plan_versions', stored);
    } catch {}
  }

  private static getDefaultCoverImage(destination: string): string {
    const d = destination.toLowerCase();
    if (d.includes('san francisco') || d.includes('sfo')) {
      return 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=1200&auto=format&fit=crop';
    }
    if (d.includes('tokyo') || d.includes('japan')) {
      return 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop';
    }
    if (d.includes('paris') || d.includes('france')) {
      return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop';
    }
    if (d.includes('london') || d.includes('uk')) {
      return 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop';
    }
    if (d.includes('new york') || d.includes('nyc')) {
      return 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop';
  }
}
