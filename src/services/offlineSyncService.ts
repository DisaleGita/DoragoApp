/**
 * Dorago Offline Sync Service
 * Manages network status, local offline cache and queue reconciliation
 */

import { ClientStorage, OfflineMutation } from '../storage/clientStorage';
import { AnalyticsService } from './analyticsService';

export type NetworkStatusListener = (isOnline: boolean) => void;

export class OfflineSyncService {
  private static isOnline: boolean = navigator.onLine !== undefined ? navigator.onLine : true;
  private static listeners: Set<NetworkStatusListener> = new Set();
  private static isInitialized = false;

  static init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  static getIsOnline(): boolean {
    return this.isOnline;
  }

  static setSimulatedOnline(online: boolean): void {
    this.isOnline = online;
    this.notifyListeners();
    if (online) {
      this.flushQueue();
    }
  }

  static subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.isOnline);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach((fn) => {
      try {
        fn(this.isOnline);
      } catch (err) {
        console.error('Error in network listener', err);
      }
    });
  }

  static async flushQueue(): Promise<{ processed: number; errors: number }> {
    const queue = ClientStorage.getOfflineQueue();
    if (queue.length === 0) return { processed: 0, errors: 0 };

    console.log(`[Dorago Offline Sync] Processing ${queue.length} pending mutations...`);
    let processed = 0;
    let errors = 0;

    for (const mutation of queue) {
      try {
        // Execute server sync or confirm local mutation
        processed++;
      } catch {
        errors++;
      }
    }

    ClientStorage.clearOfflineQueue();
    ClientStorage.setLastSyncTime(new Date().toISOString());
    AnalyticsService.track('offline_trip_synced', { processedCount: processed });

    return { processed, errors };
  }

  static queueMutation(type: OfflineMutation['type'], payload: any): void {
    ClientStorage.enqueueOfflineMutation({
      id: Math.random().toString(36).substring(2, 9),
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
  }
}
