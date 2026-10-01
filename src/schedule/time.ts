import type { Punch, PunchKind, ScheduleSettings } from './types';
import { punchTitle } from './types';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function dateKey(at: number): string {
  const date = new Date(at);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatClock(at: number): string {
  return new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatHours(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
}

function toleranceMinutes(kind: Punch['kind'], settings: ScheduleSettings): { before: number; after: number } {
  if (kind === 'exit') {
    return { before: settings.toleranceBeforeMinutes, after: settings.toleranceAfterMinutes };
  }
  return { before: settings.lunchBeforeMinutes, after: settings.lunchAfterMinutes };
}

export function alertAt(punch: Punch, settings: ScheduleSettings): number {
  return punch.scheduledAt - toleranceMinutes(punch.kind, settings).before * MINUTE_MS;
}

export function windowEnd(punch: Punch, settings: ScheduleSettings): number {
  return punch.scheduledAt + toleranceMinutes(punch.kind, settings).after * MINUTE_MS;
}

export function reminderTimes(punch: Punch, settings: ScheduleSettings): number[] {
  const { before, after } = toleranceMinutes(punch.kind, settings);
  const times = [punch.scheduledAt];
  if (before > 0) times.push(punch.scheduledAt - before * MINUTE_MS);
  if (after > 0) times.push(punch.scheduledAt + after * MINUTE_MS);
  return [...new Set(times)].sort((left, right) => left - right);
}

export function isInsideWindow(at: number, punch: Punch, settings: ScheduleSettings): boolean {
  return at >= alertAt(punch, settings) && at <= windowEnd(punch, settings);
}

export function describePunch(punch: Punch, settings: ScheduleSettings): string {
  if (punch.actualAt != null) {
    return `Registrada às ${formatClock(punch.actualAt)}`;
  }
  return `Alerta às ${formatClock(alertAt(punch, settings))}. Prevista às ${formatClock(punch.scheduledAt)}.`;
}

export function notificationCopy(kind: PunchKind, _punch: Punch, settings: ScheduleSettings): { title: string; body: string } {
  const message = (settings.noticeMessage ?? '').trim() || 'Hora de bater o ponto.';
  return { title: punchTitle[kind], body: message };
}

export function scheduledTimes(entryAt: number, settings: ScheduleSettings): Record<PunchKind, number> {
  const workMs = settings.workHours * HOUR_MS;
  const lunchMs = settings.lunchHours * HOUR_MS;
  const lunchOut = entryAt + workMs / 2;
  return {
    entry: entryAt,
    lunchOut,
    lunchIn: lunchOut + lunchMs,
    exit: entryAt + workMs + lunchMs,
  };
}
