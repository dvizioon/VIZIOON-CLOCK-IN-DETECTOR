export type PunchKind = 'entry' | 'lunchOut' | 'lunchIn' | 'exit';

export type Punch = {
  kind: PunchKind;
  scheduledAt: number;
  actualAt: number | null;
  note: string;
  notificationId: string | null;
  noticeIds: string[];
  alarmIds: string[];
};

export type ExtraPunch = {
  at: number;
  note: string;
};

export type WorkDay = {
  dayKey: string;
  punches: Punch[];
  extras: ExtraPunch[];
};

export type ScheduleSettings = {
  workHours: number;
  lunchHours: number;
  lunchBeforeMinutes: number;
  lunchAfterMinutes: number;
  toleranceBeforeMinutes: number;
  toleranceAfterMinutes: number;
  sound: boolean;
  soundUri: string;
  soundTitle: string;
  volume: number;
  vibration: boolean;
  vibrationCount: number;
  alarm: boolean;
  alarmUri: string;
  alarmTitle: string;
  alarmIntervalMinutes: number;
  alarmTimes: number;
  alarmSeconds: number;
  alert: boolean;
  noticeMessage: string;
  previewSeconds: number;
  screenAlert: boolean;
  showMonitorNotice: boolean;
};

export const defaultSettings: ScheduleSettings = {
  workHours: 8,
  lunchHours: 1,
  lunchBeforeMinutes: 2,
  lunchAfterMinutes: 2,
  toleranceBeforeMinutes: 5,
  toleranceAfterMinutes: 5,
  sound: true,
  soundUri: '',
  soundTitle: 'Padrão do Android',
  volume: 10,
  vibration: true,
  vibrationCount: 4,
  alarm: true,
  alarmUri: '',
  alarmTitle: 'Alarme do Android',
  alarmIntervalMinutes: 5,
  alarmTimes: 1,
  alarmSeconds: 5,
  alert: true,
  noticeMessage: 'Hora de bater o ponto.',
  previewSeconds: 10,
  screenAlert: false,
  showMonitorNotice: true,
};

export const punchTitle: Record<PunchKind, string> = {
  entry: 'Entrada',
  lunchOut: 'Saída para o almoço',
  lunchIn: 'Volta do almoço',
  exit: 'Saída',
};
