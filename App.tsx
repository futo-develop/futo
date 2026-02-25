import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Polyline, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_REGION: Region = {
  latitude: 35.6812,
  longitude: 139.7671,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const GPS_SESSIONS_KEY = 'gps_sessions';

export type GpsSession = {
  id: string;
  startTime: number;
  endTime: number;
  coordinates: { latitude: number; longitude: number }[];
};

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
          {savedSessions.map(
            (session) =>
              session.coordinates.length >= 2 && (
                <Polyline
                  key={session.id}
                  coordinates={session.coordinates}
                  strokeColor="#FF0000"
                  strokeWidth={5}
                />
              )
          )}
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
        {currentLocation && (
          <Text style={styles.coords}>
            {currentLocation.latitude.toFixed(6)},{' '}
            {currentLocation.longitude.toFixed(6)}
          </Text>
        )}
        {errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : null}
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
