import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from '@/services/analytics';

interface TutorialContextType {
    step: number;
    setStep: (step: number) => void;
    incrementStep: () => void;
    resetTutorial: () => void;
    isVisible: boolean;
    closeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
    const [step, setStepState] = useState<number>(1);
    const [isVisible, setIsVisible] = useState<boolean>(true);

    useEffect(() => {
        (async () => {
            const stored = await AsyncStorage.getItem('tutorialStep');
            const isCompleted = await AsyncStorage.getItem('tutorialCompleted');
            if (stored) setStepState(Number(stored));
            if (isCompleted === 'true') setIsVisible(false);
        })();
    }, []);

    const setStep = (newStep: number) => {
        setStepState(newStep);
        AsyncStorage.setItem('tutorialStep', newStep.toString());
    };

    const incrementStep = async () => {
        setStepState(prev => {
            const next = Math.min(prev + 1, 4);
            AsyncStorage.setItem('tutorialStep', next.toString());

            // Log analytics event for tutorial step
            analytics.track('tutorial_step_completed', {
                step_number: prev,
                step_label: tutorialSteps[prev - 1].label,
                next_step: next,
                next_step_label: tutorialSteps[next - 1].label,
                progress: tutorialSteps[next - 1].progress
            }).catch(error => {
                console.error('[Analytics] Error logging tutorial step:', error);
            });

            if (next === 4) {
                // Log tutorial completion event
                analytics.track('tutorial_completed', {
                    total_steps: 4,
                    final_progress: 80
                }).catch(error => {
                    console.error('[Analytics] Error logging tutorial completion:', error);
                });

                // Close tutorial after step 4 and persist completion state
                setIsVisible(false);
                AsyncStorage.setItem('tutorialCompleted', 'true');
            }
            return next;
        });
    };

    const resetTutorial = async () => {
        setStepState(1);
        setIsVisible(true);
        AsyncStorage.setItem('tutorialStep', '1');
        AsyncStorage.setItem('tutorialCompleted', 'false');
    };

    const closeTutorial = async () => {
        setIsVisible(false);
        AsyncStorage.setItem('tutorialCompleted', 'true');
    };

    return (
        <TutorialContext.Provider value={{ step, setStep, incrementStep, resetTutorial, isVisible, closeTutorial }}>
            {children}
        </TutorialContext.Provider>
    );
}

export function useTutorial() {
    const ctx = useContext(TutorialContext);
    if (!ctx) throw new Error('useTutorial must be used within a TutorialProvider');
    return ctx;
}

interface TutorialProps {
    colors: any;
    isDark: boolean;
    step: 1 | 2 | 3 | 4;
}

const tutorialSteps = [
    {
        label: 'Select Subject',
        message: 'Scroll down and select a subject to start!',
        progress: 20,
    },
    {
        label: 'Select Quiz and paper',
        message: 'Choose Quiz as your learning mode and select a paper 1 to get started!',
        progress: 40,
    },
    {
        label: 'Select Lesson and paper',
        message: 'Switch to Lessons mode and select a paper 1 to learn with explanations!',
        progress: 60,
    },
    {
        label: 'Select Quiz and topic',
        message: 'Choose Quiz mode and select a topic under My Study Kit for focused practice!',
        progress: 80,
    },
];

export function Tutorial({ colors, isDark, step }: TutorialProps) {
    const { isVisible } = useTutorial();
    const { message, progress, label } = tutorialSteps[step - 1];

    if (!isVisible) return null;

    return (
        <View style={[styles.floatingTooltip, {
            backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(147, 51, 234, 0.95)',
            borderColor: colors.border
        }]}
        >
            <View style={styles.tooltipHeader}>
                <ThemedText style={[styles.tooltipTitle, { color: isDark ? colors.text : '#FFFFFF' }]}>
                    Tutorial
                </ThemedText>
            </View>
            <View style={styles.tooltipContent}>
                <Image
                    source={require('@/assets/images/dimpo/tooltip.png')}
                    style={styles.tooltipImage}
                    resizeMode="contain"
                />
                <View style={styles.tooltipTextContainer}>
                    <ThemedText style={[styles.tooltipText, { color: isDark ? colors.text : '#FFFFFF' }]}>{message}</ThemedText>
                    <View style={styles.progressBarContainerTooltip}>
                        <View style={[styles.progressBarTooltip, { width: `${progress}%`, backgroundColor: isDark ? colors.primary : '#FFFFFF' }]} />
                        <View style={[styles.progressBarTooltip, { width: `${100 - progress}%`, backgroundColor: isDark ? '#444' : 'rgba(255, 255, 255, 0.3)', position: 'absolute', left: `${progress}%` }]} />
                    </View>
                    <ThemedText style={[styles.progressText, { color: isDark ? colors.textSecondary : 'rgba(255, 255, 255, 0.8)' }]}>Step {step}: {label} ({progress}%)</ThemedText>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    floatingTooltip: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 1000,
    },
    tooltipHeader: {
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        paddingBottom: 8,
    },
    tooltipTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    tooltipContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 12,
    },
    tooltipImage: {
        width: 48,
        height: 48,
        marginRight: 12,
        borderRadius: 24,
        backgroundColor: 'transparent',
    },
    tooltipTextContainer: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    tooltipText: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    progressBarContainerTooltip: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        backgroundColor: 'transparent',
        marginBottom: 4,
        overflow: 'hidden',
        flexDirection: 'row',
        position: 'relative',
    },
    progressBarTooltip: {
        height: 6,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 0,
    },
}); 