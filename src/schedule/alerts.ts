import { cancelScreenAlert, ensureAlertChannel, moveToBackground, openNotificationSettings as openNativeNotificationSettings, playSystemSound, presentScreenAlert, rememberAlertPlayback, scheduleScreenAlert } from 'clock-in-monitor';
import { requireOptionalNativeModule } from 'expo';
import { Linking, Platform, Vibration } from 'react-native';
import { exclusive, readDay, writeDay } from './storage';
import { notificationCopy, reminderTimes } from './time';
import { punchTitle, type Punch, type PunchKind, type ScheduleSettings, type WorkDay } from './types';

const STOP_CATEGORY = 'clockpunch';

export function vibrationPattern(times: number): number[] {
  const count = Math.max(0, Math.min(10, Math.round(times)));
  if (count === 0) return [0];
  const pattern: number[] = [];
  for (let index = 0; index < count; index += 1) {
    pattern.push(index === 0 ? 0 : 200, 400);
  }
  return pattern;
}

function channelKey(settings: ScheduleSettings): string {
  const soundKey = settings.sound && settings.alert ? hash(settings.soundUri || 'android') : 'off';
  const pulses = settings.vibration ? settings.vibrationCount : 0;
  return `ponto-${soundKey}-v${pulses}`;
}

function hash(value: string): string {
  let current = 0;
  for (let index = 0; index < value.length; index += 1) {
    current = (current * 31 + value.charCodeAt(index)) >>> 0;
  }
  return current.toString(36);
}

export function screenAlertRequestCode(dayKey: string, kind: string, slot = 0): number {
  let current = 0;
  const value = `${dayKey}:${kind}`;
  for (let index = 0; index < value.length; index += 1) {
    current = (current * 31 + value.charCodeAt(index)) >>> 0;
  }
  return (current % 10000) + 1000 + slot * 10000;
}

export function previewScreenAlert(title: string, message: string): Promise<boolean> {
  return presentScreenAlert(title, message);
}

export function canScheduleAlerts(): boolean {
  return Platform.OS === 'android' && requireOptionalNativeModule('ExpoNotificationScheduler') != null;
}

type NotificationsModule = typeof import('expo-notifications');

let loading: Promise<NotificationsModule | null> | null = null;

function loadNotifications(): Promise<NotificationsModule | null> {
  if (!canScheduleAlerts()) return Promise.resolve(null);
  if (!loading) {
    loading = import('expo-notifications')
      .then(async (Notifications) => {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        await Notifications.setNotificationCategoryAsync(STOP_CATEGORY, [
          {
            identifier: 'stop',
            buttonTitle: 'Parar',
            options: {
              opensAppToForeground: false,
              isDestructive: false,
              isAuthenticationRequired: false,
            },
          },
        ]);
        return Notifications;
      })
      .catch(() => null);
  }
  return loading;
}

function channelId(settings: ScheduleSettings): string {
  return channelKey(settings);
}

async function ensureChannel(Notifications: NotificationsModule, settings: ScheduleSettings): Promise<string> {
  const id = channelId(settings);
  const native = await ensureAlertChannel(
    id,
    settings.sound && settings.alert ? settings.soundUri : 'off',
    settings.vibration,
    settings.vibration ? settings.vibrationCount : 0,
  );
  if (native) return id;

  await Notifications.setNotificationChannelAsync(id, {
    name: 'Alertas de ponto',
    importance: Notifications.AndroidImportance.HIGH,
    ...(settings.sound && settings.alert ? {} : { sound: null }),
    enableVibrate: settings.vibration,
    vibrationPattern: settings.vibration ? vibrationPattern(settings.vibrationCount) : [0],
  });
  return id;
}

export async function readNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  return current.status === 'granted';
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'settings'> {
  const Notifications = await loadNotifications();
  if (!Notifications) return 'denied';
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  if (current.canAskAgain) {
    const asked = await Notifications.requestPermissionsAsync();
    return asked.status === 'granted' ? 'granted' : 'denied';
  }
  return 'settings';
}

export function openNotificationSettings(): Promise<void> {
  return openNativeNotificationSettings().catch(() => Linking.openSettings());
}

