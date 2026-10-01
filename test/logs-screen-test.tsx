import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import type { ReactTestInstance } from 'react-test-renderer';
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

function press(node: ReactTestInstance) {
  fireEvent.press(node.parent ?? node);
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
