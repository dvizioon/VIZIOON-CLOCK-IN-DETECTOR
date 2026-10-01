import { File, Paths } from 'expo-file-system';
import { dateKey, scheduledTimes } from './time';
import { defaultSettings, type PunchKind, type ScheduleSettings, type WorkDay } from './types';

type Store = {
  settings: ScheduleSettings;
  days: Record<string, WorkDay>;
};

const file = new File(Paths.document, 'clock-schedule.json');

function emptyStore(): Store {
  return { settings: defaultSettings, days: {} };
}

async function readStore(): Promise<Store> {
  try {
    if (!file.exists) return emptyStore();
    const parsed = JSON.parse(await file.text()) as Partial<Store>;
    if (!parsed.settings || !parsed.days) return emptyStore();
    return {
      settings: { ...defaultSettings, ...parsed.settings },
      days: parsed.days,
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store): void {
  file.write(JSON.stringify(store));
}

let queue: Promise<unknown> = Promise.resolve();

export function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function readSettings(): Promise<ScheduleSettings> {
  return (await readStore()).settings;
}

export async function readDay(dayKey: string): Promise<WorkDay | null> {
  return (await readStore()).days[dayKey] ?? null;
}

export async function writeDay(day: WorkDay, settings?: ScheduleSettings): Promise<void> {
  const store = await readStore();
  if (settings) store.settings = settings;
  store.days[day.dayKey] = day;
  writeStore(store);
}

export async function writeSettings(settings: ScheduleSettings): Promise<void> {
  const store = await readStore();
  store.settings = settings;
  writeStore(store);
}

export function buildDay(dayKey: string, entryAt: number, settings: ScheduleSettings): WorkDay {
  const times = scheduledTimes(entryAt, settings);
  const kinds: PunchKind[] = ['entry', 'lunchOut', 'lunchIn', 'exit'];
  return {
    dayKey,
    extras: [],
    punches: kinds.map((kind) => ({
      kind,
      scheduledAt: times[kind],
      actualAt: kind === 'entry' ? entryAt : null,
      note: '',
      notificationId: null,
      noticeIds: [],
      alarmIds: [],
    })),
  };
}

export function todayKey(now = Date.now()): string {
  return dateKey(now);
}

export function readDays(): Promise<WorkDay[]> {
  return exclusive(async () => {
    const days = (await readStore()).days;
    return Object.values(days).sort((left, right) => left.dayKey.localeCompare(right.dayKey));
  });
}
