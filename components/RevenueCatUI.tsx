import React from 'react';
import { View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { CustomerInfo } from 'react-native-purchases';

export interface PaywallResult {
  customerInfo: CustomerInfo | null;
  purchased: boolean;
}

// Display current offering
export default function presentPaywall(): Promise<PaywallResult> {
  return new Promise((resolve) => {
    const handleDismiss = () => {
      resolve({ customerInfo: null, purchased: false });
    };

    const handlePurchaseCompleted = (result: { customerInfo: CustomerInfo }) => {
      resolve({ customerInfo: result.customerInfo, purchased: true });
    };

    const handleRestoreCompleted = (result: { customerInfo: CustomerInfo }) => {
      resolve({ customerInfo: result.customerInfo, purchased: true });
    };

    return (
      <View style={{ flex: 1 }}>
        <RevenueCatUI.Paywall
          onDismiss={handleDismiss}
          onPurchaseCompleted={handlePurchaseCompleted}
          onRestoreCompleted={handleRestoreCompleted}
        />
      </View>
    );
  });
}
