import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useTheme } from '@/contexts/ThemeContext';

export interface QuizQuestionTextProps {
    question: string;
    renderMixedContent: (text: string, isDark: boolean, colors: any) => React.ReactNode;
}

export const QuizQuestionText = ({ 
    question, 
    renderMixedContent 
}: QuizQuestionTextProps) => {
    const { isDark, colors } = useTheme();

    return (
        <View style={styles.questionContainer} testID='question-text'>
            {question?.split('\n').map((line, index) => {
                const trimmedLine = line.trim();
                //formulas cant have bullet points
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
                    //remove the - at the beginning of the line
                    line = trimmedLine.substring(1).trim();
                }
                return (
                    <View key={index}>
                        {renderMixedContent(line, isDark, colors)}
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    questionContainer: {
        marginTop: 16,
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    bulletPointRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 8,
        width: '100%',
    },
    bulletPoint: {
        fontSize: 24,
        lineHeight: 24,
        marginRight: 8,
        marginTop: 0,
    },
    bulletTextWrapper: {
        flex: 1,
        flexDirection: 'row',
    },
}); 