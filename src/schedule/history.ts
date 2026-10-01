import { dateKey } from './time';
import type { PunchKind, WorkDay } from './types';

const WEEKDAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function startOfWeek(at: number): number {
  const date = new Date(at);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function weekKeys(start: number): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return dateKey(date.getTime());
  });
}

export function weekdayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return WEEKDAY[new Date(year, month - 1, day).getDay()];
}

export function dayLabel(dayKey: string): string {
  const [, month, day] = dayKey.split('-');
  return `${day}/${month}`;
}

export function weekTitle(start: number): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${dayLabel(dateKey(start))} a ${dayLabel(dateKey(end.getTime()))}`;
}

export function monthKey(at = Date.now()): string {
  return dateKey(at).slice(0, 7);
}

export function monthTitle(at = Date.now()): string {
  const label = new Date(at).toLocaleDateString('pt-BR', { month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function punchedCount(days: WorkDay[], prefix: string): number {
  return days.reduce((total, day) => {
    if (!day.dayKey.startsWith(prefix)) return total;
    return total + day.punches.filter((punch) => punch.actualAt != null).length + (day.extras ?? []).length;
  }, 0);
}

export function countsByDay(days: WorkDay[], keys: string[]): { label: string; value: number }[] {
  const byKey = new Map(days.map((day) => [day.dayKey, day]));
  return keys.map((key) => ({
    label: weekdayLabel(key),
    value: (byKey.get(key)?.punches.filter((punch) => punch.actualAt != null).length ?? 0) + (byKey.get(key)?.extras ?? []).length,
  }));
}

export function countsByKind(days: WorkDay[], prefix: string): { label: string; value: number }[] {
  const kinds: { kind: PunchKind; label: string }[] = [
    { kind: 'entry', label: 'Entrada' },
    { kind: 'lunchOut', label: 'Almoço' },
    { kind: 'lunchIn', label: 'Volta' },
    { kind: 'exit', label: 'Saída' },
  ];
  const official = kinds.map(({ kind, label }) => ({
    label,
    value: days.reduce((total, day) => {
      if (!day.dayKey.startsWith(prefix)) return total;
      const punch = day.punches.find((item) => item.kind === kind);
      return total + (punch?.actualAt != null ? 1 : 0);
    }, 0),
  }));
  const extras = days.reduce((total, day) => {
    if (!day.dayKey.startsWith(prefix)) return total;
    return total + (day.extras ?? []).length;
  }, 0);
  return extras > 0 ? [...official, { label: 'Extra', value: extras }] : official;
}
