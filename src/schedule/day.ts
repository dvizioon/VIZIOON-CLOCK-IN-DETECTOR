import type { MonitorEvent } from 'clock-in-monitor';
import { scheduleDayAlerts } from './alerts';
import { buildDay, exclusive, readDay, readSettings, todayKey, writeDay, writeSettings } from './storage';
import { dateKey, alertAt, isInsideWindow } from './time';
import { defaultSettings, type ExtraPunch, type PunchKind, type ScheduleSettings, type WorkDay } from './types';

export type ApplyResult = {
  day: WorkDay | null;
  alertWarning: string | null;
};

function clampSettings(settings: ScheduleSettings): ScheduleSettings {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  return {
    workHours: clamp(settings.workHours, 1, 12),
    lunchHours: clamp(settings.lunchHours, 0, 4),
    lunchBeforeMinutes: clamp(Math.round(settings.lunchBeforeMinutes ?? 2), 0, 60),
    lunchAfterMinutes: clamp(Math.round(settings.lunchAfterMinutes ?? 2), 0, 60),
    toleranceBeforeMinutes: clamp(Math.round(settings.toleranceBeforeMinutes), 0, 60),
    toleranceAfterMinutes: clamp(Math.round(settings.toleranceAfterMinutes), 0, 60),
    sound: settings.sound,
    soundUri: settings.soundUri,
    soundTitle: settings.soundTitle || 'Padrão do Android',
    volume: clamp(Math.round(settings.volume), 0, 10),
    vibration: settings.vibration,
    vibrationCount: clamp(Math.round(settings.vibrationCount), 1, 10),
    alarm: settings.alarm,
    alarmUri: settings.alarmUri,
    alarmTitle: settings.alarmTitle || 'Alarme do Android',
    alarmIntervalMinutes: clamp(Math.round(settings.alarmIntervalMinutes), 1, 30),
    alarmTimes: clamp(Math.round(settings.alarmTimes), 1, 10),
    alarmSeconds: clamp(Math.round(settings.alarmSeconds ?? 5), 1, 30),
    alert: settings.alert,
    noticeMessage: (settings.noticeMessage ?? '').trim() || 'Hora de bater o ponto.',
    previewSeconds: clamp(Math.round(settings.previewSeconds ?? 10), 5, 60),
    screenAlert: settings.screenAlert === true,
    showMonitorNotice: settings.showMonitorNotice !== false,
  };
}

function sameMoment(left: number, right: number): boolean {
  return Math.abs(left - right) < 60 * 1000;
}

function alreadyRecorded(day: WorkDay, at: number): boolean {
  const official = day.punches.some((punch) => punch.actualAt != null && sameMoment(punch.actualAt, at));
  const extra = (day.extras ?? []).some((punch) => sameMoment(punch.at, at));
  return official || extra;
}

async function applyStamp(at: number): Promise<ApplyResult> {
  const settings = await readSettings();
  const key = dateKey(at);
  const existing = await readDay(key);

  if (!existing) {
    const day = buildDay(key, at, settings);
    const alertWarning = await scheduleDayAlerts(day, settings);
    await writeDay(day);
    return { day, alertWarning };
  }

  if (!existing.extras) existing.extras = [];
  if (alreadyRecorded(existing, at)) return { day: existing, alertWarning: null };

  const match = existing.punches.find((punch) => {
    if (punch.kind === 'entry' || punch.actualAt != null) return false;
    if (punch.kind === 'lunchIn') return isInsideWindow(at, punch, settings);
    if (punch.kind === 'lunchOut') {
      const entry = existing.punches.find((item) => item.kind === 'entry');
      const exit = existing.punches.find((item) => item.kind === 'exit');
      const afterEntry = entry?.actualAt == null || at >= entry.actualAt + 60 * 1000;
      const beforeExit = exit == null || at < alertAt(exit, settings);
      return afterEntry && beforeExit;
    }
    return isInsideWindow(at, punch, settings);
  });
  if (!match) {
    const entry = existing.punches.find((punch) => punch.kind === 'entry');
    if (entry?.actualAt == null || at < entry.actualAt + 60 * 1000) {
      return { day: existing, alertWarning: null };
    }
    existing.extras.push({ at, note: '' });
    existing.extras.sort((left, right) => left.at - right.at);
    await writeDay(existing);
    return { day: existing, alertWarning: null };
  }

  match.actualAt = at;
  if (match.kind === 'lunchOut') {
    const back = existing.punches.find((punch) => punch.kind === 'lunchIn');
    if (back && back.actualAt == null) {
      back.scheduledAt = at + settings.lunchHours * 60 * 60 * 1000;
    }
  }
  const alertWarning = await scheduleDayAlerts(existing, settings);
  await writeDay(existing);
  return { day: existing, alertWarning };
}

