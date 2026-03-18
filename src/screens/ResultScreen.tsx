import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ResultScreenProps = {
  /** 経過時間（秒） */
  elapsedSeconds: number;
  /** 今回通過したグリッド数 */
  gridCount: number;
  /** 地図画面に戻る */
  onBackToMap: () => void;
};

const formatElapsedTime = (elapsedSeconds: number) => {
  const total = Math.max(0, Math.floor(elapsedSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function ResultScreen({
  elapsedSeconds,
  gridCount,
  onBackToMap,
}: ResultScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        お疲れさま！{'\n'}今日も走れた自分、えらい！
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>経過時間</Text>
        <Text style={styles.value}>{formatElapsedTime(elapsedSeconds)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>今回通過したグリッド数</Text>
        <Text style={styles.value}>{gridCount}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={onBackToMap}
      >
        <Text style={styles.buttonText}>地図に戻る</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  message: {
    color: '#000000',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 34,
  },
  section: {
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    color: '#000000',
    fontSize: 14,
    marginBottom: 6,
  },
  value: {
    color: '#000000',
    fontSize: 32,
    fontWeight: '700',
  },
  button: {
    marginTop: 40,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});

