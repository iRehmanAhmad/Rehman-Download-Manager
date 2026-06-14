import type { ScheduleEntry } from '@rdm/shared';

const cronCache = new Map<string, CronSchedule>();

class CronSchedule {
  private minutes: Set<number>;
  private hours: Set<number>;
  private daysOfMonth: Set<number>;
  private months: Set<number>;
  private daysOfWeek: Set<number>;
  private cronStr: string;

  constructor(cronExpression: string) {
    this.cronStr = cronExpression;
    const parts = cronExpression.trim().split(/\s+/);
    this.minutes = this.parseField(parts[0] || '*', 0, 59);
    this.hours = this.parseField(parts[1] || '*', 0, 23);
    this.daysOfMonth = this.parseField(parts[2] || '*', 1, 31);
    this.months = this.parseField(parts[3] || '*', 1, 12);
    this.daysOfWeek = this.parseField(parts[4] || '*', 0, 6);
  }

  private parseField(field: string, min: number, max: number): Set<number> {
    const values = new Set<number>();
    if (field === '*') {
      for (let i = min; i <= max; i++) values.add(i);
      return values;
    }
    for (const part of field.split(',')) {
      if (part.includes('/')) {
        const [range, stepStr] = part.split('/');
        const step = parseInt(stepStr) || 1;
        const [rMin, rMax] = range === '*'
          ? [min, max]
          : [parseInt(range.split('-')[0] || String(min)), parseInt(range.split('-')[1] || String(max))];
        for (let i = Math.max(rMin, min); i <= Math.min(rMax, max); i += step) values.add(i);
      } else if (part.includes('-')) {
        const [s, e] = part.split('-').map(Number);
        for (let i = Math.max(s, min); i <= Math.min(e, max); i++) values.add(i);
      } else {
        const v = parseInt(part);
        if (v >= min && v <= max) values.add(v);
      }
    }
    return values;
  }

  matches(date: Date): boolean {
    return (
      this.minutes.has(date.getMinutes()) &&
      this.hours.has(date.getHours()) &&
      this.daysOfMonth.has(date.getDate()) &&
      this.months.has(date.getMonth() + 1) &&
      this.daysOfWeek.has(date.getDay())
    );
  }

  nextRun(after: Date): Date | null {
    const candidate = new Date(after.getTime() + 60000);
    candidate.setSeconds(0, 0);

    for (let i = 0; i < 525600; i++) {
      if (this.matches(candidate)) {
        return new Date(candidate);
      }
      candidate.setMinutes(candidate.getMinutes() + 1);
    }
    return null;
  }
}

export function parseCron(cronExpression: string): CronSchedule {
  const cached = cronCache.get(cronExpression);
  if (cached) return cached;
  const schedule = new CronSchedule(cronExpression);
  cronCache.set(cronExpression, schedule);
  return schedule;
}

export function getNextRun(entry: ScheduleEntry): number | null {
  if (!entry.active) return null;

  if (entry.startTime) {
    const start = parseTimeString(entry.startTime);
    const now = new Date();
    if (now < start) {
      return start.getTime();
    }
  }

  const schedule = parseCron(entry.cronExpression);
  const next = schedule.nextRun(new Date());

  if (next && entry.daysOfWeek) {
    const allowedDays = new Set(entry.daysOfWeek.split(',').map(Number));
    if (!allowedDays.has(next.getDay())) {
      while (next && !allowedDays.has(next.getDay())) {
        next.setDate(next.getDate() + 1);
      }
    }
  }

  if (next && entry.stopTime) {
    const stop = parseTimeString(entry.stopTime);
    if (next > stop) return null;
  }

  return next ? next.getTime() : null;
}

function parseTimeString(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export function isValidCron(expression: string): boolean {
  try {
    parseCron(expression);
    return true;
  } catch {
    return false;
  }
}
