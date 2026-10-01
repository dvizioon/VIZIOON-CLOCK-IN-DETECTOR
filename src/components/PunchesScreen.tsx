import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { dayLabel, startOfWeek, weekKeys, weekTitle, weekdayLabel } from '../schedule/history';
import type { NoteTarget } from '../schedule/day';
import { formatClock } from '../schedule/time';
import { punchTitle, type ExtraPunch, type Punch, type PunchKind, type WorkDay } from '../schedule/types';

const ICONS: Record<PunchKind, 'log-in-outline' | 'restaurant-outline' | 'cafe-outline' | 'log-out-outline'> = {
  entry: 'log-in-outline',
  lunchOut: 'restaurant-outline',
  lunchIn: 'cafe-outline',
  exit: 'log-out-outline',
};

type Props = {
  days: WorkDay[];
  onNote: (dayKey: string, target: NoteTarget, note: string) => void;
};

export function PunchesScreen({ days, onNote }: Props) {
  const [start, setStart] = useState(() => startOfWeek(Date.now()));
  const keys = weekKeys(start);
  const byKey = new Map(days.map((day) => [day.dayKey, day]));

  return (
    <View style={styles.content}>
      <Text style={styles.title}>Batidas</Text>

      <View style={styles.week}>
        <Pressable onPress={() => setStart((current) => current - 7 * 24 * 60 * 60 * 1000)} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#2A1B4E" />
        </Pressable>
        <Text style={styles.weekTitle}>{weekTitle(start)}</Text>
        <Pressable onPress={() => setStart((current) => current + 7 * 24 * 60 * 60 * 1000)} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color="#2A1B4E" />
        </Pressable>
      </View>

      {keys.map((key) => {
        const day = byKey.get(key);
        const recorded = recordedPunches(day);
        return (
          <View key={key} style={styles.day}>
            <View style={styles.dayHead}>
              <Ionicons name="calendar-outline" size={18} color="#2A1B4E" />
              <Text style={styles.dayTitle}>
                {weekdayLabel(key)} · {dayLabel(key)}
              </Text>
            </View>
            {recorded.length === 0 ? (
              <Text style={styles.empty}>Nenhuma batida.</Text>
            ) : (
              recorded.map((item) =>
                item.extra ? (
                  <View key={`extra-${item.extra.at}`} style={styles.punchBlock}>
                    <View style={styles.punch}>
                      <Ionicons name="add-circle-outline" size={18} color="#2A1B4E" />
                      <Text style={styles.punchLabel}>Ponto adicional</Text>
                      <Text style={styles.punchTime}>{formatClock(item.extra.at)}</Text>
                    </View>
                    <NoteField key={`${item.extra.at}:${item.extra.note ?? ''}`} value={item.extra.note ?? ''} onSave={(note) => onNote(key, { at: item.extra.at }, note)} />
                  </View>
                ) : (
                  <View key={item.punch.kind} style={styles.punchBlock}>
                    <View style={styles.punch}>
                      <Ionicons name={ICONS[item.punch.kind]} size={18} color="#2A1B4E" />
                      <Text style={styles.punchLabel}>{punchTitle[item.punch.kind]}</Text>
                      <Text style={styles.punchTime}>{formatClock(item.punch.actualAt as number)}</Text>
                    </View>
                    <NoteField key={`${item.punch.kind}:${item.punch.note ?? ''}`} value={item.punch.note ?? ''} onSave={(note) => onNote(key, { kind: item.punch.kind }, note)} />
                  </View>
                ),
              )
            )}
          </View>
        );
      })}
    </View>
  );
}

type Recorded = { at: number; punch: Punch; extra?: undefined } | { at: number; extra: ExtraPunch; punch?: undefined };

function recordedPunches(day: WorkDay | undefined): Recorded[] {
  if (!day) return [];
  const official = day.punches
    .filter((punch): punch is Punch & { actualAt: number } => punch.actualAt != null)
    .map((punch) => ({ at: punch.actualAt, punch }));
  const extras = (day.extras ?? []).map((extra) => ({ at: extra.at, extra }));
  return [...official, ...extras].sort((left, right) => left.at - right.at);
}

function NoteField({ value, onSave }: { value: string; onSave: (note: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onEndEditing={() => {
        if (text.trim() !== value.trim()) onSave(text);
      }}
      placeholder="Observação"
      placeholderTextColor="#6b7c90"
      style={styles.note}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  back: {
    color: '#2A1B4E',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#102033',
  },
  week: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#102033',
  },
  day: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#102033',
  },
  empty: {
    fontSize: 14,
    color: '#6b7c90',
  },
  punch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  punchLabel: {
    flex: 1,
    fontSize: 15,
    color: '#3d4d60',
  },
  punchTime: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102033',
  },
  punchBlock: {
    gap: 6,
  },
  note: {
    marginLeft: 26,
    borderRadius: 10,
    backgroundColor: '#F4F1FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2A1B4E',
  },
});
