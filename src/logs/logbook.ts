import { File, Paths } from 'expo-file-system';
import type { MonitorEvent } from 'clock-in-monitor';

export type LogKind = 'camera' | 'foreground' | 'event';

export type LogLine = {
  id: string;
  timestamp: number;
  text: string;
  kind?: LogKind;
  clockIn?: boolean;
};

export type LogFilter = 'all' | 'event' | 'clockin';

const MAX_LINES = 2000;
const file = new File(Paths.document, 'clock-logs.json');

function eventId(event: MonitorEvent): string {
  if (event.type === 'onCameraAvailabilityChanged') {
    return `${event.type}-${event.timestamp}-${event.cameraId}-${event.inUse ? '1' : '0'}`;
  }
  if (event.type === 'onForegroundAppChanged') {
    return `${event.type}-${event.timestamp}-${event.packageName}`;
  }
  return `${event.type}-${event.timestamp}-${event.cameraId}`;
}

function formatStamp(at: number): string {
  return new Date(at).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function eventToLine(event: MonitorEvent): LogLine {
  if (event.type === 'onCameraAvailabilityChanged') {
    const usage = event.inUse ? 'em uso' : 'livre';
    const point = event.clockInInForeground ? ' Ponto visível.' : '';
    return {
      id: eventId(event),
      timestamp: event.timestamp,
      kind: 'camera',
      clockIn: event.clockInInForeground,
      text: `${formatStamp(event.timestamp)}  Câmera ${event.cameraId}: ${usage}.${point}`,
    };
  }
  if (event.type === 'onForegroundAppChanged') {
    const point = event.isClockIn ? ' (ponto)' : '';
    return {
      id: eventId(event),
      timestamp: event.timestamp,
      kind: 'foreground',
      clockIn: event.isClockIn,
      text: `${formatStamp(event.timestamp)}  Primeiro plano: ${event.packageName}${point}`,
    };
  }
  return {
    id: eventId(event),
    timestamp: event.timestamp,
    kind: 'event',
    clockIn: true,
    text: `${formatStamp(event.timestamp)}  Reconhecimento facial. Câmera ${event.cameraId}.`,
  };
}

function merge(current: LogLine[], incoming: LogLine[]): LogLine[] {
  const seen = new Set(current.map((line) => line.id));
  const next = current.slice();
  for (const line of incoming) {
    if (seen.has(line.id)) continue;
    seen.add(line.id);
    next.push(line);
  }
  next.sort((left, right) => right.timestamp - left.timestamp);
  return next.slice(0, MAX_LINES);
}

async function readLines(): Promise<LogLine[]> {
  try {
    if (!file.exists) return [];
    const parsed = JSON.parse(await file.text()) as LogLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line) => line && typeof line.id === 'string' && typeof line.text === 'string');
  } catch {
    return [];
  }
}

let memory: LogLine[] | null = null;
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function rememberEvents(events: MonitorEvent[]): Promise<LogLine[]> {
  return enqueue(async () => {
    if (!memory) memory = await readLines();
    const merged = merge(memory, events.map(eventToLine));
    if (merged.length !== memory.length || merged[0]?.id !== memory[0]?.id) {
      memory = merged;
      file.write(JSON.stringify(memory));
    }
    return memory;
  });
}

export function logText(lines: LogLine[]): string {
  return lines.map((line) => line.text).join('\n');
}

function lineKind(line: LogLine): LogKind {
  if (line.kind) return line.kind;
  if (line.text.includes('Reconhecimento facial')) return 'event';
  if (line.text.includes('Câmera')) return 'camera';
  return 'foreground';
}

function lineIsClockIn(line: LogLine): boolean {
  if (typeof line.clockIn === 'boolean') return line.clockIn;
  return (
    line.text.includes('(ponto)') ||
    line.text.includes('Ponto visível') ||
    line.text.includes('Reconhecimento facial')
  );
}

export function filterLines(lines: LogLine[], filter: LogFilter): LogLine[] {
  if (filter === 'event') return lines.filter((line) => lineKind(line) === 'event');
  if (filter === 'clockin') return lines.filter((line) => lineIsClockIn(line));
  return lines;
}
