import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

interface TimeSelectorProps {
    value: Date;
    onChange: (date: Date) => void;
    label: string;
    minimumDate?: Date;
}

export function TimeSelector({ value, onChange, label, minimumDate }: TimeSelectorProps) {
    const [showPicker, setShowPicker] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        setShowPicker(false);
        if (selectedDate) {
            onChange(selectedDate);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.labelContainer}>
                <Text style={[
                    styles.label,
                    { color: isDark ? '#fff' : '#000' }
                ]}>
                    {label}
                </Text>
            </View>
            <TouchableOpacity
                style={[
                    styles.timeButton,
                    { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }
                ]}
                onPress={() => setShowPicker(true)}
            >
                <Text style={[
                    styles.timeText,
                    { color: isDark ? '#fff' : '#000' }
                ]}>
                    {format(value, 'HH:mm')}
                </Text>
            </TouchableOpacity>

            {showPicker && (
                <DateTimePicker
                    value={value}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={handleTimeChange}
                    minimumDate={minimumDate}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 8,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    label: {
        fontSize: 17,
        fontWeight: '600',
    },
    timeButton: {
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 17,
        fontWeight: '400',
    },
}); 