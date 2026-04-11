import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { GpsSession } from '../../App';

type Props = {
  sessions: GpsSession[];
};

const ACHIEVEMENTS = [
  {
    id: 1,
    title: '\uD83C\uDF31 \u306F\u3058\u3081\u306E\u4E00\u6B69',
    desc: '\u521D\u3081\u3066\u30E9\u30F3\u3092\u8A18\u9332\u3057\u305F',
    condition: (n: number) => n >= 1,
  },
  {
    id: 2,
    title: '\uD83C\uDFC3 \u30E9\u30F3\u30CA\u30FC',
    desc: '\u7D2F\u8A085\u56DE\u4EE5\u4E0A\u8D70\u3063\u305F',
    condition: (n: number) => n >= 5,
  },
  {
    id: 3,
    title: '\uD83D\uDDFA\uFE0F \u958B\u62D3\u8005',
    desc: '\u7D2F\u8A0810\u56DE\u4EE5\u4E0A\u8D70\u3063\u305F',
    condition: (n: number) => n >= 10,
  },
  {
    id: 4,
    title: '\uD83C\uDF1F \u5730\u5143\u30A6\u30A9\u30FC\u30AB\u30FC',
    desc: '\u7D2F\u8A0820\u56DE\u4EE5\u4E0A\u8D70\u3063\u305F',
    condition: (n: number) => n >= 20,
  },
  {
    id: 5,
    title: '\uD83D\uDC51 \u5730\u56F3\u306E\u738B',
    desc: '\u7D2F\u8A0850\u56DE\u4EE5\u4E0A\u8D70\u3063\u305F',
    condition: (n: number) => n >= 50,
  },
];

export default function AchievementsScreen({ sessions }: Props) {
  const totalRuns = sessions.length;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{'\uD83C\uDFC5 \u79F0\u53F7'}</Text>
      <Text style={styles.subtitle}>
        {'\u7D2F\u8A08\u30E9\u30F3\u6570: '}
        {totalRuns}
        {'\u56DE'}
      </Text>
      {ACHIEVEMENTS.map((a) => {
        const unlocked = a.condition(totalRuns);
        return (
          <View key={a.id} style={[styles.card, !unlocked && styles.locked]}>
            <Text style={[styles.cardTitle, !unlocked && styles.lockedText]}>
              {unlocked ? a.title : '\uD83D\uDD12 ???'}
            </Text>
            <Text style={[styles.cardDesc, !unlocked && styles.lockedText]}>
              {a.desc}
            </Text>
            {unlocked && (
              <Text style={styles.unlockedBadge}>
                {'\u2705 \u89E3\u9664\u6E08\u307F'}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  locked: { backgroundColor: '#eee', opacity: 0.5 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#555' },
  lockedText: { color: '#aaa' },
  unlockedBadge: { fontSize: 12, color: '#27ae60', marginTop: 8, fontWeight: '600' },
});
