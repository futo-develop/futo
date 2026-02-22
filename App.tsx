import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [locations, setLocations] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const stopTracking = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setIsRecording(false);
  }, []);

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

    setIsRecording(true);
    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocations((prev) => [...prev, { latitude, longitude }]);
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
      <Text style={styles.title}>GPS記録</Text>
      <Text style={styles.status}>ステータス: {statusText}</Text>
      <Text style={styles.count}>記録数: {locations.length}</Text>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          style={[styles.button, isRecording && styles.buttonDisabled]}
          onPress={startTracking}
          disabled={isRecording}
        >
          <Text style={styles.buttonText}>開始</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.button, !isRecording && styles.buttonDisabled]}
          onPress={stopTracking}
          disabled={!isRecording}
        >
          <Text style={styles.buttonText}>停止</Text>
        </Pressable>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  status: {
    fontSize: 16,
    marginBottom: 8,
  },
  count: {
    fontSize: 16,
    marginBottom: 12,
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
  },
  button: {
    backgroundColor: '#2e86de',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
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
