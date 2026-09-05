/**
 * Dorago Privacy-Safe Analytics Service
 * Tracks core product lifecycle events without logging sensitive PII
 */

import { AnalyticsEvent } from '../types';
import { ClientStorage } from '../storage/clientStorage';

export class AnalyticsService {
  private static events: AnalyticsEvent[] = [];

  static track(eventName: string, properties?: Record<string, any>): void {
    const settings = ClientStorage.getUserSettings();
    if (!settings.analyticsConsent) return;

    // Filter out confirmation numbers or private keys
    const sanitizedProps = { ...(properties || {}) };
    delete sanitizedProps.confirmationNumber;
    delete sanitizedProps.recordLocator;
    delete sanitizedProps.ticketNumber;
    delete sanitizedProps.address;

    const event: AnalyticsEvent = {
      eventName,
      properties: sanitizedProps,
      timestamp: new Date().toISOString(),
    };

    this.events.push(event);
    console.log(`[Dorago Analytics] 📊 ${eventName}`, sanitizedProps);

    // Persist batch if needed
    try {
      const stored = ClientStorage.getItem<AnalyticsEvent[]>('dorago_analytics_events', []);
      stored.push(event);
      if (stored.length > 50) stored.splice(0, stored.length - 50);
      ClientStorage.setItem('dorago_analytics_events', stored);
    } catch {}
  }

  static getRecentEvents(): AnalyticsEvent[] {
    return ClientStorage.getItem<AnalyticsEvent[]>('dorago_analytics_events', []);
  }
}
