import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import RegisterForm from '../components/RegisterForm';
import { ThemedText } from '@/components/ThemedText';


export default function RegisterScreen() {
    const params = useLocalSearchParams();
    const onboardingData = {
        grade: Array.isArray(params.grade) ? params.grade[0] : params.grade,
        school: Array.isArray(params.school) ? params.school[0] : params.school,
        school_address: Array.isArray(params.school_address) ? params.school_address[0] : params.school_address,
        school_latitude: Array.isArray(params.school_latitude) ? parseFloat(params.school_latitude[0]) : parseFloat(params.school_latitude as string),
        school_longitude: Array.isArray(params.school_longitude) ? parseFloat(params.school_longitude[0]) : parseFloat(params.school_longitude as string),
        curriculum: Array.isArray(params.curriculum) ? params.curriculum[0] : params.curriculum,
        difficultSubject: Array.isArray(params.difficultSubject) ? params.difficultSubject[0] : params.difficultSubject,
        selectedPlan: Array.isArray(params.selectedPlan) ? params.selectedPlan[0] : params.selectedPlan
    } as const;

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#1B1464', '#2B2F77']}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <ThemedText style={styles.title}>Create Account</ThemedText>
                        <ThemedText style={styles.subtitle}>Sign up to start your learning journey!</ThemedText>
                    </View>
                    <RegisterForm onboardingData={onboardingData} />
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#E2E8F0',
        textAlign: 'center',
    },
}); 