export async function ensureAlertPermission(): Promise<string | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) {
    return 'O alerta ainda não está disponível neste aparelho.';
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return null;
  const asked = await Notifications.requestPermissionsAsync();
  if (asked.status === 'granted') return null;
  return 'Ative as notificações para receber o alerta.';
}

export async function cancelPunchAlert(punch: Punch, dayKey?: string): Promise<void> {
  const ids = [punch.notificationId, ...(punch.noticeIds ?? []), ...(punch.alarmIds ?? [])].filter(
    (id): id is string => Boolean(id),
  );
  punch.notificationId = null;
  punch.noticeIds = [];
  punch.alarmIds = [];
  if (dayKey && punch.kind !== 'entry') {
    await Promise.all(
      [0, 1, 2].map((slot) => cancelScreenAlert(screenAlertRequestCode(dayKey, punch.kind, slot))),
    );
  }
  if (ids.length === 0) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Promise.all(
    ids.map(async (id) => {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
      await Notifications.dismissNotificationAsync(id).catch(() => undefined);
    }),
  );
}

export async function scheduleDayAlerts(day: WorkDay, settings: ScheduleSettings): Promise<string | null> {
  const warning = await ensureAlertPermission();
  const Notifications = await loadNotifications();
  for (const punch of day.punches) {
    await cancelPunchAlert(punch, day.dayKey);
  }
  if (!Notifications || warning) return warning;

  const id = await ensureChannel(Notifications, settings);
  await rememberAlertPlayback(
    settings.soundUri,
    settings.alarmUri,
    settings.volume / 10,
    settings.sound && settings.alert,
    settings.alarm,
    settings.alarmSeconds || 5,
    settings.vibration,
    settings.vibrationCount,
  );
  const alarmChannel = settings.alarm ? `alarme-${hash(settings.alarmUri || 'android')}` : null;
  if (alarmChannel) {
    const nativeAlarm = await ensureAlertChannel(alarmChannel, settings.alarmUri, false, 0, true);
    if (!nativeAlarm) {
      await Notifications.setNotificationChannelAsync(alarmChannel, {
        name: 'Alarme de ponto',
        importance: Notifications.AndroidImportance.HIGH,
        enableVibrate: false,
        vibrationPattern: [0],
      });
    }
  }
  const now = Date.now();
  const gap = settings.alarmIntervalMinutes * 60 * 1000;
  for (const punch of day.punches) {
    if (punch.kind === 'entry' || punch.kind === 'lunchOut' || punch.actualAt != null) continue;
    const times = reminderTimes(punch, settings);
    const copy = notificationCopy(punch.kind, punch, settings);
    punch.noticeIds = [];
    for (let index = 0; index < times.length; index += 1) {
      const when = times[index];
      if (when <= now + 1000) continue;
      const noticeId = await Notifications.scheduleNotificationAsync({
        content: {
          title: copy.title,
          body: copy.body,
          categoryIdentifier: STOP_CATEGORY,
          sound: false,
          data: { dayKey: day.dayKey, kind: punch.kind },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(when),
          channelId: id,
        },
      });
      punch.noticeIds.push(noticeId);
      if (settings.screenAlert) {
        await scheduleScreenAlert(when, screenAlertRequestCode(day.dayKey, punch.kind, index), copy.title, copy.body);
      }
    }
    punch.notificationId = punch.noticeIds[0] ?? null;
    punch.alarmIds = [];
    if (!alarmChannel || times.length === 0) continue;
    const first = times[0];
    const last = times[times.length - 1];
    const repeats = punch.kind === 'lunchIn' ? 1 : settings.alarmTimes;
    for (let index = 0; index < repeats; index += 1) {
      const alarmAt = first + index * gap;
      if (alarmAt <= now + 1000 || alarmAt > last) continue;
      const alarmId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Alarme: ${copy.title}`,
          body: copy.body,
          categoryIdentifier: STOP_CATEGORY,
          sticky: true,
          sound: false,
          data: { dayKey: day.dayKey, kind: punch.kind, alarm: true },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(alarmAt),
          channelId: alarmChannel,
        },
      });
      punch.alarmIds.push(alarmId);
    }
  }
  return null;
}

let previewStopTimer: ReturnType<typeof setTimeout> | null = null;
let previewNextTimer: ReturnType<typeof setTimeout> | null = null;
let fallbackId: string | null = null;

function clearPreviewTimers(): void {
  if (previewStopTimer) clearTimeout(previewStopTimer);
  if (previewNextTimer) clearTimeout(previewNextTimer);
  previewStopTimer = null;
  previewNextTimer = null;
}

async function haltPlayback(): Promise<void> {
  await playSystemSound('', 0).catch(() => undefined);
  const identifier = fallbackId;
  fallbackId = null;
  if (!identifier) return;
  const Notifications = await loadNotifications();
  await Notifications?.dismissNotificationAsync(identifier).catch(() => undefined);
}

const PREVIEW_KINDS: PunchKind[] = ['lunchIn', 'exit'];
const PREVIEW_SCREEN_BASE = 90001;
let previewNoticeIds: string[] = [];

async function cancelBackgroundPreview(): Promise<void> {
  const ids = previewNoticeIds;
  previewNoticeIds = [];
  const Notifications = await loadNotifications();
  await Promise.all([
    ...ids.map(async (id) => {
      await Notifications?.cancelScheduledNotificationAsync(id).catch(() => undefined);
      await Notifications?.dismissNotificationAsync(id).catch(() => undefined);
    }),
    ...PREVIEW_KINDS.map((_, index) => cancelScreenAlert(PREVIEW_SCREEN_BASE + index)),
  ]);
}

export async function startBackgroundPreview(settings: ScheduleSettings): Promise<void> {
  await beginPreview();
  await cancelBackgroundPreview();
  const message = (settings.noticeMessage ?? '').trim() || 'Hora de bater o ponto.';
  const gap = (settings.previewSeconds || 10) * 1000;
  const now = Date.now();
  await rememberAlertPlayback(
    settings.soundUri,
    settings.alarmUri,
    settings.volume / 10,
    settings.sound && settings.alert,
    settings.alarm,
    settings.alarmSeconds || 5,
    settings.vibration,
    settings.vibrationCount,
  );
  await Promise.all(
    PREVIEW_KINDS.map((kind, index) =>
      scheduleScreenAlert(now + gap * (index + 1), PREVIEW_SCREEN_BASE + index, punchTitle[kind], message),
    ),
  );
  const Notifications = await loadNotifications();
  if (Notifications && !(await ensureAlertPermission())) {
    const channel = await ensureChannel(Notifications, settings);
    const alarmChannel = settings.alarm ? `alarme-${hash(settings.alarmUri || 'android')}` : null;
    if (alarmChannel) {
      const nativeAlarm = await ensureAlertChannel(alarmChannel, settings.alarmUri, false, 0, true);
      if (!nativeAlarm) {
        await Notifications.setNotificationChannelAsync(alarmChannel, {
          name: 'Alarme de ponto',
          importance: Notifications.AndroidImportance.HIGH,
          enableVibrate: false,
          vibrationPattern: [0],
        });
      }
    }
    for (let index = 0; index < PREVIEW_KINDS.length; index += 1) {
      const when = now + gap * (index + 1);
      const title = punchTitle[PREVIEW_KINDS[index]];
      const noticeId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          categoryIdentifier: STOP_CATEGORY,
          sound: false,
          data: { preview: true },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(when),
          channelId: channel,
        },
      });
      previewNoticeIds.push(noticeId);
      if (alarmChannel) {
        const alarmId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Alarme: ${title}`,
            body: message,
            categoryIdentifier: STOP_CATEGORY,
            sticky: true,
            sound: false,
            data: { preview: true, alarm: true },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(when),
            channelId: alarmChannel,
          },
        });
        previewNoticeIds.push(alarmId);
      }
    }
  }
  await moveToBackground();
}

