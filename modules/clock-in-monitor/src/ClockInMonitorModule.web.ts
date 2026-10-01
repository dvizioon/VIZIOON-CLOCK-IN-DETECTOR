import type {
  CameraAvailabilityEvent,
  FacialRecognitionEvent,
  ForegroundAppEvent,
  MonitorEvent,
  MonitorStatus,
} from './ClockInMonitorModule';

const unsupported = () => {
  throw new Error('ClockInMonitor só está disponível no Android.');
};

const ClockInMonitor = {
  totvsClockInPackage: 'com.clockinfieldtools',
  hasUsageAccess: () => false,
  getStatus: (): MonitorStatus => ({
    monitoring: false,
    usageAccessGranted: false,
    targetPackage: 'com.clockinfieldtools',
    foregroundPackage: null,
    clockInInForeground: false,
    cameraInUse: false,
    cameraIdsInUse: [],
  }),
  getRecentEvents: (): MonitorEvent[] => [],
  openUsageAccessSettings: async () => unsupported(),
  openNotificationSettings: async () => unsupported(),
  startMonitoring: async (_packageName?: string | null) => unsupported(),
  stopMonitoring: async () => unsupported(),
  listSystemSounds: () => [],
  playSystemSound: async () => unsupported(),
  ensureAlertChannel: async () => unsupported(),
  ensureFullScreenIntent: async () => unsupported(),
  canDrawOverlay: async () => false,
  openOverlaySettings: async () => unsupported(),
  rememberAlertPlayback: async () => unsupported(),
  presentScreenAlert: async () => unsupported(),
  moveToBackground: async () => unsupported(),
  scheduleScreenAlert: async () => unsupported(),
  cancelScreenAlert: async () => unsupported(),
  setMonitorNotice: async () => unsupported(),
  addListener: (
    _event: 'onForegroundAppChanged' | 'onCameraAvailabilityChanged' | 'onFacialRecognitionLikely',
    _listener: (event: ForegroundAppEvent | CameraAvailabilityEvent | FacialRecognitionEvent) => void,
  ) => ({ remove: () => undefined }),
};

export default ClockInMonitor;
