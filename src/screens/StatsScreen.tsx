import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { GpsSession } from '../../App';

type StatsScreenProps = {
  sessions: GpsSession[];
};

export default function StatsScreen({ sessions }: StatsScreenProps) {
  const totalRuns = sessions.length;
  const totalSeconds = sessions.reduce((acc, s) => acc + (s.endTime - s.startTime) / 1000, 0);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const totalTime = `${String(h).padStart(2,'0')}時間${String(m).padStart(2,'0')}分`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 あなたの記録</Text>
      <View style={styles.card}>
        <Text style={styles.label}>総ラン数</Text>
        <Text style={styles.value}>{totalRuns}回</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>総走行時間</Text>
        <Text style={styles.value}>{totalTime}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  value: {
    fontSize: 36,
    fontWeight: '700',
  },
});
