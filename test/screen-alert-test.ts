import { scheduleScreenAlert } from 'clock-in-monitor';
import { startBackgroundPreview } from '../src/schedule/alerts';
import { defaultSettings } from '../src/schedule/types';

jest.mock('clock-in-monitor', () => ({
  scheduleScreenAlert: jest.fn(async () => true),
  cancelScreenAlert: jest.fn(async () => true),
  rememberAlertPlayback: jest.fn(async () => true),
  moveToBackground: jest.fn(async () => true),
  cancelVibration: jest.fn(async () => true),
  playSystemSound: jest.fn(async () => true),
  ensureAlertChannel: jest.fn(async () => true),
  presentScreenAlert: jest.fn(async () => true),
  vibrateAlert: jest.fn(async () => true),
  openNotificationSettings: jest.fn(async () => undefined),
}));

describe('Prévia e Na tela', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('desligado não agenda a janela', async () => {
    await startBackgroundPreview({ ...defaultSettings, screenAlert: false });
    expect(scheduleScreenAlert).not.toHaveBeenCalled();
  });

  test('ligado agenda a janela da volta e da saída', async () => {
    await startBackgroundPreview({ ...defaultSettings, screenAlert: true });
    expect(scheduleScreenAlert).toHaveBeenCalledTimes(2);
  });
});