export function stopPreview(): void {
  clearPreviewTimers();
  Vibration.cancel();
  void haltPlayback();
  void cancelBackgroundPreview();
}

async function beginPreview(): Promise<void> {
  clearPreviewTimers();
  Vibration.cancel();
  await haltPlayback();
}

function silenceAfter(ms: number): void {
  if (previewStopTimer) clearTimeout(previewStopTimer);
  previewStopTimer = setTimeout(() => {
    previewStopTimer = null;
    void playSystemSound('', 0).catch(() => undefined);
  }, ms);
}

async function playFallbackNotification(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  const denied = await ensureAlertPermission();
  if (denied) return false;
  await Notifications.setNotificationChannelAsync('ponto-sistema', {
    name: 'Alertas de ponto',
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: false,
    vibrationPattern: [0],
  });
  const identifier = await Notifications.scheduleNotificationAsync({
    content: { title: 'Toque', sound: false },
    trigger: { channelId: 'ponto-sistema' },
  });
  fallbackId = identifier;
  setTimeout(() => {
    if (fallbackId !== identifier) return;
    fallbackId = null;
    void Notifications.dismissNotificationAsync(identifier).catch(() => undefined);
  }, 2500);
  return true;
}

async function playSelectedSound(settings: ScheduleSettings, alarm = false): Promise<boolean> {
  const played = await playSystemSound(
    alarm ? settings.alarmUri : settings.soundUri,
    settings.volume / 10,
    alarm ? 'alarm' : 'notification',
  );
  if (played) {
    silenceAfter((alarm ? settings.alarmSeconds || 5 : 3) * 1000);
    return true;
  }
  if (alarm) return false;
  return playFallbackNotification();
}

