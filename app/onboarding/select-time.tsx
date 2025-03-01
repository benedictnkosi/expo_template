import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../../components/ThemedText';
import { router } from 'expo-router';

const TIMES = [
  '02:00 PM',
  '03:00 PM', '04:00 PM',
  '05:00 PM', '07:00 PM',
  '08:00 PM'
];

interface SelectTimeProps {
  onTimeSelect: (time: string) => void;
  selectedTime?: number;
  onNext?: () => void;
  onBack?: () => void;
}

export default function SelectTime({ onTimeSelect, selectedTime, onNext, onBack }: SelectTimeProps) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={['#4d5ad3', '#7983e6']}
        style={styles.gradient}
      >
        <View style={styles.container}>
          <Image
            source={require('../../assets/images/illustrations/school.png')}
            style={styles.illustration}
            resizeMode="contain"
          />

          <ThemedText style={styles.title}>
            ⏰ When's Your Brain Power Hour?
          </ThemedText>

          <View style={styles.timeGrid}>
            {TIMES.map((time) => {
              const hour = parseInt(time.split(':')[0]);
              const isPM = time.includes('PM');
              const value = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);

              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeButton,
                    selectedTime === value && styles.timeButtonSelected
                  ]}
                  onPress={() => onTimeSelect(time)}
                >
                  <ThemedText style={[
                    styles.timeText,
                    selectedTime === value && styles.timeTextSelected
                  ]}>
                    {time}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>


        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 16,
  },
  illustration: {
    width: '100%',
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  timeButton: {
    width: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 'auto',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 15,
    borderRadius: 25,
  },
  nextButtonText: {
    color: '#4d5ad3',
    fontSize: 16,
    fontWeight: '600',
  },
  timeButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  timeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
}); 