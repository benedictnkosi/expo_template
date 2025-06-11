import { Image } from 'expo-image';
import { Platform, StyleSheet, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Language } from '@/types/language';
import { HOST_URL } from '@/config/api';
import { LANGUAGE_EMOJIS } from '@/components/language-emojis';
import { Header } from '@/components/Header';

export default function HomeScreen() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchLanguages() {
      try {
        const response = await fetch(`${HOST_URL}/api/languages`);
        const data = await response.json();
        setLanguages(data);
      } catch (err) {
        setError('Error fetching languages');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLanguages();
  }, []);

  const handleLanguagePress = (language: Language) => {
    router.push({
      pathname: '/lessons',
      params: {
        languageCode: language.code,
        languageName: language.name
      }
    });
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: 'transparent', dark: 'transparent' }}
      headerImage={<Header learnerInfo={null} />}
    >
      <ThemedView style={styles.container}>


        {isLoading ? (
          <ThemedText>Loading languages...</ThemedText>
        ) : error ? (
          <ThemedText>{error}</ThemedText>
        ) : (
          <ThemedView style={styles.languagesContainer}>
            {languages.map((language) => (
              <Pressable
                key={language.id}
                style={({ pressed }) => [
                  styles.languageButton,
                  pressed && styles.languageButtonPressed,
                ]}
                onPress={() => handleLanguagePress(language)}
              >
                <ThemedText style={styles.languageName}>
                  {LANGUAGE_EMOJIS[language.name] ? `${LANGUAGE_EMOJIS[language.name]} ` : ''}{language.name}
                </ThemedText>
                <ThemedText style={styles.languageNativeName}>{language.nativeName}</ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  languageButton: {
    backgroundColor: '#A1CEDC',
    padding: 16,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  languageButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  languageName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  languageNativeName: {
    fontSize: 14,
    opacity: 0.8,
  },
  headerImage: {
    height: 200,
    width: '100%',
  },
});
