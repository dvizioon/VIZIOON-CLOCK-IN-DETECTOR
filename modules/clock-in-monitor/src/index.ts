import ClockInMonitor from './ClockInMonitorModule';
import type {
  CameraAvailabilityEvent,
  FacialRecognitionEvent,
  ForegroundAppEvent,
} from './ClockInMonitorModule';

/** Package name of TOTVS RH Clock In on Google Play. */
export const TOTVS_CLOCK_IN_PACKAGE = 'com.clockinfieldtools';

const emptySubscription = { remove() {} };

const unavailableStatus = {
  monitoring: false,
  usageAccessGranted: false,
  targetPackage: TOTVS_CLOCK_IN_PACKAGE,
  foregroundPackage: null,
  clockInInForeground: false,
  cameraInUse: false,
  cameraIdsInUse: [] as string[],
};

export function isNativeMonitorAvailable(): boolean {
  return ClockInMonitor != null;
}

function requireMonitor() {
  if (!ClockInMonitor) {
    throw new Error(
      'O módulo ClockInMonitor não está neste app. O Expo Go não inclui módulos nativos do projeto. Feche o Expo Go e rode: npx expo run:android',
    );
  }
  return ClockInMonitor;
}

export function hasUsageAccess(): boolean {
  return ClockInMonitor?.hasUsageAccess() ?? false;
}

export function getStatus() {
  return ClockInMonitor?.getStatus() ?? unavailableStatus;
}

export function getRecentEvents() {
  return ClockInMonitor?.getRecentEvents() ?? [];
}

export function openUsageAccessSettings(): Promise<void> {
  return requireMonitor().openUsageAccessSettings();
}

export function openNotificationSettings(): Promise<void> {
  if (!ClockInMonitor?.openNotificationSettings) return Promise.reject(new Error('indisponível'));
  return ClockInMonitor.openNotificationSettings();
}

export function startMonitoring(packageName: string = TOTVS_CLOCK_IN_PACKAGE): Promise<string> {
  return requireMonitor().startMonitoring(packageName);
}

export function stopMonitoring(): Promise<boolean> {
  return requireMonitor().stopMonitoring();
}

export type SystemSound = {
  title: string;
  uri: string;
};

export type SoundKind = 'notification' | 'alarm';

const fallbackSound: Record<SoundKind, SystemSound> = {
  notification: { title: 'Padrão do Android', uri: '' },
  alarm: { title: 'Alarme do Android', uri: '' },
};

export function listSystemSounds(kind: SoundKind = 'notification'): Promise<SystemSound[]> {
  const fallback = fallbackSound[kind];
  const list = ClockInMonitor?.listSystemSounds;
  if (!list) return Promise.resolve([fallback]);
  return Promise.resolve()
    .then(() => list(kind))
    .then((sounds) => (sounds.length > 0 ? sounds : [fallback]))
    .catch(() => [fallback]);
}

export function playSystemSound(uri: string, volume: number, kind: SoundKind = 'notification'): Promise<boolean> {
  if (!ClockInMonitor?.playSystemSound) return Promise.resolve(false);
  return ClockInMonitor.playSystemSound(uri, volume, kind).catch(() => false);
}

export function ensureAlertChannel(
  channelId: string,
  soundUri: string,
  vibrate: boolean,
  times: number,
  alarm = false,
): Promise<boolean> {
  if (!ClockInMonitor?.ensureAlertChannel) return Promise.resolve(false);
  return ClockInMonitor.ensureAlertChannel(channelId, soundUri, vibrate, times, alarm).catch(() => false);
}

export function ensureFullScreenIntent(): Promise<boolean> {
  if (!ClockInMonitor?.ensureFullScreenIntent) return Promise.resolve(false);
  return ClockInMonitor.ensureFullScreenIntent().catch(() => false);
}

export function canDrawOverlay(): Promise<boolean> {
  if (!ClockInMonitor?.canDrawOverlay) return Promise.resolve(false);
  return ClockInMonitor.canDrawOverlay().catch(() => false);
}

export function openOverlaySettings(): Promise<boolean> {
  if (!ClockInMonitor?.openOverlaySettings) return Promise.resolve(false);
  return ClockInMonitor.openOverlaySettings().catch(() => false);
}

export async function ensureOverlayPermission(): Promise<boolean> {
  if (await canDrawOverlay()) return true;
  await openOverlaySettings();
  return false;
}

export function rememberAlertPlayback(
  soundUri: string,
  alarmUri: string,
  volume: number,
  notice: boolean,
  alarm: boolean,
  alarmSeconds: number,
  vibrate: boolean,
  vibrationCount: number,
): Promise<boolean> {
  if (!ClockInMonitor?.rememberAlertPlayback) return Promise.resolve(false);
  return ClockInMonitor.rememberAlertPlayback(
    soundUri,
    alarmUri,
    volume,
    notice,
    alarm,
    alarmSeconds,
    vibrate,
    vibrationCount,
  ).catch(() => false);
}

export function presentScreenAlert(title: string, message: string): Promise<boolean> {
  if (!ClockInMonitor?.presentScreenAlert) return Promise.resolve(false);
  return ClockInMonitor.presentScreenAlert(title, message).catch(() => false);
}

export function moveToBackground(): Promise<boolean> {
  if (!ClockInMonitor?.moveToBackground) return Promise.resolve(false);
  return ClockInMonitor.moveToBackground().catch(() => false);
}

export function scheduleScreenAlert(at: number, id: number, title: string, message: string): Promise<boolean> {
  if (!ClockInMonitor?.scheduleScreenAlert) return Promise.resolve(false);
  return ClockInMonitor.scheduleScreenAlert(at, id, title, message).catch(() => false);
}

export function setMonitorNotice(visible: boolean): Promise<boolean> {
  if (!ClockInMonitor?.setMonitorNotice) return Promise.resolve(false);
  return ClockInMonitor.setMonitorNotice(visible).catch(() => false);
}

export function cancelScreenAlert(id: number): Promise<boolean> {
  if (!ClockInMonitor?.cancelScreenAlert) return Promise.resolve(false);
  return ClockInMonitor.cancelScreenAlert(id).catch(() => false);
}

export function addForegroundAppListener(listener: (event: ForegroundAppEvent) => void) {
  return ClockInMonitor?.addListener('onForegroundAppChanged', listener) ?? emptySubscription;
}

export function addCameraAvailabilityListener(listener: (event: CameraAvailabilityEvent) => void) {
  return ClockInMonitor?.addListener('onCameraAvailabilityChanged', listener) ?? emptySubscription;
}

export function addFacialRecognitionListener(listener: (event: FacialRecognitionEvent) => void) {
  return ClockInMonitor?.addListener('onFacialRecognitionLikely', listener) ?? emptySubscription;
}

export type {
  CameraAvailabilityEvent,
  FacialRecognitionEvent,
  ForegroundAppEvent,
  MonitorEvent,
  MonitorStatus,
} from './ClockInMonitorModule';
