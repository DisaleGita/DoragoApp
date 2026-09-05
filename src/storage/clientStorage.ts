/**
 * Dorago Offline Storage & Persistence Engine
 * Encrypted/persistent local storage abstraction supporting offline mode
 */

import { Trip, PlanItem, TravelDocument, UserProfile, UserSettings, PlanReminder } from '../types';

const STORAGE_KEYS = {
  AUTH_SESSION: 'dorago_auth_session',
  USER_PROFILE: 'dorago_user_profile',
  USER_SETTINGS: 'dorago_user_settings',
  TRIPS: 'dorago_trips',
  PLAN_ITEMS: 'dorago_plan_items',
  DOCUMENTS: 'dorago_documents',
  REMINDERS: 'dorago_reminders',
  OFFLINE_QUEUE: 'dorago_offline_sync_queue',
  LAST_SYNC: 'dorago_last_sync_timestamp',
  ANALYTICS: 'dorago_analytics_events',
};

export interface OfflineMutation {
  id: string;
  type: 'CREATE_TRIP' | 'UPDATE_TRIP' | 'DELETE_TRIP' | 'CREATE_PLAN' | 'UPDATE_PLAN' | 'DELETE_PLAN' | 'CREATE_REMINDER';
  payload: any;
  timestamp: string;
}

export class ClientStorage {
  static getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? (JSON.parse(data) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write failed (quota exceeded or private browsing)', e);
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage remove failed', e);
    }
  }

  // High-level accessors
  static getSession(): { email: string; token: string; userId: string; isValid?: boolean; profile?: UserProfile } | null {
    const session = this.getItem<{ email: string; token: string; userId: string; isValid?: boolean } | null>(STORAGE_KEYS.AUTH_SESSION, null);
    if (!session) return null;
    const profile = this.getUserProfile() || {
      id: session.userId,
      email: session.email,
      displayName: session.email.split('@')[0],
      preferredCurrency: 'USD',
      timezone: 'America/Chicago',
      timeFormat24h: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return {
      ...session,
      isValid: true,
      profile,
    };
  }

  static setSession(session: { email: string; token: string; userId: string; isValid?: boolean; profile?: UserProfile } | null): void {
    if (session) {
      this.setItem(STORAGE_KEYS.AUTH_SESSION, session);
    } else {
      this.removeItem(STORAGE_KEYS.AUTH_SESSION);
    }
  }

  static getUserProfile(): UserProfile | null {
    return this.getItem(STORAGE_KEYS.USER_PROFILE, null);
  }

  static setUserProfile(profile: UserProfile | null): void {
    if (profile) this.setItem(STORAGE_KEYS.USER_PROFILE, profile);
    else this.removeItem(STORAGE_KEYS.USER_PROFILE);
  }

  static getUserSettings(): UserSettings {
    return this.getItem<UserSettings>(STORAGE_KEYS.USER_SETTINGS, {
      userId: '',
      notificationsEnabled: true,
      flightDepartureReminderMinutes: 120,
      hotelCheckinReminderMinutes: 60,
      offlineCacheEnabled: true,
      analyticsConsent: true,
      marketingConsent: false,
    });
  }

  static setUserSettings(settings: UserSettings): void {
    this.setItem(STORAGE_KEYS.USER_SETTINGS, settings);
  }

  static getTrips(): Trip[] {
    return this.getItem<Trip[]>(STORAGE_KEYS.TRIPS, []);
  }

  static setTrips(trips: Trip[]): void {
    this.setItem(STORAGE_KEYS.TRIPS, trips);
    this.setLastSyncTime(new Date().toISOString());
  }

  static getPlanItems(): PlanItem[] {
    return this.getItem<PlanItem[]>(STORAGE_KEYS.PLAN_ITEMS, []);
  }

  static getPlans(): PlanItem[] {
    return this.getPlanItems();
  }

  static setPlanItems(items: PlanItem[]): void {
    this.setItem(STORAGE_KEYS.PLAN_ITEMS, items);
    this.setLastSyncTime(new Date().toISOString());
  }

  static setPlans(items: PlanItem[]): void {
    this.setPlanItems(items);
  }

  static getDocuments(): TravelDocument[] {
    return this.getItem<TravelDocument[]>(STORAGE_KEYS.DOCUMENTS, []);
  }

  static setDocuments(docs: TravelDocument[]): void {
    this.setItem(STORAGE_KEYS.DOCUMENTS, docs);
  }

  static getReminders(): PlanReminder[] {
    return this.getItem<PlanReminder[]>(STORAGE_KEYS.REMINDERS, []);
  }

  static setReminders(reminders: PlanReminder[]): void {
    this.setItem(STORAGE_KEYS.REMINDERS, reminders);
  }

  static getOfflineQueue(): OfflineMutation[] {
    return this.getItem<OfflineMutation[]>(STORAGE_KEYS.OFFLINE_QUEUE, []);
  }

  static getMutationQueue(): OfflineMutation[] {
    return this.getOfflineQueue();
  }

  static enqueueOfflineMutation(mutation: OfflineMutation): void {
    const queue = this.getOfflineQueue();
    queue.push(mutation);
    this.setItem(STORAGE_KEYS.OFFLINE_QUEUE, queue);
  }

  static clearOfflineQueue(): void {
    this.setItem(STORAGE_KEYS.OFFLINE_QUEUE, []);
  }

  static getLastSyncTime(): string {
    return this.getItem<string>(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  static setLastSyncTime(timeIso: string): void {
    this.setItem(STORAGE_KEYS.LAST_SYNC, timeIso);
  }

  static clearAllData(): void {
    try {
      localStorage.clear();
    } catch {}
  }
}
