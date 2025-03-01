import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '../../components/ThemedText';

interface SelectTimeProps {
  onTimeSelect: (time: string) => void;
  selectedTime?: number;
}

export default function SelectTime({ onTimeSelect, selectedTime }: SelectTimeProps) {
  const times = [
    '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
    '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'
  ];

  const isSelected = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    const isPM = time.includes('PM');
    const value = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    return value === selectedTime;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.optionsContainer}>
        {times.map((time) => (
          <TouchableOpacity
            key={time}
            style={[
              styles.timeButton,
              isSelected(time) && styles.timeButtonSelected
            ]}
            onPress={() => onTimeSelect(time)}
          >
            <ThemedText style={[
              styles.timeText,
              isSelected(time) && styles.timeTextSelected
            ]}>
              {time}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeButton: {
    width: '45%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeButtonSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#7C3AED',
  },
  timeText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  timeTextSelected: {
    color: '#FFFFFF',
  },
}); 