import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

export async function fetchAvailableProducts(): Promise<PurchasesOffering> {
  const offerings = await Purchases.getOfferings();
  if (!offerings || !offerings.current) {
    throw new Error('No offerings found');
  }
  return offerings.current;
}

export async function fetchAvailablePackages(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  if (!offerings) {
    throw new Error('No offerings found');
  }
  return offerings.current?.availablePackages || [];
}
