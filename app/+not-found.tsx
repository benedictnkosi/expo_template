import { Stack } from 'expo-router';
import { StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedView } from '../components/ThemedView';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';

const LOADING_GIF = require('@/assets/images/book-loading.gif');

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <LinearGradient
        colors={['#FFFFFF', '#FFFFFF']}
        style={styles.gradient}
      >
        <ThemedView style={styles.container}>
          <Image
            source={LOADING_GIF}
            style={styles.loadingGif}
            resizeMode="contain"
          />
        </ThemedView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  loadingGif: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 18,
    textDecorationLine: 'underline',
  },
});
