import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { nextStampKind, type NoteTarget } from '../schedule/day';
import { dayLabel, startOfWeek, weekKeys, weekTitle, weekdayLabel } from '../schedule/history';
import { todayKey } from '../schedule/storage';
import { formatClock } from '../schedule/time';
import { type Punch, type PunchKind, type WorkDay } from '../schedule/types';

const CHOICES: { kind: PunchKind; label: string; icon: 'log-in' | 'restaurant' | 'cafe' | 'log-out' }[] = [
  { kind: 'entry', label: 'Entrada', icon: 'log-in' },
  { kind: 'lunchOut', label: 'Horário do almoço', icon: 'restaurant' },
  { kind: 'lunchIn', label: 'Saída do almoço', icon: 'cafe' },
  { kind: 'exit', label: 'Saída', icon: 'log-out' },
];

function choiceLabel(kind: PunchKind): string {
  return CHOICES.find((choice) => choice.kind === kind)?.label ?? kind;
}

type Props = {
  days: WorkDay[];
  onNote: (dayKey: string, target: NoteTarget, note: string) => void;
  onStamp: (kind: PunchKind) => void;
  onExtra: () => void;
  onDelete: (dayKey: string, target: NoteTarget) => void;
};

export function PunchesScreen({ days, onNote, onStamp, onExtra, onDelete }: Props) {
  const [start, setStart] = useState(() => startOfWeek(Date.now()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const keys = weekKeys(start);
  const today = todayKey();
  const byKey = new Map(days.map((day) => [day.dayKey, day]));
  const todayDay = byKey.get(today);

  return (
    <View style={styles.content}>
      <Text style={styles.title}>Batidas</Text>
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <StampPicker
          day={todayDay}
          onClose={() => setPickerOpen(false)}
          onStamp={(kind) => {
            setPickerOpen(false);
            onStamp(kind);
          }}
        />
      </Modal>

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
        const extras = day?.extras ?? [];
        return (
          <View key={key} style={styles.day}>
            <View style={styles.dayHead}>
              <Ionicons name="calendar-outline" size={18} color="#2A1B4E" />
              <Text style={styles.dayTitle}>
                {weekdayLabel(key)} · {dayLabel(key)}
              </Text>
            </View>
            {key === today ? (
              <View style={styles.todayActions}>
                <Pressable testID="bater-ponto" style={styles.stamp} onPress={() => setPickerOpen(true)}>
                  <Ionicons name="finger-print" size={28} color="#fff" />
                  <Text style={styles.stampText}>Bater ponto</Text>
                </Pressable>
                <Pressable testID="batida-adicional" style={styles.extraButton} onPress={onExtra}>
                  <Ionicons name="add-circle-outline" size={22} color="#2A1B4E" />
                  <Text style={styles.extraButtonText}>Batida adicional</Text>
                </Pressable>
              </View>
            ) : null}
            {recorded.length === 0 ? (
              <Text style={styles.empty}>Nenhuma batida.</Text>
            ) : (
              recorded.map((punch) => (
                <View key={punch.kind} style={styles.punchBlock}>
                  <View style={styles.punch}>
                    <Ionicons name={CHOICES.find((choice) => choice.kind === punch.kind)?.icon ?? 'time'} size={18} color="#2A1B4E" />
                    <Text style={styles.punchLabel}>{choiceLabel(punch.kind)}</Text>
                    <Text style={styles.punchTime}>{formatClock(punch.actualAt as number)}</Text>
                    <DeleteButton
                      label={choiceLabel(punch.kind)}
                      onPress={() => onDelete(key, { kind: punch.kind })}
                    />
                  </View>
                  <NoteField key={`${punch.kind}:${punch.note ?? ''}`} value={punch.note ?? ''} onSave={(note) => onNote(key, { kind: punch.kind }, note)} />
                </View>
              ))
            )}
            <Text style={styles.extraTitle}>Batidas adicionais</Text>
            {extras.length === 0 ? (
              <Text style={styles.empty}>Nenhuma batida adicional.</Text>
            ) : (
              extras.map((extra) => (
                <View key={`extra-${extra.at}`} style={styles.punchBlock}>
                  <View style={styles.punch}>
                    <Ionicons name="add-circle-outline" size={18} color="#2A1B4E" />
                    <Text style={styles.punchLabel}>Batida adicional</Text>
                    <Text style={styles.punchTime}>{formatClock(extra.at)}</Text>
                    <DeleteButton label="batida adicional" onPress={() => onDelete(key, { at: extra.at })} />
                  </View>
                  <NoteField key={`${extra.at}:${extra.note ?? ''}`} value={extra.note ?? ''} onSave={(note) => onNote(key, { at: extra.at }, note)} />
                </View>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

export function StampPicker({
  day,
  onStamp,
  onClose,
}: {
  day: WorkDay | undefined;
  onStamp: (kind: PunchKind) => void;
  onClose: () => void;
}) {
  const openKind = nextStampKind(day);
  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.backdropTap} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>Qual batida?</Text>
        <View style={styles.choiceGrid}>
          {CHOICES.map((choice) => {
            const enabled = choice.kind === openKind;
            const done = day?.punches.some((punch) => punch.kind === choice.kind && punch.actualAt != null);
            return (
              <Pressable
                key={choice.kind}
                testID={`choice-${choice.kind}`}
                disabled={!enabled}
                accessibilityState={{ disabled: !enabled }}
                style={[styles.choice, enabled ? styles.choiceOn : styles.choiceOff]}
                onPress={() => {
                  if (!enabled) return;
                  onStamp(choice.kind);
                }}
              >
                <Ionicons name={choice.icon} size={28} color={enabled ? '#2A1B4E' : '#9aa8b8'} />
                <Text style={[styles.choiceLabel, !enabled && styles.choiceLabelOff]}>{choice.label}</Text>
                <Text style={styles.choiceState}>{done ? 'Já batida' : enabled ? 'Liberada' : 'Bloqueada'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function recordedPunches(day: WorkDay | undefined): Punch[] {
  if (!day) return [];
  return day.punches
    .filter((punch): punch is Punch & { actualAt: number } => punch.actualAt != null)
    .sort((left, right) => left.actualAt - right.actualAt);
}

function DeleteButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      hitSlop={8}
      onPress={() => {
        Alert.alert('Apagar batida', `Apagar ${label}?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Apagar', style: 'destructive', onPress },
        ]);
      }}
    >
      <Ionicons name="trash-outline" size={18} color="#9b2c2c" />
    </Pressable>
  );
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
  todayActions: {
    gap: 8,
    marginTop: 4,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2A1B4E',
    borderRadius: 16,
    paddingVertical: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 32, 51, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  backdropTap: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#f4f7fb',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#102033',
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choice: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    minHeight: 118,
  },
  choiceOn: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2A1B4E',
  },
  choiceOff: {
    backgroundColor: '#e7edf3',
  },
  choiceLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102033',
  },
  choiceLabelOff: {
    color: '#6b7c90',
  },
  choiceState: {
    fontSize: 12,
    color: '#6b7c90',
  },
  stampText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  extraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2A1B4E',
  },
  extraButtonText: {
    color: '#2A1B4E',
    fontSize: 16,
    fontWeight: '700',
  },
  extraTitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1B4E',
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
