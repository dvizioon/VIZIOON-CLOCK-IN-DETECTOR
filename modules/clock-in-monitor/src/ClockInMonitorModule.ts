import { NativeModule, requireOptionalNativeModule } from 'expo';

export type ForegroundAppEvent = {
  packageName: string;
  isClockIn: boolean;
  timestamp: number;
};

export type CameraAvailabilityEvent = {
  cameraId: string;
  /** True when the camera is free. False means some app is using it. */
  available: boolean;
  inUse: boolean;
  clockInInForeground: boolean;
  timestamp: number;
};

/**
 * Clock-in is in the foreground and a camera just became busy.
 * The camera API cannot tell facial recognition apart from a QR scan.
 */
export type FacialRecognitionEvent = {
  packageName: string;
  cameraId: string;
  timestamp: number;
};

export type MonitorEvent =
  | ({ type: 'onForegroundAppChanged' } & ForegroundAppEvent)
  | ({ type: 'onCameraAvailabilityChanged' } & CameraAvailabilityEvent)
  | ({ type: 'onFacialRecognitionLikely' } & FacialRecognitionEvent);

export type MonitorStatus = {
  monitoring: boolean;
  usageAccessGranted: boolean;
  targetPackage: string;
  foregroundPackage: string | null;
  clockInInForeground: boolean;
  cameraInUse: boolean;
  cameraIdsInUse: string[];
};

type ClockInMonitorEvents = {
  onForegroundAppChanged(event: ForegroundAppEvent): void;
  onCameraAvailabilityChanged(event: CameraAvailabilityEvent): void;
  onFacialRecognitionLikely(event: FacialRecognitionEvent): void;
};

declare class ClockInMonitorNativeModule extends NativeModule<ClockInMonitorEvents> {
  totvsClockInPackage: string;
  hasUsageAccess(): boolean;
  getStatus(): MonitorStatus;
  getRecentEvents(): MonitorEvent[];
  openUsageAccessSettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  startMonitoring(packageName?: string | null): Promise<string>;
  stopMonitoring(): Promise<boolean>;
  listSystemSounds(kind?: string | null): { title: string; uri: string }[];
  playSystemSound(uri: string, volume: number, kind?: string | null): Promise<boolean>;
  ensureAlertChannel(
    channelId: string,
    soundUri: string,
    vibrate: boolean,
    times: number,
    alarm?: boolean,
  ): Promise<boolean>;
  ensureFullScreenIntent(): Promise<boolean>;
  canDrawOverlay(): Promise<boolean>;
  openOverlaySettings(): Promise<boolean>;
  vibrateAlert(times: number): Promise<boolean>;
  cancelVibration(): Promise<boolean>;
  rememberAlertPlayback(
    soundUri: string,
    alarmUri: string,
    volume: number,
    notice: boolean,
    alarm: boolean,
    alarmSeconds: number,
    vibrate: boolean,
    vibrationCount: number,
  ): Promise<boolean>;
  presentScreenAlert(title: string, message: string): Promise<boolean>;
  moveToBackground(): Promise<boolean>;
  scheduleScreenAlert(at: number, id: number, title: string, message: string): Promise<boolean>;
  cancelScreenAlert(id: number): Promise<boolean>;
  setMonitorNotice(visible: boolean): Promise<boolean>;
}

export default requireOptionalNativeModule<ClockInMonitorNativeModule>('ClockInMonitor');
