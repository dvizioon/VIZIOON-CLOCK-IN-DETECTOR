import { StyleSheet, Text, View } from 'react-native';
import { describePunch, formatClock } from '../schedule/time';
import { punchTitle, type ScheduleSettings, type WorkDay } from '../schedule/types';

export function DayCard({
  day,
  settings,
  alertWarning,
}: {
  day: WorkDay | null;
  settings: ScheduleSettings;
  alertWarning: string | null;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.section}>Batidas de hoje</Text>
      {day == null ? (
        <Text style={styles.body}>
          A entrada será a hora do próximo reconhecimento facial. As outras três batidas são calculadas a partir
          dela.
        </Text>
      ) : (
        day.punches.map((punch) => (
          <View key={punch.kind} style={styles.row}>
            <Text style={styles.rowLabel}>{punchTitle[punch.kind]}</Text>
            <Text style={styles.rowValue}>{formatClock(punch.scheduledAt)}</Text>
            <Text style={styles.detail}>{describePunch(punch, settings)}</Text>
          </View>
        ))
      )}
      {(day?.extras ?? []).map((extra) => (
        <View key={extra.at} style={styles.row}>
          <Text style={styles.rowLabel}>Ponto adicional</Text>
          <Text style={styles.rowValue}>{formatClock(extra.at)}</Text>
          {extra.note ? <Text style={styles.detail}>{extra.note}</Text> : null}
        </View>
      ))}
      {alertWarning ? <Text style={styles.warning}>{alertWarning}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: '#102033',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3d4d60',
  },
  row: {
    gap: 2,
  },
  rowLabel: {
    fontSize: 12,
    color: '#6b7c90',
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#102033',
  },
  detail: {
    fontSize: 14,
    color: '#3d4d60',
  },
  warning: {
    color: '#9b2331',
    fontSize: 14,
    lineHeight: 20,
  },
});
