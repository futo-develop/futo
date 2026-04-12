import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

type ResultScreenProps = {
  /** 経過時間（秒） */
  elapsedSeconds: number;
  /** 今回のGPS座標（距離計算やグリッド計算に使用） */
  coordinates?: { latitude: number; longitude: number }[];
  /** 過去に通過したグリッドID一覧（新規開拓数の計算に使用） */
  previousGridIds?: string[];
  missionDirection?: string | null;
  missionAchieved?: boolean;
  /** onBackToMap */
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

const calcDistanceKm = (coords?: { latitude: number; longitude: number }[]) => {
  if (!coords || coords.length < 2) return 0;
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
  missionDirection,
  missionAchieved,
  onBackToMap,
}: ResultScreenProps) {
  const messages = [
    'お疲れさま！\n今日も走れた自分、えらい！',
    '\u3059\u3054\u3044\uFF01\n\u4E00\u6B69\u4E00\u6B69\u304C\u5730\u56F3\u3092\u80B2\u3066\u308B\uFF01',
    '今日も出た！\nそれだけで100点！',
    'また道が育ったね！\nコツコツが一番強い！',
    '走り切った！\n自分を褒めてあげて！',
  ];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1段��目：メッセージフェードイン
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    //�目：開拓結果がスライドで出る（1秒後）
    const t1 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim2, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000);

    const t2 = setTimeout(() => {
      Animated.timing(fadeAnim3, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const safeCoordinates = coordinates ?? [];
  const safePreviousGridIds = previousGridIds ?? [];

  const distanceKm = calcDistanceKm(safeCoordinates);

  const currentGridSet = new Set<string>();
  for (const c of safeCoordinates) {
    currentGridSet.add(coordToGridId(c.latitude, c.longitude));
  }
  const previousGridSet = new Set(safePreviousGridIds);
  let newGridCount = 0;
  for (const g of currentGridSet) {
    if (!previousGridSet.has(g)) {
      newGridCount += 1;
    }
  }

  return (
    <View style={styles.container}>

      {/* 1段��目：励ましメッセージ */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.message}>{randomMessage}</Text>
      </Animated.View>

      {/* 2段��目：開拓結果 */}
      <Animated.View style={{
        opacity: fadeAnim2,
        transform: [{ translateY: slideAnim }],
        alignItems: 'center',
      }}>
        <View style={styles.section}>
          <Text style={styles.label}>経過時間</Text>
          <Text style={styles.value}>{formatElapsedTime(elapsedSeconds)}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>今回の距離</Text>
          <Text style={styles.value}>{distanceKm.toFixed(2)}km</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>新規開拓</Text>
          <Text style={styles.value}>
            {newGridCount}マス {'\uD83D\uDDFA\uFE0F'}
          </Text>
        </View>
      </Animated.View>

      {/* 3段��目：称号 */}
      <Animated.View style={{ opacity: fadeAnim3, alignItems: 'center' }}>
        <Text style={styles.titleLabel}>
          {'\uD83C\uDFC5 \u73FE\u5728\u306E\u79F0\u53F7'}
        </Text>
        <Text style={styles.titleValue}>
          {newGridCount >= 1
            ? '\uD83D\uDDFA\uFE0F \u958B\u62D3\u8005'
            : '\uD83C\uDF31 \u306F\u3058\u3081\u306E\u4E00\u6B69'}
        </Text>
        {missionDirection && (
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={styles.titleLabel}>今日のミッション</Text>
            <Text style={styles.titleValue}>
              {missionDirection}方向に500m開拓
            </Text>
            {missionAchieved ? (
              <Text style={{ fontSize: 20, color: '#27ae60', fontWeight: '700', marginTop: 8 }}>
                ミッション達成！🎉
              </Text>
            ) : (
              <Text style={{ fontSize: 16, color: '#aaa', marginTop: 8 }}>
                未達成（また明日！）
              </Text>
            )}
          </View>
        )}
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim2 }}>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={onBackToMap}
        >
          <Text style={styles.buttonText}>{'\u5730\u56F3\u306B\u623B\u308B'}</Text>
        </Pressable>
      </Animated.View>

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
  titleLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 24,
    marginBottom: 4,
  },
  titleValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
