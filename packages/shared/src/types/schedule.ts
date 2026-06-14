export interface ScheduleEntry {
  id: string;
  name?: string;
  url: string;
  filename?: string;
  categoryId?: string;
  cronExpression: string;
  startTime?: string;
  stopTime?: string;
  daysOfWeek?: string;
  active: boolean;
  lastRun?: number;
  nextRun?: number;
}
