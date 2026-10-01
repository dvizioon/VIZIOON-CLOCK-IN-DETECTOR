import { fireEvent, render } from '@testing-library/react-native';
import { ensureOverlayPermission } from 'clock-in-monitor';
import { PreviewScreen } from '../src/components/PreviewScreen';
import { startBackgroundPreview } from '../src/schedule/alerts';
import { defaultSettings } from '../src/schedule/types';

jest.mock('clock-in-monitor', () => ({
  ensureOverlayPermission: jest.fn(async () => true),
}));

jest.mock('../src/schedule/alerts', () => ({
  startBackgroundPreview: jest.fn(async () => undefined),
  stopPreview: jest.fn(),
}));

describe('Prévia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('com Na tela desligado não abre a janela', async () => {
    const view = await render(
      <PreviewScreen settings={{ ...defaultSettings, screenAlert: false }} onPreviewSeconds={() => undefined} />,
    );

    expect(view.getByText(/janela no meio da tela está desligada/)).toBeTruthy();
    fireEvent.press(view.getByText('Bater ponto'));

    expect(ensureOverlayPermission).not.toHaveBeenCalled();
    expect(startBackgroundPreview).toHaveBeenCalledWith(expect.objectContaining({ screenAlert: false }));
  });

  test('com Na tela ligado pede a permissão da janela', async () => {
    const view = await render(
      <PreviewScreen settings={{ ...defaultSettings, screenAlert: true }} onPreviewSeconds={() => undefined} />,
    );

    fireEvent.press(view.getByText('Bater ponto'));

    expect(ensureOverlayPermission).toHaveBeenCalled();
  });
});
