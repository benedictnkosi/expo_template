import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PurchaseTest } from '../components/PurchaseTest';

export default function PurchaseTestScreen() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <PurchaseTest />
        </SafeAreaView>
    );
} 