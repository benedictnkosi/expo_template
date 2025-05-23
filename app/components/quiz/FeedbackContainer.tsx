import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ActivityIndicator, Animated } from 'react-native';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { KaTeX } from './KaTeX'
import { IMAGE_BASE_URL } from '../../../config/api';
import { router } from 'expo-router';

interface FeedbackContainerProps {
    feedbackMessage: string;
    correctAnswer: string;
    isDark: boolean;
    colors: any;
    cleanAnswer: (answer: string) => string;
    currentQuestion: any;
    fetchAIExplanation: (questionId: number) => Promise<void>;
    isLoadingExplanation: boolean;
    learnerRole: string | string[];
    handleApproveQuestion: () => Promise<void>;
    isApproving: boolean;
    setZoomImageUrl: (url: string) => void;
    setIsZoomModalVisible: (visible: boolean) => void;
    renderMixedContent: (text: string, isDark: boolean, colors: any) => React.ReactNode;
    handleListenToLecture: () => Promise<void>;
    isLoadingLecture: boolean;
    isLectureAvailable?: boolean;
    subjectName: string;
    learnerUid?: string;
    grade?: string | number;
}

export function FeedbackContainer({
    feedbackMessage,
    correctAnswer,
    isDark,
    colors,
    cleanAnswer,
    currentQuestion,
    fetchAIExplanation,
    isLoadingExplanation,
    learnerRole,
    handleApproveQuestion,
    isApproving,
    setZoomImageUrl,
    setIsZoomModalVisible,
    renderMixedContent,
    handleListenToLecture,
    isLoadingLecture,
    subjectName,
    learnerUid,
    grade,
    isLectureAvailable
}: FeedbackContainerProps) {
    const [isImageLoading, setIsImageLoading] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const styles = createStyles(colors, isDark);



    useEffect(() => {
        console.log("subjectName", subjectName);
        if (isLoadingExplanation) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [isLoadingExplanation]);

    return (
        <ThemedView
            style={styles.feedbackContainer}
            testID="feedback-container"
        >
            <ThemedText
                style={[styles.feedbackEmoji, { color: colors.text }]}
                testID="feedback-message"
            >
                {feedbackMessage}
            </ThemedText>
            {correctAnswer && correctAnswer !== '0' && (
                <ThemedView
                    style={[styles.correctAnswerContainer, {
                        backgroundColor: isDark ? colors.surface : '#FFFFFF'
                    }]}
                    testID="correct-answer-container"
                >

                    <ThemedText
                        style={[styles.correctAnswerLabel, { color: isDark ? '#22C55E' : colors.textSecondary }]}
                        testID="correct-answer-label"
                    >
                        ✅ Right Answer!
                    </ThemedText>


                    {correctAnswer.includes('$') ? (
                        <View style={[styles.latexContainer, {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF'
                        }]}>
                            <KaTeX latex={correctAnswer.replace(/\$/g, '')} />
                        </View>
                    ) : (
                        <ThemedText
                            style={styles.correctAnswerText}
                            testID="correct-answer-text"
                        >
                            {correctAnswer}
                        </ThemedText>
                    )}

                    {(currentQuestion.answer_image && currentQuestion.answer_image !== null && currentQuestion.answer_image !== 'NULL') && (
                        <View style={styles.imageWrapper}>
                            <TouchableOpacity
                                style={styles.touchableImage}
                                onPress={() => {
                                    setZoomImageUrl(currentQuestion.answer_image);
                                    setIsZoomModalVisible(true);
                                }}
                                activeOpacity={0.7}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                testID='question-additional-image-container'
                            >
                                <Image
                                    source={{
                                        uri: `${IMAGE_BASE_URL}${currentQuestion.answer_image}`
                                    }}
                                    style={[styles.questionImage, { opacity: isImageLoading ? 0 : 1 }]}
                                    resizeMode="contain"
                                    onLoadStart={() => setIsImageLoading(true)}
                                    onLoadEnd={() => setIsImageLoading(false)}
                                    testID='question-image'
                                />
                                {isImageLoading && (
                                    <View style={styles.loadingPlaceholder}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {(currentQuestion.explanation && currentQuestion.explanation !== null && currentQuestion.explanation !== 'NULL') && (
                        <>
                            <ThemedText
                                style={[styles.correctAnswerLabel, { color: isDark ? '#22C55E' : colors.textSecondary }]}
                                testID="correct-answer-label"
                            >
                                ✅ Explanation
                            </ThemedText>

                            {(currentQuestion.explanation).includes('$') ? (
                                <View style={[styles.latexContainer, {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF'
                                }]}>
                                    <KaTeX latex={(currentQuestion.explanation).replace(/\$/g, '')} />
                                </View>
                            ) : (
                                <ThemedText
                                    style={styles.correctAnswerText}
                                    testID="correct-answer-text"
                                >
                                    {currentQuestion.explanation?.split('\n').map((line: string, index: number) => {
                                        const trimmedLine = line.trim();
                                        if (trimmedLine.startsWith('-') && !trimmedLine.includes('- $')) {
                                            const content = trimmedLine.substring(1).trim();
                                            const indentLevel = line.indexOf('-') / 2;

                                            return (
                                                <View
                                                    key={index}
                                                    style={[
                                                        styles.bulletPointRow,
                                                        { marginLeft: indentLevel * 5 }
                                                    ]}
                                                >
                                                    <ThemedText style={[styles.bulletPoint, {
                                                        color: isDark ? '#4ADE80' : colors.text,
                                                        marginTop: 4
                                                    }]}>
                                                        {indentLevel > 0 ? '•' : '👉'}
                                                    </ThemedText>
                                                    <View style={styles.bulletTextWrapper}>
                                                        {renderMixedContent(content, isDark, colors)}
                                                    </View>
                                                </View>
                                            );
                                        }
                                        if (trimmedLine.startsWith('-') && trimmedLine.includes('- $')) {
                                            line = trimmedLine.substring(1).trim();
                                        }
                                        if (trimmedLine.includes('{')) {
                                            return (
                                                <View key={index}>
                                                    {renderMixedContent(line, isDark, colors)}
                                                </View>
                                            );
                                        }
                                        return (
                                            <View key={index}>
                                                <ThemedText style={{ color: isDark ? '#E5E7EB' : colors.text }}>
                                                    {line}
                                                </ThemedText>
                                            </View>
                                        );
                                    })}
                                </ThemedText>
                            )}
                        </>
                    )}
                </ThemedView>
            )}
            <TouchableOpacity
                style={[styles.aiExplanationButton, {
                    backgroundColor: isDark ? '#4338CA' : '#4F46E5'
                }]}
                onPress={() => fetchAIExplanation(currentQuestion?.id || 0)}
                disabled={isLoadingExplanation}
                testID="ai-explanation-button"
            >
                <ThemedText style={styles.aiExplanationButtonText}>
                    {isLoadingExplanation ? (
                        <View
                            style={styles.loaderContainer}
                            testID="ai-explanation-loading"
                        >
                            <ThemedText style={styles.aiExplanationButtonText}>
                                Pretending to think
                                <Animated.Text style={[styles.loadingDots, { opacity: fadeAnim }]}>
                                    ...
                                </Animated.Text>
                            </ThemedText>
                            <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : colors.primary} />
                        </View>
                    ) : (
                        '🤖 Break it Down for Me!'
                    )}
                </ThemedText>
            </TouchableOpacity>

            {/* Go to Step-by-Step Solution for Mathematics */}
            {subjectName?.includes('Mathematics') && currentQuestion?.id && currentQuestion?.steps && currentQuestion.steps.steps && currentQuestion.steps.steps.length > 0 && (
                <TouchableOpacity
                    style={[styles.stepSolutionButton]}
                    onPress={() => {
                        router.push({
                            pathname: '/maths',
                            params: {
                                questionId: currentQuestion.id,
                                subjectName,
                                learnerUid,
                                grade,
                            }
                        });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Practice This Question"
                >
                    <ThemedText style={[styles.aiExplanationButtonText, { color: '#fff' }]}>Practice This Question</ThemedText>
                </TouchableOpacity>
            )}

            {isLectureAvailable && (
                <TouchableOpacity
                    style={[styles.lectureButton, {
                        backgroundColor: isDark ? '#059669' : '#10B981'
                    }]}
                    onPress={handleListenToLecture}
                    disabled={isLoadingLecture}
                    testID="lecture-button"
                >
                    <ThemedText style={styles.lectureButtonText}>
                        {isLoadingLecture ? (
                            <View
                                style={styles.loaderContainer}
                                testID="lecture-loading"
                            >
                                <ThemedText style={styles.lectureButtonText}>
                                    Loading lecture
                                    <Animated.Text style={[styles.loadingDots, { opacity: fadeAnim }]}>
                                        ...
                                    </Animated.Text>
                                </ThemedText>
                                <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : colors.primary} />
                            </View>
                        ) : (
                            '🎧 Listen to a Lecture'
                        )}
                    </ThemedText>
                </TouchableOpacity>
            )}

            {(learnerRole === 'admin' || learnerRole === 'reviewer') && currentQuestion && (
                <TouchableOpacity
                    style={[styles.approveButton, isApproving && styles.approveButtonDisabled]}
                    onPress={handleApproveQuestion}
                    disabled={isApproving}
                >
                    <ThemedText style={styles.approveButtonText}>
                        {isApproving ? 'Approving...' : 'Question looks good'}
                    </ThemedText>
                </TouchableOpacity>
            )}
        </ThemedView>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    feedbackContainer: {
        marginTop: 20,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: 'transparent'
    },
    feedbackEmoji: {
        fontSize: 24,
        marginBottom: 10,
    },
    correctAnswerContainer: {
        padding: 10,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    correctAnswerLabel: {
        fontSize: 16,
        marginVertical: 8,
    },
    correctAnswerText: {
        marginVertical: 8,
        fontSize: 16,
        textAlign: 'center',
        color: isDark ? '#E5E7EB' : colors.text
    },
    imageWrapper: {
        width: '100%',
        marginTop: 10,
    },
    touchableImage: {
        width: '100%',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    questionImage: {
        width: '100%',
        height: '100%',
    },
    loadingPlaceholder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bulletPointRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    bulletPoint: {
        marginRight: 8,
    },
    bulletTextWrapper: {
        flex: 1,
    },
    aiExplanationButton: {
        marginTop: 15,
        padding: 12,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    aiExplanationButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    loaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingDots: {
        color: '#FFFFFF',
    },
    approveButton: {
        marginTop: 10,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#22C55E',
        width: '100%',
        alignItems: 'center',
    },
    approveButtonDisabled: {
        opacity: 0.7,
    },
    approveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    latexContainer: {
        width: '100%',
        padding: 10,
        borderRadius: 8,
        marginVertical: 5,
        backgroundColor: 'transparent'
    },
    lectureButton: {
        marginTop: 10,
        padding: 12,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    lectureButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    stepSolutionButton: {
        marginTop: 10,
        padding: 12,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        backgroundColor: isDark ? '#8B5CF6' : '#A78BFA', // purple-500/400
    },
}); 