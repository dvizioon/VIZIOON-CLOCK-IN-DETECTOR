import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LogLine } from '../logs/logbook';

type Props = {
  lines: LogLine[];
  message: string | null;
  saving: boolean;
  onDownload: () => void;
};

export function LogsScreen({ lines, message, saving, onDownload }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Logs</Text>
          <Pressable onPress={onDownload} disabled={saving} hitSlop={8}>
            <Text style={styles.download}>{saving ? 'Salvando…' : 'Baixar'}</Text>
          </Pressable>
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
      <FlatList
        data={lines}
        keyExtractor={(line) => line.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum log ainda.</Text>}
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
  back: {
    color: '#2A1B4E',
    fontSize: 16,
    fontWeight: '600',
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
  download: {
    color: '#2A1B4E',
    fontSize: 16,
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
