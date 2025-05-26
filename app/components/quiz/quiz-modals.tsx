import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, TouchableOpacity, Share, Keyboard } from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { ThemedText } from '@/components/ThemedText';
import ZoomableImageNew from '@/components/ZoomableImageNew';
import { LinearGradient } from 'expo-linear-gradient';

interface StreakModalProps {
    isVisible: boolean;
    onClose: () => void;
    streak: number;
}

export const StreakModal = ({ isVisible, onClose, streak }: StreakModalProps) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleShare = async () => {
        const streakEmojis = '🔥'.repeat(Math.min(streak, 5));
        const shareMessage = `${streakEmojis} Day ${streak} Streak! ${streakEmojis}\n\nI'm on fire with my exam prep! 📚✨\nKeeping the momentum going! 🚀💪\n\n#ExamQuiz #StudyStreak`;

        try {
            await Share.share({
                message: shareMessage,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            animationIn="fadeIn"
            animationOut="fadeOut"
            backdropOpacity={0.5}
            style={styles.modal}
        >
            <View style={[styles.modalContent, {
                backgroundColor: isDark ? Colors.dark.card : Colors.light.card
            }]}>
                <View style={styles.streakIconContainer}>
                    <MaterialCommunityIcons
                        name="fire"
                        size={60}
                        color={Colors.primary}
                    />
                </View>
                <ThemedText style={[styles.streakText, {
                    color: isDark ? Colors.dark.text : Colors.light.text
                }]}>
                    {streak} Day{streak !== 1 ? 's' : ''} Streak! 🔥
                </ThemedText>
                <ThemedText style={[styles.streakSubtext, {
                    color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary
                }]}>
                    Keep up the great work! Your dedication is paying off. 🚀
                </ThemedText>
                <TouchableOpacity
                    style={[styles.shareButton, {
                        backgroundColor: Colors.primary,
                    }]}
                    onPress={handleShare}
                >
                    <ThemedText style={styles.shareButtonText}>
                        Share Your Progress 🎯
                    </ThemedText>
                </TouchableOpacity>
                <Pressable
                    onPress={onClose}
                    style={styles.continueLink}
                >
                    <ThemedText style={[styles.continueLinkText, {
                        color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary
                    }]}>
                        Continue
                    </ThemedText>
                </Pressable>
            </View>
        </Modal>
    );
};

interface ReportModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSubmit: () => void;
    reportComment: string;
    setReportComment: (text: string) => void;
    isSubmitting: boolean;
    isDark: boolean;
    insets: { top: number };
}

export const ReportModal = ({
    isVisible,
    onClose,
    onSubmit,
    reportComment,
    setReportComment,
    isSubmitting,
    isDark,
    insets
}: ReportModalProps) => {
    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            useNativeDriver={true}
            style={[styles.modal, { marginTop: insets?.top || 0 }]}
        >
            <View style={[styles.reportModalContent, {
                backgroundColor: isDark ? Colors.dark.card : Colors.light.card
            }]}>
                <View style={styles.reportModalHeader}>
                    <ThemedText style={[styles.reportModalTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                        Report Issue
                    </ThemedText>
                    <TouchableOpacity
                        onPress={() => Keyboard.dismiss()}
                        style={styles.doneButton}
                    >
                        <ThemedText style={[styles.doneButtonText, { color: Colors.primary }]}>
                            Done
                        </ThemedText>
                    </TouchableOpacity>
                </View>
                <TextInput
                    style={[styles.reportInput, {
                        backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                        borderColor: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
                        color: isDark ? Colors.dark.text : Colors.light.text
                    }]}
                    placeholder="Describe the issue..."
                    placeholderTextColor={isDark ? Colors.dark.textSecondary : Colors.light.textSecondary}
                    value={reportComment}
                    onChangeText={setReportComment}
                    onSubmitEditing={onSubmit}
                    maxLength={200}
                    multiline
                    textAlignVertical="top"
                />
                <View style={styles.reportModalButtons}>
                    <TouchableOpacity
                        style={[styles.reportModalButton, styles.cancelButton, {
                            backgroundColor: isDark ? Colors.dark.card : Colors.light.background
                        }]}
                        onPress={onClose}
                    >
                        <ThemedText style={[styles.buttonText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                            Cancel
                        </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.reportModalButton, styles.submitButton, {
                            backgroundColor: Colors.primary
                        }]}
                        onPress={onSubmit}
                        disabled={isSubmitting}
                    >
                        <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

interface ExplanationModalProps {
    isVisible: boolean;
    onClose: () => void;
    aiExplanation: string;
    isDark: boolean;
    renderMixedContent: (text: string, isDark: boolean, colors: any) => React.ReactNode;
}

export const ExplanationModal = ({
    isVisible,
    onClose,
    aiExplanation,
    isDark,
    renderMixedContent
}: ExplanationModalProps) => {
    const colors = isDark ? Colors.dark : Colors.light;

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            style={styles.fullScreenModal}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            useNativeDriver={true}
            statusBarTranslucent
        >
            <View style={[styles.explanationModal, {
                backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                flex: 1,
                paddingTop: 50,
            }]}>
                <View style={styles.explanationHeader}>
                    <ThemedText style={[styles.explanationTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                        �� AI Explanation 🤖✨
                    </ThemedText>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                    >
                        <Ionicons name="close" size={24} color={isDark ? Colors.dark.text : Colors.light.text} />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.explanationContent}>
                    {aiExplanation?.split('\n').map((line, index) => {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('-') && !trimmedLine.includes('- $')) {
                            const content = trimmedLine.substring(1).trim();
                            const indentLevel = line.indexOf('-') / 2;

                            return (
                                <View
                                    key={index}
                                    style={[
                                        styles.bulletPointRow,
                                        { marginLeft: indentLevel * 20 }
                                    ]}
                                >
                                    <ThemedText style={[styles.bulletPoint, {
                                        color: isDark ? Colors.dark.text : Colors.light.text,
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
                        return (
                            <View key={index}>
                                {renderMixedContent(line, isDark, colors)}
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        </Modal>
    );
};

interface ZoomModalProps {
    isVisible: boolean;
    onClose: () => void;
    zoomImageUrl: string | null;
    imageRotation: number;
    setImageRotation: (rotation: number) => void;
}

export const ZoomModal = ({
    isVisible,
    onClose,
    zoomImageUrl,
    imageRotation,
    setImageRotation
}: ZoomModalProps) => {
    const handleRotate = () => {
        const newRotation = (imageRotation + 90) % 360;
        setImageRotation(newRotation);
    };

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            useNativeDriver={true}
            style={styles.zoomModal}
            animationIn="fadeIn"
            animationOut="fadeOut"
            backdropOpacity={1}
            statusBarTranslucent
        >
            <View style={styles.zoomModalContent}>
                <View style={styles.zoomButtonsContainer}>
                    <TouchableOpacity
                        style={styles.zoomButton}
                        onPress={handleRotate}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                        <Ionicons name="refresh" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.zoomButton}
                        onPress={onClose}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                {zoomImageUrl && (
                    <ZoomableImageNew imageUrl={zoomImageUrl} rotation={imageRotation} />
                )}
            </View>
        </Modal>
    );
};

interface RestartModalProps {
    isVisible: boolean;
    onClose: () => void;
    onRestart: () => void;
    isDark: boolean;
}

export const RestartModal = ({
    isVisible,
    onClose,
    onRestart,
    isDark
}: RestartModalProps) => {
    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            animationIn="fadeIn"
            animationOut="fadeOut"
            backdropOpacity={0.5}
            style={styles.modal}
            useNativeDriver={true}
            hideModalContentWhileAnimating={true}
            animationInTiming={300}
            animationOutTiming={300}
        >
            <View style={[styles.modalContent, {
                backgroundColor: isDark ? Colors.dark.card : Colors.light.card
            }]}>
                <View style={styles.restartIconContainer}>
                    <MaterialCommunityIcons
                        name="restart"
                        size={60}
                        color={Colors.primary}
                    />
                </View>
                <ThemedText style={[styles.restartModalTitle, {
                    color: isDark ? Colors.dark.text : Colors.light.text
                }]}>
                    Reset Progress
                </ThemedText>
                <ThemedText style={[styles.restartModalText, {
                    color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary
                }]}>
                    Are you sure you want to reset your progress for this paper? This action cannot be undone.
                </ThemedText>
                <View style={styles.restartModalButtons}>
                    <TouchableOpacity
                        style={[styles.restartModalButton, styles.cancelButton, {
                            backgroundColor: isDark ? Colors.dark.card : Colors.light.background
                        }]}
                        onPress={onClose}
                    >
                        <ThemedText style={[styles.buttonText, {
                            color: isDark ? Colors.dark.text : Colors.light.text
                        }]}>
                            Cancel
                        </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.restartModalButton, styles.resetButton]}
                        onPress={onRestart}
                    >
                        <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                            Reset
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

interface ThankYouModalProps {
    isVisible: boolean;
    onClose: () => void;
    isDark: boolean;
}

export const ThankYouModal = ({
    isVisible,
    onClose,
    isDark
}: ThankYouModalProps) => {
    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            useNativeDriver={true}
            style={[styles.modal, { marginTop: 0 }]}
            testID="thank-you-modal"
        >
            <View style={[styles.thankYouModalContent, {
                backgroundColor: isDark ? Colors.dark.card : Colors.light.card
            }]}>
                <View style={styles.thankYouIconContainer}>
                    <Ionicons name="checkmark-circle" size={60} color="#22C55E" />
                </View>
                <ThemedText style={[styles.thankYouTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                    🎉 You're Awesome! 🙌
                </ThemedText>
                <ThemedText style={[styles.thankYouMessage, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
                    Your feedback helps us level up our questions! Thanks for making the quiz even better. 🚀💡
                </ThemedText>
                <TouchableOpacity
                    style={[styles.thankYouButton, { backgroundColor: Colors.primary }]}
                    onPress={onClose}
                >
                    <ThemedText style={styles.thankYouButtonText}>Keep Going 🚀</ThemedText>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

interface BadgeModalProps {
    isVisible: boolean;
    onClose: () => void;
    badgeName: string;
    badgeDescription: string;
    badgeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
}

export const BadgeModal = ({
    isVisible,
    onClose,
    badgeName,
    badgeDescription,
    badgeIcon
}: BadgeModalProps) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleShare = async () => {
        const shareMessage = `🏆 New Achievement Unlocked! 🎉\n\n${badgeName} Badge Earned! ✨\n\n${badgeDescription}\n\n#ExamQuiz #Achievement #Learning`;

        try {
            await Share.share({
                message: shareMessage,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            animationIn="fadeIn"
            animationOut="fadeOut"
            backdropOpacity={0.5}
            style={styles.modal}
        >
            <View style={[styles.modalContent, {
                backgroundColor: isDark ? Colors.dark.card : Colors.light.card
            }]}>
                <View style={styles.badgeIconContainer}>
                    <MaterialCommunityIcons
                        name={badgeIcon}
                        size={60}
                        color={Colors.primary}
                    />
                </View>
                <ThemedText style={[styles.badgeTitle, {
                    color: isDark ? Colors.dark.text : Colors.light.text
                }]}>
                    🎉 New Badge Unlocked! 🎉
                </ThemedText>
                <ThemedText style={[styles.badgeName, {
                    color: isDark ? Colors.dark.text : Colors.light.text
                }]}>
                    {badgeName}
                </ThemedText>
                <ThemedText style={[styles.badgeDescription, {
                    color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary
                }]}>
                    {badgeDescription}
                </ThemedText>
                <TouchableOpacity
                    style={[styles.shareButton, {
                        backgroundColor: Colors.primary,
                    }]}
                    onPress={handleShare}
                >
                    <ThemedText style={styles.shareButtonText}>
                        Share Your Achievement 🏆
                    </ThemedText>
                </TouchableOpacity>
                <Pressable
                    onPress={onClose}
                    style={styles.continueLink}
                >
                    <ThemedText style={[styles.continueLinkText, {
                        color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary
                    }]}>
                        Continue
                    </ThemedText>
                </Pressable>
            </View>
        </Modal>
    );
};

interface FirstTimeModalProps {
    isVisible: boolean;
    onClose: () => void;
    isDark: boolean;
}

export const FirstTimeModal = ({
    isVisible,
    onClose,
    isDark
}: FirstTimeModalProps) => {
    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            animationIn="fadeIn"
            animationOut="fadeOut"
            backdropOpacity={0.5}
            style={styles.modal}
        >
            <View style={[styles.modalContent, {
                backgroundColor: isDark ? Colors.dark.card : Colors.light.card
            }]}>
                <View style={styles.welcomeIconContainer}>
                    <MaterialCommunityIcons
                        name="school"
                        size={60}
                        color={Colors.primary}
                    />
                </View>
                <ThemedText style={[styles.welcomeTitle, {
                    color: isDark ? Colors.dark.text : Colors.light.text
                }]}>
                    Look who made it here! 🎓
                </ThemedText>
                <ThemedText style={[styles.welcomeMessage, {
                    color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary
                }]}>
                    To get started, select a paper. Choose Paper 1 or Paper 2. The learning mode is already selected for you.  🚀
                </ThemedText>
                <TouchableOpacity
                    style={[styles.paperButton, {
                        backgroundColor: Colors.primary
                    }]}
                    onPress={onClose}
                >
                    <ThemedText style={styles.paperButtonText}>
                        Let's Begin! 🚀
                    </ThemedText>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

interface UpgradeNudgeModalProps {
    isVisible: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    isDark: boolean;
    selectedMode: 'quiz' | 'lessons' | 'practice' | 'podcast';
}

export const UpgradeNudgeModal = ({
    isVisible,
    onClose,
    onUpgrade,
    isDark,
    selectedMode
}: UpgradeNudgeModalProps) => {
    const content = {
        quiz: {
            title: "🎯 You're on a roll!",
            message: `You've got just 5 questions left today.${'\n\n'}Want to finish strong without waiting for tomorrow?${'\n\n'}👉 Upgrade to Dimpo Pro for unlimited access — no stops, no limits.`,
            primaryButton: "Upgrade to Pro",
            secondaryButton: "⏳ I'll wait for tomorrow",
            primaryAccessibilityLabel: "Upgrade to Pro for unlimited questions",
            secondaryAccessibilityLabel: "Continue with remaining questions"
        },
        lessons: {
            title: "📚 Learning Streak!",
            message: `You've got just 5 lessons left today.${'\n\n'}Want to keep your learning momentum going?${'\n\n'}👉 Upgrade to Dimpo Pro for unlimited lessons — learn at your own pace.`,
            primaryButton: "Upgrade to Pro",
            secondaryButton: "⏳ I'll wait for tomorrow",
            primaryAccessibilityLabel: "Upgrade to Pro for unlimited lessons",
            secondaryAccessibilityLabel: "Continue with remaining lessons"
        },
        practice: {
            title: "🎯 Keep Practicing!",
            message: `You've got just 1 practice questions left today.${'\n\n'}Want to keep improving without limits?${'\n\n'}👉 Upgrade to Dimpo Pro for unlimited practice — master at your own pace.`,
            primaryButton: "Upgrade to Pro",
            secondaryButton: "⏳ I'll wait for tomorrow",
            primaryAccessibilityLabel: "Upgrade to Pro for unlimited practice",
            secondaryAccessibilityLabel: "Continue with remaining practice"
        },
        podcast: {
            title: "🎧 Keep Listening!",
            message: `You've got just 1 podcasts left today.${'\n\n'}Want to keep learning on the go?${'\n\n'}👉 Upgrade to Dimpo Pro for unlimited podcasts — learn anywhere, anytime.`,
            primaryButton: "Upgrade to Pro",
            secondaryButton: "⏳ I'll wait for tomorrow",
            primaryAccessibilityLabel: "Upgrade to Pro for unlimited podcasts",
            secondaryAccessibilityLabel: "Continue with remaining podcasts"
        }
    };

    const currentContent = content[selectedMode];

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            animationIn="fadeIn"
            animationOut="fadeOut"
            backdropOpacity={0.5}
            style={styles.modal}
            useNativeDriver={true}
            hideModalContentWhileAnimating={true}
            animationInTiming={300}
            animationOutTiming={300}
        >
            <View style={[styles.modalContent, {
                backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
                alignItems: 'center',
                paddingVertical: 36,
                paddingHorizontal: 24,
                borderRadius: 28,
                shadowColor: isDark ? '#000' : '#222',
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 8,
            }]}>
                <View style={styles.starCircleWrapper}>
                    <View style={[styles.starCircle, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.10)' }]}>
                        <MaterialCommunityIcons
                            name="rocket-launch"
                            size={72}
                            color={Colors.primary}
                            style={{ alignSelf: 'center' }}
                        />
                    </View>
                </View>
                <ThemedText style={[styles.welcomeTitle, {
                    color: isDark ? Colors.dark.text : Colors.light.text,
                    fontSize: 28,
                    fontWeight: 'bold',
                    marginTop: 24,
                    marginBottom: 8,
                    textAlign: 'center',
                }]}>{currentContent.title}</ThemedText>
                <ThemedText style={[styles.welcomeMessage, {
                    color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
                    fontSize: 17,
                    marginBottom: 32,
                    textAlign: 'center',
                    lineHeight: 24,
                }]}>
                    {currentContent.message}
                </ThemedText>
                <View style={styles.ctaColumn}>
                    <TouchableOpacity
                        onPress={onUpgrade}
                        accessibilityRole="button"
                        accessibilityLabel={currentContent.primaryAccessibilityLabel}
                        activeOpacity={0.85}
                        style={{ width: '100%' }}
                    >
                        <LinearGradient
                            colors={["#a18fff", "#6f5cff"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            <Text style={styles.gradientButtonText}>✨ Upgrade to Pro</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.outlineButton}
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel={currentContent.secondaryAccessibilityLabel}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.outlineButtonText}>⏳ I'll wait for tomorrow</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        margin: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    streakIconContainer: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        borderRadius: 50,
    },
    streakText: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    streakSubtext: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    streakButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginTop: 8,
    },
    shareButton: {
        width: '100%',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    continueLink: {
        marginTop: 16,
        padding: 8,
    },
    continueLinkText: {
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    closeButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    reportModalContent: {
        width: '90%',
        padding: 20,
        borderRadius: 20,
    },
    reportModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    reportModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    reportInput: {
        height: 120,
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 20,
        fontSize: 16,
    },
    reportModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    reportModalButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
    },
    cancelButton: {
        marginRight: 10,
    },
    submitButton: {
        marginLeft: 10,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    fullScreenModal: {
        margin: 0,
    },
    explanationModal: {
        width: '100%',
        height: '100%',
        borderRadius: 0,
        padding: 20,
    },
    explanationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 10,
    },
    explanationTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    explanationContent: {
        flex: 1,
    },
    explanationContentContainer: {
        paddingBottom: 40,
    },
    bulletPointRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    bulletPoint: {
        marginRight: 10,
    },
    bulletTextWrapper: {
        flex: 1,
    },
    zoomModal: {
        margin: 0,
    },
    zoomModalContent: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        position: 'relative',
    },
    zoomButtonsContainer: {
        position: 'absolute',
        top: 50,
        right: 20,
        flexDirection: 'row',
        gap: 12,
        zIndex: 999,
    },
    zoomButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
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
    restartIconContainer: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        borderRadius: 50,
    },
    restartModalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    restartModalText: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    restartModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    restartModalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    resetButton: {
        backgroundColor: Colors.primary,
    },
    thankYouModalContent: {
        width: '90%',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
    },
    thankYouIconContainer: {
        marginBottom: 20,
    },
    thankYouTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    thankYouMessage: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    thankYouButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    thankYouButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 10,
    },
    thankYouButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    badgeIconContainer: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        borderRadius: 50,
    },
    badgeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    badgeName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
        color: Colors.primary,
    },
    badgeDescription: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    doneButton: {
        padding: 8,
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    welcomeIconContainer: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        borderRadius: 50,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    welcomeMessage: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    paperButton: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    paperButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    starCircleWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
    },
    starCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        width: '100%',
    },
    gradientButton: {
        width: '100%',
        borderRadius: 18,
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 4,
    },
    gradientButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 22,
        letterSpacing: 0.2,
    },
    outlineButton: {
        width: '100%',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    outlineButtonText: {
        color: '#4f46e5',
        fontWeight: '600',
        fontSize: 16,
        letterSpacing: 0.2,
    },
    ctaColumn: {
        width: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        marginTop: 16,
    },
}); 