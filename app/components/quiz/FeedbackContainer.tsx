import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { KaTeX } from './KaTeX'
import {  IMAGE_BASE_URL } from '../../../config/api';

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
    renderMixedContent
}: FeedbackContainerProps) {
    const [isImageLoading, setIsImageLoading] = useState(false);

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

            <ThemedView
                style={[styles.correctAnswerContainer, {
                    backgroundColor: isDark ? colors.surface : '#FFFFFF'
                }]}
                testID="correct-answer-container"
            >
                <ThemedText
                    style={[styles.correctAnswerLabel, { color: colors.textSecondary }]}
                    testID="correct-answer-label"
                >
                    ✅ Right Answer!
                </ThemedText>

                {cleanAnswer(correctAnswer).includes('$') ? (
                    <View style={[styles.latexContainer, {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF'
                    }]}>
                        <KaTeX latex={cleanAnswer(correctAnswer).replace(/\$/g, '')} />
                    </View>
                ) : (
                    <ThemedText
                        style={[styles.correctAnswerText, { color: isDark ? '#4ADE80' : '#166534' }]}
                        testID="correct-answer-text"
                    >
                        {cleanAnswer(correctAnswer)}
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
                            style={[styles.correctAnswerLabel, { color: colors.textSecondary }]}
                            testID="correct-answer-label"
                        >
                            ✅ Explanation
                        </ThemedText>

                        {cleanAnswer(currentQuestion.explanation).includes('$') ? (
                            <View style={[styles.latexContainer, {
                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF'
                            }]}>
                                <KaTeX latex={cleanAnswer(currentQuestion.explanation).replace(/\$/g, '')} />
                            </View>
                        ) : (
                            <ThemedText
                                style={[styles.correctAnswerText, { color: isDark ? '#4ADE80' : '#166534' }]}
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
                                                    color: colors.text,
                                                    marginTop: 4
                                                }]}>
                                                    {indentLevel > 0 ? '🎯' : '✅'}
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
                                            <ThemedText>
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
                                Pretending to think...
                            </ThemedText>
                            <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : colors.primary} />
                        </View>
                    ) : (
                        '🤖 Break it Down for Me!'
                    )}
                </ThemedText>
            </TouchableOpacity>

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

const styles = StyleSheet.create({
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
        marginBottom: 8,
    },
    correctAnswerText: {
        fontSize: 16,
        textAlign: 'center',
        color: '#000000'
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
}); 