/**
 * Dorago Date & Time Engine
 * Travel-safe timezone and multi-destination calendar formatting
 */

export function formatDateToDayHeader(dateStr: string): string {
  // dateStr can be 'YYYY-MM-DD' or ISO
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00Z` : dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const dayName = days[d.getUTCDay()];
  const monthName = months[d.getUTCMonth()];
  const dayNum = d.getUTCDate();

  return `${dayName} · ${monthName} ${dayNum}`;
}

export function formatTimeDisplay(localTimeStr: string, is24h: boolean = false): string {
  // localTimeStr: 'YYYY-MM-DDTHH:mm' or 'HH:mm'
  let hours = 0;
  let minutes = 0;

  if (localTimeStr.includes('T')) {
    const timePart = localTimeStr.split('T')[1];
    const parts = timePart.split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  } else if (localTimeStr.includes(':')) {
    const parts = localTimeStr.split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  } else {
    return localTimeStr;
  }

  const padMinutes = minutes.toString().padStart(2, '0');

  if (is24h) {
    return `${hours.toString().padStart(2, '0')}:${padMinutes}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${padMinutes} ${period}`;
}

export function formatTripDateRange(startDate: string, endDate: string): string {
  try {
    const s = new Date(`${startDate}T12:00:00Z`);
    const e = new Date(`${endDate}T12:00:00Z`);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const startMonth = months[s.getUTCMonth()];
    const endMonth = months[e.getUTCMonth()];
    const startDay = s.getUTCDate();
    const endDay = e.getUTCDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}

export function calculateTripDays(startDate: string, endDate: string): number {
  try {
    const s = new Date(`${startDate}T00:00:00Z`).getTime();
    const e = new Date(`${endDate}T00:00:00Z`).getTime();
    const diff = Math.max(0, e - s);
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return 1;
  }
}

export function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function createUtcTimestamp(localDateTime: string, _tz: string = 'UTC'): string {
  // Converts YYYY-MM-DDTHH:mm to UTC string
  try {
    const d = new Date(localDateTime);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function getRelativeDepartureText(startAtUtc: string): string {
  try {
    const target = new Date(startAtUtc).getTime();
    const now = Date.now();
    const diffMs = target - now;

    if (diffMs < 0) {
      const pastMin = Math.abs(Math.floor(diffMs / (1000 * 60)));
      if (pastMin < 60) return `${pastMin}m ago`;
      const pastHours = Math.floor(pastMin / 60);
      if (pastHours < 24) return `${pastHours}h ago`;
      return 'Completed';
    }

    const min = Math.floor(diffMs / (1000 * 60));
    if (min < 60) return `in ${min}m`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `in ${hours}h ${min % 60}m`;
    const days = Math.floor(hours / 24);
    return `in ${days} day${days > 1 ? 's' : ''}`;
  } catch {
    return 'Upcoming';
  }
}