export function registerFacialRecognition(at: number): Promise<ApplyResult> {
  return exclusive(() => applyStamp(at));
}

export function syncTodayFromEvents(events: MonitorEvent[]): Promise<ApplyResult> {
  return exclusive(async () => {
    const today = todayKey();
    const stamps = events
      .filter((event) => event.type === 'onFacialRecognitionLikely' && dateKey(event.timestamp) === today)
      .map((event) => event.timestamp)
      .sort((left, right) => left - right);

    let result: ApplyResult = { day: await readDay(today), alertWarning: null };
    for (const stamp of stamps) {
      result = await applyStamp(stamp);
    }
    return result;
  });
}

export function loadSettings(): Promise<ScheduleSettings> {
  return exclusive(async () => ({ ...defaultSettings, ...(await readSettings()) }));
}

export function saveSettings(settings: ScheduleSettings): Promise<ApplyResult> {
  const nextSettings = clampSettings(settings);
  return exclusive(async () => {
    await writeSettings(nextSettings);
    const today = todayKey();
    const existing = await readDay(today);
    const entryAt = existing?.punches.find((punch) => punch.kind === 'entry')?.actualAt;
    if (!existing || entryAt == null) {
      return { day: existing, alertWarning: null };
    }

    const rebuilt = buildDay(today, entryAt, nextSettings);
    for (const punch of rebuilt.punches) {
      const previous = existing.punches.find((item) => item.kind === punch.kind);
      if (punch.kind !== 'entry' && previous?.actualAt != null) {
        punch.actualAt = previous.actualAt;
      }
      punch.note = previous?.note ?? '';
      punch.notificationId = previous?.notificationId ?? null;
      punch.noticeIds = previous?.noticeIds ?? [];
      punch.alarmIds = previous?.alarmIds ?? [];
    }
    rebuilt.extras = existing.extras ?? [];
    const lunchOutAt = existing.punches.find((punch) => punch.kind === 'lunchOut')?.actualAt;
    const back = rebuilt.punches.find((punch) => punch.kind === 'lunchIn');
    if (lunchOutAt != null && back && back.actualAt == null) {
      back.scheduledAt = lunchOutAt + nextSettings.lunchHours * 60 * 60 * 1000;
    }
    const alertWarning = await scheduleDayAlerts(rebuilt, nextSettings);
    await writeDay(rebuilt);
    return { day: rebuilt, alertWarning };
  });
}

export type NoteTarget = { kind: PunchKind } | { at: number };

export function savePunchNote(dayKey: string, target: NoteTarget, note: string): Promise<void> {
  return exclusive(async () => {
    const day = await readDay(dayKey);
    if (!day) return;
    const text = note.trim();
    if ('kind' in target) {
      const punch = day.punches.find((item) => item.kind === target.kind);
      if (!punch) return;
      punch.note = text;
    } else {
      const extras: ExtraPunch[] = day.extras ?? [];
      const extra = extras.find((item) => item.at === target.at);
      if (!extra) return;
      extra.note = text;
      day.extras = extras;
    }
    await writeDay(day);
  });
}
