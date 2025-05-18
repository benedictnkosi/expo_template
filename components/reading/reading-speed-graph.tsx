import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LineChart } from 'react-native-chart-kit';

interface SpeedData {
    date: string;
    speed: number;
    score?: number;
    chapterNumber: number;
}

interface ReadingSpeedGraphProps {
    speeds: SpeedData[];
}

export function ReadingSpeedGraph({ speeds }: ReadingSpeedGraphProps) {
    const { colors, isDark } = useTheme();
    const { width } = Dimensions.get('window');
    const chartWidth = Math.min(width - 32, 400);

    // Prepare data for LineChart
    const data = {
        labels: speeds.map(s => `Ch${s.chapterNumber}`),
        datasets: [
            {
                data: speeds.map(s => s.speed),
                color: () => '#7C3AED', // Speed line color
                strokeWidth: 2,
                withDots: true,
            },
            {
                data: speeds.map(s => s.score || s.speed), // Use speed as fallback if score is not available
                color: () => '#22C55E', // Comprehension line color (emerald)
                strokeWidth: 2,
                withDots: true,
            },
        ],
        legend: ['Speed (wpm)', 'Comprehension (%)'],
    };

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: isDark ? '#23272F' : '#F3F4F6',
                borderColor: isDark ? 'rgba(120,120,140,0.18)' : '#E5E7EB',
                borderWidth: 1,
                shadowColor: isDark ? '#000' : '#B0B0B0',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.18 : 0.08,
                shadowRadius: 8,
            }
        ]}>
            <Text style={[styles.title, { color: colors.text }]}>Reading Speed & Comprehension</Text>
            <LineChart
                data={data}
                width={chartWidth}
                height={180}
                chartConfig={{
                    backgroundColor: isDark ? '#23272F' : '#F3F4F6',
                    backgroundGradientFrom: isDark ? '#23272F' : '#F3F4F6',
                    backgroundGradientTo: isDark ? '#23272F' : '#F3F4F6',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
                    labelColor: (opacity = 1) => isDark ? `rgba(255,255,255,${opacity})` : `rgba(55,65,81,${opacity})`,
                    propsForDots: {
                        r: '4',
                        strokeWidth: '2',
                        stroke: '#7C3AED',
                    },
                    propsForBackgroundLines: {
                        stroke: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
                    },
                }}
                bezier
                style={{
                    borderRadius: 12,
                    marginVertical: 8,
                }}
                fromZero
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: 12,
        overflow: 'visible',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    textContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
}); 