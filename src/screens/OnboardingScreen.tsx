import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

type Props = {
  onFinish: () => void;
};

export default function OnboardingScreen({ onFinish }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🗺️</Text>
      <Text style={styles.title}>futoへようこそ</Text>
      <Text style={styles.subtitle}>
        タイムもペースも関係ない。{'\n'}
        走った道が、育っていく。
      </Text>

      <View style={styles.steps}>
        <Text style={styles.step}>🟢 走った道が色づく</Text>
        <Text style={styles.step}>🔴 何度も走ると色が濃くなる</Text>
        <Text style={styles.step}>🚩 旗を目指して新しい道へ</Text>
        <Text style={styles.step}>🏅 走るほど称号が解除される</Text>
      </View>

      <Pressable style={styles.button} onPress={onFinish}>
        <Text style={styles.buttonText}>さあ、走り出そう！</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
  steps: {
    alignSelf: 'stretch',
    marginBottom: 48,
  },
  step: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
