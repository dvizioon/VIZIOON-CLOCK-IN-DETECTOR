import type { MonitorEvent } from 'clock-in-monitor';
import { cancelPunchAlert, scheduleDayAlerts } from './alerts';
import { buildDay, exclusive, readDay, readSettings, removeDay, todayKey, writeDay, writeSettings } from './storage';
import { dateKey, alertAt, isInsideWindow, scheduledTimes } from './time';
import { defaultSettings, type ExtraPunch, type PunchKind, type ScheduleSettings, type WorkDay } from './types';

export type ApplyResult = {
  day: WorkDay | null;
  alertWarning: string | null;
  recorded?: string;
  needsChoice?: boolean;
};

function recordedName(kind: PunchKind): string {
  if (kind === 'lunchOut') return 'Horário do almoço';
  if (kind === 'lunchIn') return 'Saída do almoço';
  if (kind === 'exit') return 'Saída';
  return 'Entrada';
}

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

function shellDay(dayKey: string): WorkDay {
  const kinds: PunchKind[] = ['entry', 'lunchOut', 'lunchIn', 'exit'];
  return {
    dayKey,
    extras: [],
    punches: kinds.map((kind) => ({
      kind,
      scheduledAt: 0,
      actualAt: null,
      note: '',
      notificationId: null,
      noticeIds: [],
      alarmIds: [],
    })),
  };
}

