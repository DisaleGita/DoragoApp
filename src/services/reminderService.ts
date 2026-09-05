/**
 * Dorago Plan Reminders Service
 * Manages travel alerts and local notifications
 */

import { PlanReminder, PlanItem } from '../types';
import { ClientStorage } from '../storage/clientStorage';
import { AnalyticsService } from './analyticsService';

export class ReminderService {
  static getRemindersForPlan(planId: string): PlanReminder[] {
    return ClientStorage.getReminders().filter((r) => r.planId === planId);
  }

  static createReminder(
    plan: PlanItem,
    type: PlanReminder['reminderType']
  ): PlanReminder {
    const session = ClientStorage.getSession();
    const userId = session?.userId || 'usr_local';

    const planTime = new Date(plan.startAtUtc).getTime();
    let triggerTime = planTime;

    if (type === '1_day_before') triggerTime = planTime - 24 * 60 * 60 * 1000;
    else if (type === '2_hours_before') triggerTime = planTime - 2 * 60 * 60 * 1000;
    else if (type === '1_hour_before') triggerTime = planTime - 60 * 60 * 1000;
    else if (type === '30_min_before') triggerTime = planTime - 30 * 60 * 1000;

    const reminder: PlanReminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      planId: plan.id,
      userId,
      reminderType: type,
      triggerAtUtc: new Date(triggerTime).toISOString(),
      isSent: false,
      createdAt: new Date().toISOString(),
    };

    const reminders = ClientStorage.getReminders();
    reminders.push(reminder);
    ClientStorage.setReminders(reminders);

    AnalyticsService.track('reminder_created', { planType: plan.planType, reminderType: type });

    return reminder;
  }

  static deleteReminder(reminderId: string): boolean {
    const reminders = ClientStorage.getReminders();
    const filtered = reminders.filter((r) => r.id !== reminderId);
    if (filtered.length === reminders.length) return false;

    ClientStorage.setReminders(filtered);
    return true;
  }
}
