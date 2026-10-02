import { fireEvent, render } from '@testing-library/react-native';
import { PunchesScreen, StampPicker } from '../src/components/PunchesScreen';
import { dateKey } from '../src/schedule/time';
import type { PunchKind, WorkDay } from '../src/schedule/types';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => React.createElement(Text, null, name);
});

function dayWith(done: PunchKind[]): WorkDay {
  const kinds: PunchKind[] = ['entry', 'lunchOut', 'lunchIn', 'exit'];
  return {
    dayKey: dateKey(Date.now()),
    extras: [],
    punches: kinds.map((kind, index) => ({
      kind,
      scheduledAt: index + 1,
      actualAt: done.includes(kind) ? index + 1 : null,
      note: '',
      notificationId: null,
      noticeIds: [],
      alarmIds: [],
    })),
  };
}

function pressChoice(view: { getByTestId: (id: string) => { props: { onPress?: () => void } } }, id: string) {
  const node = view.getByTestId(id);
  if (typeof node.props.onPress === 'function') node.props.onPress();
  else fireEvent.press(node as never);
}

describe('Batidas', () => {
  test('o botão fica no card de hoje', async () => {
    const view = await render(
      <PunchesScreen days={[]} onStamp={() => undefined} onExtra={() => undefined} onDelete={() => undefined} onNote={() => undefined} />,
    );

    expect(view.getAllByTestId('bater-ponto')).toHaveLength(1);
    expect(view.getByText('Batida adicional')).toBeTruthy();
  });

  test('sem batida só a entrada está liberada', async () => {
    const onStamp = jest.fn();
    const view = await render(<StampPicker day={undefined} onStamp={onStamp} onClose={() => undefined} />);

    pressChoice(view, 'choice-lunchOut');
    expect(onStamp).not.toHaveBeenCalled();

    pressChoice(view, 'choice-entry');
    expect(onStamp).toHaveBeenCalledWith('entry');
  });

  test('com a entrada batida libera só o horário do almoço', async () => {
    const onStamp = jest.fn();
    const view = await render(<StampPicker day={dayWith(['entry'])} onStamp={onStamp} onClose={() => undefined} />);

    expect(view.getByText('Já batida')).toBeTruthy();
    pressChoice(view, 'choice-entry');
    expect(onStamp).not.toHaveBeenCalled();

    pressChoice(view, 'choice-lunchOut');
    expect(onStamp).toHaveBeenCalledWith('lunchOut');
  });
});
