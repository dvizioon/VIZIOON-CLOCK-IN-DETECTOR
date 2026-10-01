import { File, Paths } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import type { MonitorEvent } from 'clock-in-monitor';

export type LogLine = {
  id: string;
  timestamp: number;
  text: string;
};

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
      text: `${formatStamp(event.timestamp)}  Câmera ${event.cameraId}: ${usage}.${point}`,
    };
  }
  if (event.type === 'onForegroundAppChanged') {
    const point = event.isClockIn ? ' (ponto)' : '';
    return {
      id: eventId(event),
      timestamp: event.timestamp,
      text: `${formatStamp(event.timestamp)}  Primeiro plano: ${event.packageName}${point}`,
    };
  }
  return {
    id: eventId(event),
    timestamp: event.timestamp,
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

export async function downloadLogs(lines: LogLine[]): Promise<string | null> {
  if (lines.length === 0) return 'Nenhum log para salvar.';
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return null;
  const stamp = new Date();
  const part = (value: number) => String(value).padStart(2, '0');
  const name = `ponto-logs-${stamp.getFullYear()}${part(stamp.getMonth() + 1)}${part(stamp.getDate())}-${part(stamp.getHours())}${part(stamp.getMinutes())}`;
  try {
    const uri = await StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      name,
      'text/plain',
    );
    await StorageAccessFramework.writeAsStringAsync(uri, logText(lines));
    return 'Log salvo.';
  } catch {
    return 'Não foi possível salvar o log.';
  }
}
