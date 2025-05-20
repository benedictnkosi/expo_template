import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from 'react-native';
import { colors as colorConstants } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

export interface QuizPaperButtonsProps {
    subjectName: string;
    selectedMode: 'quiz' | 'lessons' | 'practice' | null;
    onSelectPaper: (paper: string) => void;
    onLoadQuestion: (paper: string, topic?: string) => Promise<void>;
}

export const QuizPaperButtons = ({
    subjectName,
    selectedMode,
    onSelectPaper,
    onLoadQuestion
}: QuizPaperButtonsProps) => {
    const isDark = useColorScheme() === 'dark';
    const themeColors = isDark ? colorConstants.dark : colorConstants.light;
    const router = useRouter();

    const handlePaperSelect = (paper: string) => {
        if (!selectedMode) {
            Toast.show({
                type: 'error',
                text1: 'Select a Mode',
                text2: 'Please choose a learning mode first',
                position: 'bottom'
            });
            return;
        }

        if (paper === 'P2' && subjectName && (
            subjectName.toLowerCase().includes('life orientation') ||
            subjectName.toLowerCase().includes('tourism') ||
            subjectName.toLowerCase().includes('consumer studies') ||
            subjectName.toLowerCase().includes('religion studies')
        )) {
            Toast.show({
                type: 'error',
                text1: 'Not Available',
                text2: 'Paper 2 is not available for this subject',
                position: 'bottom'
            });
            return;
        }

        onSelectPaper(paper);
        onLoadQuestion(paper);
    };

    return (
        <View style={styles.paperButtons} testID="quiz-paper-buttons">
            <LinearGradient
                colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#9333EA', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                    styles.paperButton,
                    !selectedMode && { opacity: 0.5 }
                ]}
            >
                <TouchableOpacity
                    style={styles.buttonContent}
                    onPress={() => handlePaperSelect('P1')}
                    disabled={!selectedMode}
                >
                    <ThemedText style={styles.paperButtonText}>Paper 1</ThemedText>
                </TouchableOpacity>
            </LinearGradient>

            <LinearGradient
                colors={isDark ? ['#EA580C', '#C2410C'] : ['#F59E0B', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                    styles.paperButton,
                    (!selectedMode ||
                        subjectName.toLowerCase().includes('life orientation') ||
                        subjectName.toLowerCase().includes('tourism')
                    ) && { opacity: 0.5 }
                ]}
            >
                <TouchableOpacity
                    style={styles.buttonContent}
                    onPress={() => handlePaperSelect('P2')}
                    disabled={!selectedMode ||
                        subjectName.toLowerCase().includes('life orientation') ||
                        subjectName.toLowerCase().includes('tourism')
                    }
                >
                    <ThemedText style={styles.paperButtonText}>Paper 2</ThemedText>
                </TouchableOpacity>
            </LinearGradient>

            <View style={styles.hintContainer}>
                <ThemedText style={styles.hintText}>
                    💡 Hint: You can change which school terms you want to practice in your profile settings!
                </ThemedText>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    paperButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 24,
        marginBottom: 24,
    },
    paperButton: {
        flex: 1,
        maxWidth: 160,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonContent: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    paperButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    hintContainer: {
        position: 'absolute',
        bottom: -40,
        width: '100%',
        alignItems: 'center',
    },
    hintText: {
        fontSize: 14,
        textAlign: 'center',
        color: '#6B7280',
    },
}); 