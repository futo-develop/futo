import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { GpsSession } from '../../App';

type StatsScreenProps = {
  sessions: GpsSession[];
  totalGridCount: number;
};

const ACHIEVEMENTS = [
  { title: '\u{1F331} \u306f\u3058\u3081\u306e\u4e00\u6b69', condition: 1 },
  { title: '\u{1F3C3} \u30e9\u30f3\u30ca\u30fc', condition: 5 },
  { title: '\u{1F5FA}\uFE0F \u958b\u62d3\u8005', condition: 10 },
  { title: '\u{1F31F} \u5730\u5143\u30a6\u30a9\u30fc\u30ab\u30fc', condition: 20 },
  { title: '\u{1F451} \u5730\u56f3\u306e\u738b', condition: 50 },
];

export default function StatsScreen({ sessions, totalGridCount }: StatsScreenProps) {
  const totalRuns = sessions.length;
  const totalSeconds = sessions.reduce((acc, s) => acc + (s.endTime - s.startTime) / 1000, 0);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const totalTime = `${String(h).padStart(2,'0')}時間${String(m).padStart(2,'0')}分`;

  // 現在の称号と次の称号を計算
  let currentTitle = ACHIEVEMENTS[0];
  let nextTitle: (typeof ACHIEVEMENTS)[number] | null = ACHIEVEMENTS[1];
  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    if (totalRuns >= ACHIEVEMENTS[i].condition) {
      currentTitle = ACHIEVEMENTS[i];
      nextTitle = ACHIEVEMENTS[i + 1] || null;
    }
  }

  // プログレスバーの計算
  const prevCondition = currentTitle.condition;
  const nextCondition = nextTitle ? nextTitle.condition : currentTitle.condition;
  const progress = nextTitle
    ? (totalRuns - prevCondition) / (nextCondition - prevCondition)
    : 1;
  const barLength = 20;
  const filled = Math.round(progress * barLength);
  const empty = barLength - filled;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{'\u{1F4CA} \u3042\u306a\u305f\u306e\u8a18\u9332'}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>総ラン数</Text>
        <Text style={styles.value}>{totalRuns}回</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>総走行時間</Text>
        <Text style={styles.value}>{totalTime}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>総開拓マス数</Text>
        <Text style={styles.value}>{totalGridCount}マス</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>現在の称号</Text>
        <Text style={styles.titleText}>{currentTitle.title}</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressBar}>
            {'█'.repeat(filled)}{'░'.repeat(empty)}
          </Text>
        </View>
        {nextTitle ? (
          <Text style={styles.nextTitle}>
            {nextTitle.title} まであと{nextCondition - totalRuns}回
          </Text>
        ) : (
          <Text style={styles.nextTitle}>{'\u6700\u9ad8\u79f0\u53f7\u9054\u6210\uff01\u{1F389}'}</Text>
        )}
      </View>
    </ScrollView>
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
    marginBottom: 24,
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
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    fontSize: 18,
    color: '#27ae60',
    letterSpacing: 2,
  },
  nextTitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
});
