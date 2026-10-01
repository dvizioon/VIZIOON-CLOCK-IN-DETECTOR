import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { filterLines, logText, type LogFilter, type LogLine } from '../logs/logbook';

const FILTERS: { id: LogFilter; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'event', label: 'Evento' },
  { id: 'clockin', label: 'Clock In' },
];

type Props = {
  lines: LogLine[];
};

export function LogsScreen({ lines }: Props) {
  const [filter, setFilter] = useState<LogFilter>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const visible = filterLines(lines, filter);

  async function onCopy() {
    if (visible.length === 0) {
      setNotice('Nada para copiar.');
      return;
    }
    await Clipboard.setStringAsync(logText(visible));
    setNotice('Copiado.');
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Logs</Text>
          <Pressable onPress={() => void onCopy()} hitSlop={8}>
            <Text style={styles.copy}>Copiar</Text>
          </Pressable>
        </View>
        <View style={styles.filters}>
          {FILTERS.map((item) => {
            const selected = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setFilter(item.id);
                  setNotice(null);
                }}
                style={selected ? styles.chipOn : styles.chip}
              >
                <Text style={selected ? styles.chipLabelOn : styles.chipLabel}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {notice ? <Text style={styles.message}>{notice}</Text> : null}
      </View>
      <FlatList
        data={visible}
        keyExtractor={(line) => line.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {lines.length === 0 ? 'Nenhum log ainda.' : 'Nenhum log nesse filtro.'}
          </Text>
        }
        renderItem={({ item }) => <Text style={styles.line}>{item.text}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 64,
  },
  header: {
    paddingHorizontal: 20,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#102033',
  },
  copy: {
    color: '#2A1B4E',
    fontSize: 16,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: '#e7eef8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOn: {
    backgroundColor: '#2A1B4E',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipLabel: {
    color: '#2A1B4E',
    fontSize: 14,
    fontWeight: '600',
  },
  chipLabelOn: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    color: '#3d4d60',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 8,
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3d4d60',
  },
  line: {
    fontSize: 14,
    lineHeight: 20,
    color: '#102033',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
  },
});
