import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

interface AiExplanationProps {
    explanation: string;
    isDark: boolean;
    colors: any;
    renderMixedContent: (text: string, isDark: boolean, colors: any) => React.ReactNode;
}

export function AiExplanation({ explanation, isDark, colors, renderMixedContent }: AiExplanationProps) {
    return (
        <ThemedView
            style={[styles.aiExplanationContainer, {
                backgroundColor: isDark ? colors.surface : '#FFFFFF',
                borderColor: isDark ? '#4ADE80' : '#22C55E'
            }]}
            testID="lesson-ai-explanation-container"
        >
            {explanation?.split('\n').map((line, index) => {
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
                    //remove the - at the beginning of the line
                    line = trimmedLine.substring(1).trim();
                }
                return (
                    <View key={index}>
                        <ThemedText style={{ color: isDark ? '#E5E7EB' : colors.text }}>
                            {renderMixedContent(line, isDark, colors)}
                        </ThemedText>
                    </View>
                );
            })}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    aiExplanationContainer: {
        backgroundColor: '#FFFFFF',
        borderColor: '#22C55E',
        borderRadius: 8,
        marginTop: 12,
        padding: 16,
        width: '100%',
        flexShrink: 1,
    } as ViewStyle,
    bulletPointRow: {
        flexDirection: 'row' as const,
        alignItems: 'flex-start' as const,
        gap: 12,
        marginBottom: 8,
        width: '100%',
    } as ViewStyle,
    bulletPoint: {
        fontSize: 24,
        lineHeight: 24,
        marginRight: 8,
        marginTop: 0,
    },
    bulletTextWrapper: {
        flex: 1,
        flexDirection: 'row' as const,
    } as ViewStyle,
}); 