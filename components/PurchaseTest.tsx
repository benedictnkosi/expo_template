import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { revenueCatService } from '../services/revenueCat';
import type { PurchasePackage } from '../services/revenueCat';

export function PurchaseTest() {
    const [offerings, setOfferings] = useState<PurchasePackage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOfferings();
    }, []);

    async function loadOfferings() {
        try {
            setIsLoading(true);
            const currentOfferings = await revenueCatService.getOfferings();
            if (currentOfferings?.availablePackages) {
                setOfferings(currentOfferings.availablePackages);
            }
        } catch (error) {
            console.error('Error loading offerings:', error);
            Alert.alert('Error', 'Failed to load offerings');
        } finally {
            setIsLoading(false);
        }
    }

    async function handlePurchase(packageToPurchase: PurchasePackage) {
        try {
            setIsLoading(true);
            const customerInfo = await revenueCatService.purchasePackage(packageToPurchase);
            Alert.alert('Success', 'Purchase completed successfully!');
            console.log('Customer Info:', customerInfo);
        } catch (error: any) {
            console.error('Purchase error:', error);
            Alert.alert('Error', error.message || 'Failed to complete purchase');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleRestore() {
        try {
            setIsLoading(true);
            const customerInfo = await revenueCatService.restorePurchases();
            Alert.alert('Success', 'Purchases restored successfully!');
            console.log('Restored Customer Info:', customerInfo);
        } catch (error: any) {
            console.error('Restore error:', error);
            Alert.alert('Error', error.message || 'Failed to restore purchases');
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Text>Loading offerings...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Available Packages</Text>
            {offerings.map((pkg) => (
                <TouchableOpacity
                    key={pkg.identifier}
                    style={styles.packageButton}
                    onPress={() => handlePurchase(pkg)}
                    disabled={isLoading}
                >
                    <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                    <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                </TouchableOpacity>
            ))}
            <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={isLoading}
            >
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    packageButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    packageTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    packagePrice: {
        color: '#fff',
        fontSize: 14,
        marginTop: 5,
    },
    restoreButton: {
        backgroundColor: '#34C759',
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
    },
    restoreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
}); 