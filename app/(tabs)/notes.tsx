import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { NotesAndTodos } from '../components/NotesAndTodos';

export default function NotesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : '#fff' }}>
      <NotesAndTodos subjectName="Agricultural Sciences" />
    </SafeAreaView>
  );
} 