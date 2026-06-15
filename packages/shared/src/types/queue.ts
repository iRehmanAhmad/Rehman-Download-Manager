export type QueueType = 'main' | 'sync' | 'custom';
export type ScheduleType = 'one-time' | 'periodic';

export interface QueueSettings {
  id: string;
  name: string;
  type: QueueType;
  
  // Schedule
  scheduleType: ScheduleType;
  startOnStartup: boolean;
  
  // One-time / Daily settings
  startAt?: string; // HH:mm format
  runOnceAt?: string; // YYYY-MM-DD
  runDaily: boolean;
  daysOfWeek: number[]; // 0-6 (Sun-Sat)
  
  // Periodic sync settings
  startEveryHours?: number;
  startEveryMinutes?: number;
  
  stopAt?: string; // HH:mm format
  retries: number;
  
  // Post-download actions
  openFileWhenDone?: string;
  hangUpModem: boolean;
  exitWhenDone: boolean;
  turnOffComputer: boolean;
  turnOffAction: 'shutdown' | 'restart' | 'sleep' | 'hibernate';
  forceTerminate: boolean;
  
  // Download limits (IDM style, usually a separate settings object but keeping here for simplicity or creating a global limit)
  limitEnabled?: boolean;
  limitMB?: number;
  limitHours?: number;
  limitShowWarning?: boolean;
}