export async function previewSound(settings: ScheduleSettings): Promise<string | null> {
  await beginPreview();
  if (!settings.sound) return 'Ligue o toque para ouvir.';
  if (!settings.alert) return 'Ligue o alerta para o toque aparecer.';
  const played = await playSelectedSound(settings);
  if (!played) return 'Ative as notificações para ouvir o toque.';
  return null;
}

export async function previewAlarm(settings: ScheduleSettings): Promise<string | null> {
  await beginPreview();
  if (!settings.alarm) return 'Ligue o alarme para ouvir.';
  const played = await playSelectedSound(settings, true);
  if (!played) return 'Reinstale o app para ouvir o alarme.';
  return null;
}

export function previewVibration(settings: ScheduleSettings): void {
  stopPreview();
  if (!settings.vibration) return;
  Vibration.vibrate(vibrationPattern(settings.vibrationCount));
}

export async function playConfiguredAlert(settings: ScheduleSettings): Promise<void> {
  await beginPreview();
  if (settings.vibration) Vibration.vibrate(vibrationPattern(settings.vibrationCount));
  const notice = settings.sound && settings.alert;
  if (notice) await playSelectedSound(settings);
  if (!settings.alarm) return;
  previewNextTimer = setTimeout(() => {
    previewNextTimer = null;
    void playSelectedSound(settings, true);
  }, notice ? 3200 : 0);
}

function stopScheduledAlarms(data: Record<string, unknown> | undefined): Promise<void> {
  const dayKey = typeof data?.dayKey === 'string' ? data.dayKey : null;
  const kind = data?.kind;
  if (!dayKey || (kind !== 'lunchOut' && kind !== 'lunchIn' && kind !== 'exit')) return Promise.resolve();
  return exclusive(async () => {
    const day = await readDay(dayKey);
    const punch = day?.punches.find((item) => item.kind === kind);
    if (!day || !punch) return;
    await cancelPunchAlert(punch, dayKey);
    await writeDay(day);
  });
}

export function listenForStopAction(): () => void {
  if (!canScheduleAlerts()) return () => undefined;
  let subscription: { remove: () => void } | null = null;
  let cancelled = false;
  void loadNotifications().then((Notifications) => {
    if (!Notifications || cancelled) return;
    subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier !== 'stop') return;
      const identifier = response.notification.request.identifier;
      void Notifications.dismissNotificationAsync(identifier).catch(() => undefined);
      void stopScheduledAlarms(response.notification.request.content.data);
    });
  });
  return () => {
    cancelled = true;
    subscription?.remove();
  };
}
