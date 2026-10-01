import { StyleSheet, Text, View } from 'react-native';

type Item = {
  label: string;
  value: number;
};

export function Bars({ items }: { items: Item[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.column}>
          <Text style={styles.value}>{item.value}</Text>
          <View style={styles.track}>
            <View style={[styles.bar, { height: 8 + (item.value / max) * 72 }]} />
          </View>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 12,
    color: '#3d4d60',
    fontWeight: '600',
  },
  track: {
    height: 80,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 18,
    borderRadius: 6,
    backgroundColor: '#5E4B8B',
  },
  label: {
    fontSize: 11,
    color: '#6b7c90',
  },
});
