import { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import { ProfileHeader } from '@/components/ProfileHeader';
import { SelectImageQuestion } from './components/SelectImageQuestion';
import { MatchPairsQuestion } from './components/MatchPairsQuestion';
import { TranslateQuestion } from './components/TranslateQuestion';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { TapWhatYouHearQuestion } from './components/TapWhatYouHearQuestion';
import { FillInBlankQuestion } from './components/FillInBlankQuestion';
import { TypeWhatYouHearQuestion } from './components/TypeWhatYouHearQuestion';
import { CompleteTranslationQuestion } from './components/CompleteTranslationQuestion';

interface Word {
    id: number;
    image: string;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface Question {
    id: number;
    words?: Word[];
    options: string[];
    correctOption: number | null;
    questionOrder: number;
    type: 'select_image' | 'tap_what_you_hear' | 'match_pairs' | 'type_what_you_hear' | 'fill_in_blank' | 'complete_translation' | 'translate';
    blankIndex: number | null;
    sentenceWords: string[] | null;
    direction: string | null;
    matchType?: 'audio' | 'text';
}

// Helper to check if resources are downloaded for a unit/language
async function areResourcesDownloaded(unitId: number, languageCode: string): Promise<boolean> {
    const key = `unit_${unitId}_${languageCode}_resources`;
    const downloaded = await SecureStore.getItemAsync(key);
    if (downloaded === 'true') {
        // Optionally, check if files exist in the directory
        return true;
    }
    return false;
}

export default function LessonScreen() {
    const { lessonId, lessonTitle, languageCode, unitName, lessonNumber } = useLocalSearchParams();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [areResourcesDownloadedState, setAreResourcesDownloadedState] = useState(false);

    // Add logging for current question
    useEffect(() => {
        if (questions.length > 0) {
            console.log('Current Question:', {
                index: currentQuestionIndex,
                question: questions[currentQuestionIndex],
                type: questions[currentQuestionIndex].type,
                matchType: questions[currentQuestionIndex].matchType,
                totalQuestions: questions.length
            });
        }
    }, [currentQuestionIndex, questions]);

    useEffect(() => {
        async function fetchQuestions() {
            try {
                const response = await fetch(`${HOST_URL}/api/language-questions/lesson/${lessonId}`);
                const data = await response.json();
                // Sort questions by questionOrder
                const sortedQuestions = data.sort((a: Question, b: Question) => a.questionOrder - b.questionOrder);
                setQuestions(sortedQuestions);
                // Check for resources for the first question's unitId
                if (sortedQuestions.length > 0 && sortedQuestions[0].words && sortedQuestions[0].words.length > 0) {
                    const unitId = sortedQuestions[0].words[0].unitId || null;
                    if (unitId && languageCode) {
                        const downloaded = await areResourcesDownloaded(unitId, languageCode as string);
                        setAreResourcesDownloadedState(downloaded);
                    }
                }
            } catch (err) {
                setError('Error fetching questions');
            } finally {
                setIsLoading(false);
            }
        }
        fetchQuestions();
    }, [lessonId, languageCode]);

    const handleContinue = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const renderProgressBar = () => {
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>

            </View>
        );
    };

    const renderQuestion = (question: Question) => {
        switch (question.type) {
            case 'select_image':
                return (
                    <SelectImageQuestion
                        words={question.words || []}
                        options={question.options}
                        correctOption={question.correctOption}
                        selectedLanguage={languageCode as string}
                        areResourcesDownloaded={areResourcesDownloadedState}
                        onContinue={handleContinue}
                        questionId={String(question.id)}
                    />
                );

            case 'tap_what_you_hear':
                return (
                    <TapWhatYouHearQuestion
                        words={question.words || []}
                        sentenceWords={question.sentenceWords || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        onContinue={handleContinue}
                        questionId={String(question.id)}
                    />
                );

            case 'match_pairs':
                return (
                    <MatchPairsQuestion
                        words={question.words || []}
                        selectedLanguage={languageCode as string}
                        areResourcesDownloaded={areResourcesDownloadedState}
                        onCheck={handleContinue}
                        matchType={question.matchType}
                        questionId={String(question.id)}
                    />
                );

            case 'type_what_you_hear':
                return (
                    <TypeWhatYouHearQuestion
                        words={question.words || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        onContinue={handleContinue}
                        questionId={String(question.id)}
                    />
                );

            case 'fill_in_blank':
                return (
                    <FillInBlankQuestion
                        words={question.words || []}
                        sentenceWords={question.sentenceWords || []}
                        options={question.options}
                        blankIndex={question.blankIndex ?? 0}
                        selectedLanguage={languageCode as string}
                        onContinue={handleContinue}
                        questionId={String(question.id)}
                    />
                );

            case 'complete_translation':
                return (
                    <CompleteTranslationQuestion
                        words={question.words || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        blankIndex={question.blankIndex ?? 0}
                        onContinue={handleContinue}
                        questionId={String(question.id)}
                    />
                );

            case 'translate':
                return (
                    <TranslateQuestion
                        words={question.words || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        direction={question.direction as 'from_english' | 'to_english'}
                        sentenceWords={question.sentenceWords}
                        onContinue={handleContinue}
                        questionId={String(question.id)}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ProfileHeader
                title={unitName as string}
                subText={lessonNumber ? `Lesson ${lessonNumber}` : undefined}
                showBackButton={true}
            />
            {isLoading ? (
                <ActivityIndicator size="large" />
            ) : error ? (
                <ThemedText>{error}</ThemedText>
            ) : questions.length > 0 ? (
                <ThemedView style={styles.content}>
                    {renderProgressBar()}
                    <ScrollView style={styles.scrollView}>
                        {renderQuestion(questions[currentQuestionIndex])}
                    </ScrollView>
                </ThemedView>
            ) : (
                <ThemedText>No questions available</ThemedText>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    progressContainer: {
        padding: 16,
        gap: 8,
    },
    progressBackground: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#A1CEDC',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.8,
    },
    questionContainer: {
        padding: 16,
        gap: 16,
    },
    questionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    optionsContainer: {
        gap: 12,
    },
    optionButton: {
        backgroundColor: '#A1CEDC',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    optionButtonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    checkButton: {
        margin: 16,
        padding: 12,
        backgroundColor: '#E5E7EB',
        borderRadius: 8,
        alignItems: 'center',
    },
    checkButtonSelected: {
        backgroundColor: '#4CAF50',
    },
    checkButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    },
    checkButtonTextSelected: {
        color: '#FFFFFF',
    },
    feedbackContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        marginBottom: 8,
    },
    correctFeedback: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontSize: 20,
    },
    correctLabel: {
        color: '#4CAF50',
        fontWeight: '600',
        fontSize: 18,
        marginLeft: 8,
        textDecorationLine: 'underline',
    },
}); 