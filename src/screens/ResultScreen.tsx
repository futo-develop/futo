import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ResultScreenProps = {
  /** 経過時間（秒） */
  elapsedSeconds: number;
  /** 今回のGPS座標（距離計算やグリッド計算に使用） */
  coordinates: { latitude: number; longitude: number }[];
  /** 過去に通過したグリッドID一覧（新規開拓数の計算に使用） */
  previousGridIds: string[];
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

const GRID_SIZE_METERS = 100;
const METERS_PER_DEGREE_LAT = 111320;
const metersPerDegreeLon = (lat: number) =>
  111320 * Math.cos((lat * Math.PI) / 180);

const coordToGridId = (lat: number, lon: number) => {
  const latMeters = lat * METERS_PER_DEGREE_LAT;
  const lonMeters = lon * metersPerDegreeLon(lat);
  const gi = Math.floor(latMeters / GRID_SIZE_METERS);
  const gj = Math.floor(lonMeters / GRID_SIZE_METERS);
  return `${gi}_${gj}`;
};

// 2点間の概算距離（メートル）
const distanceMeters = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const calcDistanceKm = (coords: { latitude: number; longitude: number }[]) => {
  if (coords.length < 2) return 0;
  let meters = 0;
  for (let i = 1; i < coords.length; i += 1) {
    meters += distanceMeters(coords[i - 1], coords[i]);
  }
  return meters / 1000;
};

export default function ResultScreen({
  elapsedSeconds,
  coordinates,
  previousGridIds,
  onBackToMap,
}: ResultScreenProps) {
  const distanceKm = calcDistanceKm(coordinates);

  const currentGridSet = new Set<string>();
  for (const c of coordinates) {
    currentGridSet.add(coordToGridId(c.latitude, c.longitude));
  }
  const previousGridSet = new Set(previousGridIds);
  let newGridCount = 0;
  for (const g of currentGridSet) {
    if (!previousGridSet.has(g)) {
      newGridCount += 1;
    }
  }

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
        <Text style={styles.value}>{currentGridSet.size}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>今回の距離</Text>
        <Text style={styles.value}>{distanceKm.toFixed(2)}km</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>新規開拓</Text>
        <Text style={styles.value}>{newGridCount}マス</Text>
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