async function applyStamp(at: number, deferExtra = false): Promise<ApplyResult> {
  const settings = await readSettings();
  const key = dateKey(at);
  const existing = await readDay(key);
  const entryAt = existing?.punches.find((punch) => punch.kind === 'entry')?.actualAt;

  if (!existing || entryAt == null) {
    if (existing && alreadyRecorded(existing, at)) return { day: existing, alertWarning: null };
    const day = buildDay(key, at, settings);
    day.extras = (existing?.extras ?? []).filter((extra) => !sameMoment(extra.at, at));
    const alertWarning = await scheduleDayAlerts(day, settings);
    await writeDay(day);
    return { day, alertWarning, recorded: recordedName('entry') };
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
    if (deferExtra) return { day: existing, alertWarning: null, needsChoice: true };
    existing.extras.push({ at, note: '' });
    existing.extras.sort((left, right) => left.at - right.at);
    await writeDay(existing);
    return { day: existing, alertWarning: null, recorded: 'Batida adicional' };
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
  return { day: existing, alertWarning, recorded: recordedName(match.kind) };
}

export function registerFacialRecognition(at: number): Promise<ApplyResult> {
  return exclusive(() => applyStamp(at, true));
}

async function writeEntry(at: number): Promise<ApplyResult> {
  const settings = await readSettings();
  const key = dateKey(at);
  const existing = await readDay(key);
  if (existing) {
    for (const punch of existing.punches) {
      await cancelPunchAlert(punch, existing.dayKey);
    }
  }
  const day = buildDay(key, at, settings);
  day.extras = (existing?.extras ?? []).filter((extra) => !sameMoment(extra.at, at));
  const alertWarning = await scheduleDayAlerts(day, settings);
  await writeDay(day);
  return { day, alertWarning, recorded: recordedName('entry') };
}

export function assignEntry(at: number): Promise<ApplyResult> {
  return exclusive(() => writeEntry(at));
}

export function assignLunch(at: number): Promise<ApplyResult> {
  return exclusive(async () => {
    const settings = await readSettings();
    const existing = await readDay(dateKey(at));
    const entryAt = existing?.punches.find((punch) => punch.kind === 'entry')?.actualAt;
    if (!existing || entryAt == null) return writeEntry(at);
    const lunch = existing.punches.find((punch) => punch.kind === 'lunchOut');
    if (!lunch) return { day: existing, alertWarning: null };
    lunch.actualAt = at;
    const back = existing.punches.find((punch) => punch.kind === 'lunchIn');
    if (back && back.actualAt == null) {
      back.scheduledAt = at + settings.lunchHours * 60 * 60 * 1000;
    }
    const alertWarning = await scheduleDayAlerts(existing, settings);
    await writeDay(existing);
    return { day: existing, alertWarning, recorded: recordedName('lunchOut') };
  });
}

const STAMP_ORDER: PunchKind[] = ['entry', 'lunchOut', 'lunchIn', 'exit'];

export function nextStampKind(day: WorkDay | null | undefined): PunchKind | null {
  for (const kind of STAMP_ORDER) {
    const punch = day?.punches.find((item) => item.kind === kind);
    if (punch?.actualAt == null) return kind;
  }
  return null;
}

export function stampKind(kind: PunchKind, at = Date.now()): Promise<ApplyResult> {
  return exclusive(async () => {
    const settings = await readSettings();
    const key = dateKey(at);
    const existing = await readDay(key);
    if (nextStampKind(existing) !== kind) return { day: existing, alertWarning: null };
    if (existing && alreadyRecorded(existing, at)) return { day: existing, alertWarning: null };

    if (kind === 'entry') {
      const day = buildDay(key, at, settings);
      day.extras = (existing?.extras ?? []).filter((extra) => !sameMoment(extra.at, at));
      const alertWarning = await scheduleDayAlerts(day, settings);
      await writeDay(day);
      return { day, alertWarning, recorded: recordedName('entry') };
    }

    if (!existing) return { day: null, alertWarning: null };
    const punch = existing.punches.find((item) => item.kind === kind);
    if (!punch || punch.actualAt != null) return { day: existing, alertWarning: null };
    punch.actualAt = at;
    if (kind === 'lunchOut') {
      const back = existing.punches.find((item) => item.kind === 'lunchIn');
      if (back && back.actualAt == null) {
        back.scheduledAt = at + settings.lunchHours * 60 * 60 * 1000;
      }
    }
    const alertWarning = await scheduleDayAlerts(existing, settings);
    await writeDay(existing);
    return { day: existing, alertWarning, recorded: recordedName(kind) };
  });
}

export function stampExtra(at = Date.now()): Promise<ApplyResult> {
  return exclusive(async () => {
    const key = dateKey(at);
    const existing = (await readDay(key)) ?? shellDay(key);
    if (!existing.extras) existing.extras = [];
    if (alreadyRecorded(existing, at)) return { day: existing, alertWarning: null };
    existing.extras.push({ at, note: '' });
    existing.extras.sort((left, right) => left.at - right.at);
    await writeDay(existing);
    return { day: existing, alertWarning: null, recorded: 'Batida adicional' };
  });
}

export function deletePunch(dayKey: string, target: NoteTarget): Promise<ApplyResult> {
  return exclusive(async () => {
    const day = await readDay(dayKey);
    if (!day) return { day: null, alertWarning: null };
    const settings = await readSettings();

    if (!('kind' in target)) {
      day.extras = (day.extras ?? []).filter((item) => item.at !== target.at);
      const entryAt = day.punches.find((punch) => punch.kind === 'entry')?.actualAt;
      if (entryAt == null && day.extras.length === 0) {
        await removeDay(day.dayKey);
        return { day: null, alertWarning: null };
      }
      await writeDay(day);
      return { day, alertWarning: null };
    }

    const punch = day.punches.find((item) => item.kind === target.kind);
    if (!punch || punch.actualAt == null) return { day, alertWarning: null };

    if (punch.kind === 'entry') {
      for (const item of day.punches) {
        await cancelPunchAlert(item, day.dayKey);
      }
      await removeDay(day.dayKey);
      return { day: null, alertWarning: null };
    }

    punch.actualAt = null;
    punch.note = '';
    if (punch.kind === 'lunchOut') {
      const entryAt = day.punches.find((item) => item.kind === 'entry')?.actualAt;
      const back = day.punches.find((item) => item.kind === 'lunchIn');
      if (entryAt != null && back && back.actualAt == null) {
        back.scheduledAt = scheduledTimes(entryAt, settings).lunchIn;
      }
    }
    const alertWarning = await scheduleDayAlerts(day, settings);
    await writeDay(day);
    return { day, alertWarning };
  });
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
