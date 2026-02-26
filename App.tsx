import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Polygon, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_REGION: Region = {
  latitude: 35.6812,
  longitude: 139.7671,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const GPS_SESSIONS_KEY = 'gps_sessions';

const GRID_SIZE_METERS = 100;

const METERS_PER_DEGREE_LAT = 111320;
const getMetersPerDegreeLon = (lat: number) =>
  111320 * Math.cos((lat * Math.PI) / 180);

export type GpsSession = {
  id: string;
  startTime: number;
  endTime: number;
  coordinates: { latitude: number; longitude: number }[];
};

function coordToGridId(lat: number, lon: number): string {
  const latMeters = lat * METERS_PER_DEGREE_LAT;
  const lonMeters = lon * getMetersPerDegreeLon(lat);
  const gi = Math.floor(latMeters / GRID_SIZE_METERS);
  const gj = Math.floor(lonMeters / GRID_SIZE_METERS);
  return `${gi}_${gj}`;
}

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

function getColorForCount(count: number): string {
  if (count >= 10) return '#FF0000';
  if (count >= 5) return '#FFA500';
  if (count >= 2) return '#FFD700';
  return '#90EE90';
}

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
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
    loadSavedSessions();
  }, [loadSavedSessions]);

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

  const stopTracking = useCallback(async () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setIsRecording(false);

    if (locations.length > 0 && startTimeRef.current !== null) {
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
    }
    setLocations([]);
    setCurrentLocation(null);
  }, [locations]);

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
      accuracy: Location.Accuracy.High,
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

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, []);

  const statusText = isRecording ? '記録中' : '停止中';

  return (
    <View style={styles.container}>
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
          {Object.entries(gridCounts).map(([gridId, count]) => (
            <Polygon
              key={gridId}
              coordinates={gridIdToCorners(gridId)}
              fillColor={getColorForCount(count)}
              strokeColor="rgba(0,0,0,0.2)"
              strokeWidth={1}
            />
          ))}
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
      <View style={styles.controlPanel}>
        <Text style={styles.title}>GPS記録</Text>
        <Text style={styles.status}>ステータス: {statusText}</Text>
        <Text style={styles.count}>記録数: {locations.length}</Text>
        <Text style={styles.count}>保存セッション数: {savedSessions.length}</Text>
        <Text style={styles.count}>通過グリッド数: {Object.keys(gridCounts).length}</Text>
        {currentLocation && (
          <Text style={styles.coords}>
            {currentLocation.latitude.toFixed(6)},{' '}
            {currentLocation.longitude.toFixed(6)}
          </Text>
        )}
        {errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : null}
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
  );
}

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
