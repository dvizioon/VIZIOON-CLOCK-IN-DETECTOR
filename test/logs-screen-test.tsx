import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { LogsScreen } from '../src/components/LogsScreen';
import type { LogLine } from '../src/logs/logbook';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
}));

const lines: LogLine[] = [
  {
    id: 'evento',
    timestamp: 2,
    kind: 'event',
    clockIn: true,
    text: '01/10  Reconhecimento facial. Câmera 0.',
  },
  {
    id: 'outro',
    timestamp: 1,
    kind: 'foreground',
    clockIn: false,
    text: '01/10  Primeiro plano: com.android.settings',
  },
];

function press(node: { parent: Parameters<typeof fireEvent.press>[0] | null } & Parameters<typeof fireEvent.press>[0]) {
  if (node.parent) {
    fireEvent.press(node.parent);
    return;
  }
  fireEvent.press(node);
}

describe('Logs', () => {
  test('Evento esconde o que não é a batida', async () => {
    const view = await render(<LogsScreen lines={lines} />);

    expect(view.getByText(/com.android.settings/)).toBeTruthy();
    press(view.getByText('Evento'));

    await waitFor(() => {
      expect(view.queryByText(/com.android.settings/)).toBeNull();
    });
    expect(view.getByText(/Reconhecimento facial/)).toBeTruthy();
  });

  test('Copiar leva o texto filtrado', async () => {
    const view = await render(<LogsScreen lines={lines} />);
    press(view.getByText('Evento'));
    await waitFor(() => {
      expect(view.queryByText(/com.android.settings/)).toBeNull();
    });
    press(view.getByText('Copiar'));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('01/10  Reconhecimento facial. Câmera 0.');
  });
});
