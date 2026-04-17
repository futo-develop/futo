// ============================================================
// インポート
// ============================================================
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polygon, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ResultScreen from './src/screens/ResultScreen';
import StatsScreen from './src/screens/StatsScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// ============================================================
// 定数
// ============================================================

/** 地図の初期表示範囲（東京） */
const DEFAULT_REGION: Region = {
  latitude: 35.6812,
  longitude: 139.7671,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

/** AsyncStorage にセッションを保存するキー */
const GPS_SESSIONS_KEY = 'gps_sessions';

/** グリッドの1辺の長さ（メートル） */
const GRID_SIZE_METERS = 30;

/** 緯度1度あたりの距離（メートル） */
const METERS_PER_DEGREE_LAT = 111320;

/** 経度1度あたりの距離（緯度により変化） */
const getMetersPerDegreeLon = (lat: number) =>
  111320 * Math.cos((lat * Math.PI) / 180);

// ============================================================
// 型定義
// ============================================================

/** GPS記録セッションの型 */
export type GpsSession = {
  id: string;
  startTime: number;
  endTime: number;
  coordinates: { latitude: number; longitude: number }[];
};

// ============================================================
// グリッド関連のヘルパー関数
// ============================================================

/**
 * 座標をグリッドIDに変換する
 * 地図を30m×30mのマス目に区切り、そのマスの識別子を返す
 */
function coordToGridId(lat: number, lon: number): string {
  const latMeters = lat * METERS_PER_DEGREE_LAT;
  const lonMeters = lon * getMetersPerDegreeLon(lat);
  const gi = Math.floor(latMeters / GRID_SIZE_METERS);
  const gj = Math.floor(lonMeters / GRID_SIZE_METERS);
  return `${gi}_${gj}`;
}

/**
 * グリッドIDから四隅の座標を取得する
 * Polygon描画用に5点（始点で閉じる）を返す
 */
function gridIdToCorners(
  gridId: string
): { latitude: number; longitude: number }[] {
  const [gi, gj] = gridId.split('_').map(Number);
  const latMin = (gi * GRID_SIZE_METERS) / METERS_PER_DEGREE_LAT;
  const latMax = ((gi + 1) * GRID_SIZE_METERS) / METERS_PER_DEGREE_LAT;
  const latCenter = (latMin + latMax) / 2;
  const metersPerDegLon = getMetersPerDegreeLon(latCenter);
  const lonMin = (gj * GRID_SIZE_METERS) / metersPerDegLon;
  const lonMax = ((gj + 1) * GRID_SIZE_METERS) / metersPerDegLon;
  return [
    { latitude: latMin, longitude: lonMin },
    { latitude: latMin, longitude: lonMax },
    { latitude: latMax, longitude: lonMax },
    { latitude: latMax, longitude: lonMin },
    { latitude: latMin, longitude: lonMin },
  ];
}

/**
 * 通過回数に応じた色を返す
 * 1回:緑 / 2-4回:黄 / 5-9回:オレンジ / 10回以上:赤
 */
function getColorForCount(count: number): string {
  if (count >= 10) return '#FF0000';
  if (count >= 5) return '#FFA500';
  if (count >= 2) return '#FFD700';
  return '#90EE90';
}

// ============================================================
// メインコンポーネント
// ============================================================

const Tab = createBottomTabNavigator();

export default function App() {
  // ------------------------------------------------------------
  // 状態
  // ------------------------------------------------------------
  const [isRecording, setIsRecording] = useState(false);
  const [isShowingResult, setIsShowingResult] = useState(false);
  const [resultElapsedSeconds, setResultElapsedSeconds] = useState(0);
  const [resultGridCount, setResultGridCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [resultCoordinates, setResultCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [resultPreviousGridIds, setResultPreviousGridIds] = useState<string[]>(
    []
  );
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locations, setLocations] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [savedSessions, setSavedSessions] = useState<GpsSession[]>([]);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [missionDirection, setMissionDirection] = useState<string | null>(null);
  const [missionAchieved, setMissionAchieved] = useState(false);
  const [frontierMarkers, setFrontierMarkers] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ------------------------------------------------------------
  // セッションの読み込み
  // ------------------------------------------------------------
  const loadSavedSessions = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(GPS_SESSIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GpsSession[];
        setSavedSessions(parsed);
      }
    } catch (e) {
      console.error('Failed to load saved sessions:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadSavedSessions();
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      // オンボーディングの確認
      const onboardingDone = await AsyncStorage.getItem('onboarding_done');
      if (!onboardingDone) {
        setShowOnboarding(true);
      }
      // 通知の許可をリクエスト
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('通知の許可が得られませんでした');
      }

      // デイリーミッションの通知をスケジュール
      const directions = ['北', '南', '東', '西'];
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      setMissionDirection(randomDir);

      await Notifications.cancelAllScheduledNotificationsAsync();

      // 毎朝7時に通知
      const now = new Date();
      const trigger = new Date();
      trigger.setHours(7, 0, 0, 0);
      if (trigger <= now) {
        trigger.setDate(trigger.getDate() + 1);
      }

      const notifEnabled = await AsyncStorage.getItem('notifications_enabled');
      if (notifEnabled === 'false') return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '今日のミッション🗺️',
          body: `${randomDir}方向に500m開拓せよ！`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger,
        },
      });

      // 3日間走っていない場合の通知をスケジュール
      const scheduleReminder = async (lastRunTime: number) => {
        const daysSinceLastRun = (Date.now() - lastRunTime) / (1000 * 60 * 60 * 24);
        if (daysSinceLastRun >= 3) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '久しぶりですね！',
              body: '道が待っています。今日も少しだけ走りませんか？🏃',
            },
            trigger: null, // すぐに通知
          });
        } else {
          // 3日後に通知をスケジュール
          const triggerDate = new Date(lastRunTime + 3 * 24 * 60 * 60 * 1000);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '久しぶりですね！',
              body: '道が待っています。今日も少しだけ走りませんか？🏃',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      };

      // 保存済みセッションから最終走行日を取得して通知をセット
      const stored = await AsyncStorage.getItem(GPS_SESSIONS_KEY);
      if (stored) {
        const sessions: GpsSession[] = JSON.parse(stored);
        if (sessions.length > 0) {
          const lastSession = sessions[sessions.length - 1];
          await scheduleReminder(lastSession.endTime);
        }
      }
    })();
  }, [loadSavedSessions]);

  // ------------------------------------------------------------
  // グリッド通過回数の算出
  // 全セッション + 記録中ルートから、各グリッドの通過回数を集計
  // ------------------------------------------------------------
  const gridCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const addSessionGrids = (coords: { latitude: number; longitude: number }[]) => {
      const grids = new Set<string>();
      for (const c of coords) {
        grids.add(coordToGridId(c.latitude, c.longitude));
      }
      for (const g of grids) {
        counts[g] = (counts[g] ?? 0) + 1;
      }
    };
    for (const session of savedSessions) {
      addSessionGrids(session.coordinates);
    }
    if (locations.length > 0) {
      addSessionGrids(locations);
    }
    return counts;
  }, [savedSessions, locations]);

  useEffect(() => {
    const visitedGrids = new Set(Object.keys(gridCounts));
    if (visitedGrids.size === 0) {
      setFrontierMarkers([]);
      return;
    }

    // 隣接する未訪問グリッドを探す
    const frontier: string[] = [];
    const directions = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
    ];

    for (const gridId of visitedGrids) {
      const [gi, gj] = gridId.split('_').map(Number);
      for (const [di, dj] of directions) {
        const neighborId = `${gi + di}_${gj + dj}`;
        if (!visitedGrids.has(neighborId)) {
          frontier.push(neighborId);
        }
      }
    }

    if (frontier.length === 0) {
      setFrontierMarkers([]);
      return;
    }

    // ランダムに3〜5個選ぶ
    const shuffled = frontier.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(5, shuffled.length));

    // グリッドIDを座標に変換
    const markers = selected.map((gridId) => {
      const [gi, gj] = gridId.split('_').map(Number);
      const lat = (gi * GRID_SIZE_METERS) / METERS_PER_DEGREE_LAT;
      const lon = (gj * GRID_SIZE_METERS) / (111320 * Math.cos(lat * Math.PI / 180));
      return { latitude: lat, longitude: lon };
    });

    setFrontierMarkers(markers);
  }, [gridCounts]);

  // ------------------------------------------------------------
  // 記録停止
  // ------------------------------------------------------------
  const stopTracking = useCallback(async () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setIsRecording(false);

    if (locations.length > 0 && startTimeRef.current !== null) {
      // 結果画面用の集計（今回の走行のみ）
      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const grids = new Set<string>();
      for (const c of locations) {
        grids.add(coordToGridId(c.latitude, c.longitude));
      }
      const previousGrids = new Set<string>();
      for (const session of savedSessions) {
        for (const c of session.coordinates) {
          previousGrids.add(coordToGridId(c.latitude, c.longitude));
        }
      }

      const session: GpsSession = {
        id: `session_${Date.now()}`,
        startTime: startTimeRef.current,
        endTime: Date.now(),
        coordinates: [...locations],
      };
      startTimeRef.current = null;

      try {
        const stored = await AsyncStorage.getItem(GPS_SESSIONS_KEY);
        const sessions: GpsSession[] = stored ? JSON.parse(stored) : [];
        sessions.push(session);
        await AsyncStorage.setItem(
          GPS_SESSIONS_KEY,
          JSON.stringify(sessions)
        );
        setSavedSessions(sessions);
      } catch (e) {
        console.error('Failed to save session:', e);
      }

      // 保存処理の成否に関わらず、結果画面には遷移する
      setResultElapsedSeconds(elapsedSeconds);
      setResultGridCount(grids.size);
      setResultCoordinates([...locations]);
      setResultPreviousGridIds(Array.from(previousGrids));

      // ミッション達成判定
      if (locations.length >= 2 && missionDirection) {
        const start = locations[0];
        const end = locations[locations.length - 1];
        const latDiff = end.latitude - start.latitude;
        const lonDiff = end.longitude - start.longitude;
        const distanceM = Math.sqrt(
          Math.pow(latDiff * 111320, 2) +
          Math.pow(lonDiff * 111320 * Math.cos(start.latitude * Math.PI / 180), 2)
        );
        let achieved = false;
        if (missionDirection === '北' && latDiff > 0 && distanceM >= 500) achieved = true;
        if (missionDirection === '南' && latDiff < 0 && distanceM >= 500) achieved = true;
        if (missionDirection === '東' && lonDiff > 0 && distanceM >= 500) achieved = true;
        if (missionDirection === '西' && lonDiff < 0 && distanceM >= 500) achieved = true;
        setMissionAchieved(achieved);
      }

      setIsShowingResult(true);
    }
    setLocations([]);
    setCurrentLocation(null);
  }, [locations, savedSessions, missionDirection]);

  // ------------------------------------------------------------
  // 記録開始
  // ------------------------------------------------------------
  const startTracking = useCallback(async () => {
    if (isRecording) {
      return;
    }

    setErrorMessage(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMessage('位置情報の権限が許可されていません。');
      setIsRecording(false);
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = location.coords;
    const initialRegion: Region = {
      latitude,
      longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    setCurrentLocation({ latitude, longitude });
    setRegion(initialRegion);
    setLocations([{ latitude, longitude }]);
    startTimeRef.current = Date.now();
    setIsRecording(true);

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 5,
      },
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        setLocations((prev) => [...prev, { latitude, longitude }]);
        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          500
        );
      }
    );
  }, [isRecording]);

  // ------------------------------------------------------------
  // アンマウント時のクリーンアップ
  // ------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording && startTimeRef.current) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const s = elapsed % 60;
        setElapsedTime(
          `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
        );
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // ------------------------------------------------------------
  // レンダリング
  // ------------------------------------------------------------
  if (showOnboarding) {
    return (
      <OnboardingScreen
        onFinish={async () => {
          await AsyncStorage.setItem('onboarding_done', 'true');
          setShowOnboarding(false);
        }}
      />
    );
  }

  if (isShowingResult) {
    return (
      <ResultScreen
        elapsedSeconds={resultElapsedSeconds}
        coordinates={resultCoordinates}
        previousGridIds={resultPreviousGridIds}
        missionDirection={missionDirection}
        missionAchieved={missionAchieved}
        onBackToMap={() => setIsShowingResult(false)}
      />
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { paddingBottom: 8, height: 60 },
          tabBarLabelStyle: { fontSize: 12 },
        }}
      >
        <Tab.Screen
          name="地図"
          options={{ tabBarLabel: '🗺️ 地図' }}
        >
          {() => (
            <View style={styles.container}>
              {/* 地図エリア */}
              <View style={styles.mapContainer}>
                <MapView
                  ref={(ref) => {
                    mapRef.current = ref;
                  }}
                  style={styles.map}
                  region={region}
                  onRegionChangeComplete={setRegion}
                  showsUserLocation={isRecording}
                  showsMyLocationButton={false}
                  followsUserLocation={isRecording}
                >
                  {/* 通過回数に応じたグリッド（色付きマス目） */}
                  {Object.entries(gridCounts).map(([gridId, count]) => (
                    <Polygon
                      key={gridId}
                      coordinates={gridIdToCorners(gridId)}
                      fillColor={getColorForCount(count)}
                      strokeColor="rgba(0,0,0,0.2)"
                      strokeWidth={1}
                    />
                  ))}
                  {frontierMarkers.map((marker, index) => (
                    <Marker
                      key={`frontier_${index}`}
                      coordinate={marker}
                      title="未開拓エリア"
                      description="ここを目指して走ろう！"
                    >
                      <Text style={{ fontSize: 24 }}>🚩</Text>
                    </Marker>
                  ))}
                  {/* 記録中のルート（青い丸） */}
                  {locations.length > 0 &&
                    locations.map((loc, index) => (
                      <Circle
                        key={index}
                        center={loc}
                        radius={3}
                        fillColor="rgba(46, 134, 222, 0.5)"
                        strokeColor="#2e86de"
                        strokeWidth={1}
                      />
                    ))}
                </MapView>
              </View>

              {/* コントロールパネル */}
              <View style={styles.controlPanel}>
                <Text style={styles.statusText}>
                  {isRecording ? '🔴 記録中' : '⚪ 停止中'}
                </Text>

                {isRecording && (
                  <Text style={styles.elapsedText}>
                    {elapsedTime}
                  </Text>
                )}

                {/* 通過回数と色の凡例 */}
                <View style={styles.legend}>
                  <Text style={styles.legendTitle}>通過回数:</Text>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendColor, { backgroundColor: '#90EE90' }]} />
                    <Text style={styles.legendText}>1回</Text>
                    <View style={[styles.legendColor, { backgroundColor: '#FFD700' }]} />
                    <Text style={styles.legendText}>2-4回</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendColor, { backgroundColor: '#FFA500' }]} />
                    <Text style={styles.legendText}>5-9回</Text>
                    <View style={[styles.legendColor, { backgroundColor: '#FF0000' }]} />
                    <Text style={styles.legendText}>10回以上</Text>
                  </View>
                </View>

                {/* スタート/ストップボタン */}
                <View style={styles.buttonRow}>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.button, styles.startButton, isRecording && styles.buttonDisabled]}
                    onPress={startTracking}
                    disabled={isRecording}
                  >
                    <Text style={styles.buttonText}>スタート</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.button, styles.stopButton, !isRecording && styles.buttonDisabled]}
                    onPress={stopTracking}
                    disabled={!isRecording}
                  >
                    <Text style={styles.buttonText}>ストップ</Text>
                  </Pressable>
                </View>
              </View>
              <StatusBar style="auto" />
            </View>
          )}
        </Tab.Screen>
        <Tab.Screen
          name="統計"
          options={{ tabBarLabel: '📊 統計' }}
        >
          {() => (
            <StatsScreen
              sessions={savedSessions}
              totalGridCount={Object.keys(gridCounts).length}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="称号"
          options={{ tabBarLabel: '🏅 称号' }}
        >
          {() => <AchievementsScreen sessions={savedSessions} />}
        </Tab.Screen>
        <Tab.Screen
          name="設定"
          options={{ tabBarLabel: '⚙️ 設定' }}
        >
          {() => <SettingsScreen />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ============================================================
// スタイル
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    height: '50%',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  controlPanel: {
    flex: 1,
    height: '50%',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  elapsedText: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  status: {
    fontSize: 16,
    marginBottom: 6,
  },
  count: {
    fontSize: 16,
    marginBottom: 6,
  },
  coords: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  error: {
    fontSize: 14,
    color: '#c0392b',
    marginBottom: 12,
    textAlign: 'center',
  },
  legend: {
    marginBottom: 12,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    marginRight: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    marginRight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#27ae60',
  },
  stopButton: {
    backgroundColor: '#e74c3c',
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
