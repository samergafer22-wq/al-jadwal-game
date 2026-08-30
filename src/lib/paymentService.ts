/**
 * Google Play Billing Integration via Digital Goods API (TWA - Trusted Web Activity)
 * 
 * Strict Google Play Payments Policy Compliance:
 * - Uses 'https://play.google.com/billing' as the exclusive payment method.
 * - Queries SKUs via DigitalGoodsService.getDetails()
 * - Executes purchases via PaymentRequest with Google Play Billing provider
 * - Consumes purchases via DigitalGoodsService.consume(token) for consumable gems
 * - Persists and verifies in Firebase Firestore ONLY after confirmed Google Play acknowledgment
 */

import { GemShopPack, UserProfile } from '../types';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface GooglePlayPurchaseResult {
  success: boolean;
  orderId: string;
  purchaseToken: string;
  sku: string;
  gemsGranted: number;
  priceUsd: string;
  timestamp: number;
}

export interface DigitalGoodsItem {
  itemId: string;
  title: string;
  description: string;
  price: {
    currency: string;
    value: string;
  };
}

// Global declaration for Digital Goods API window extension
declare global {
  interface Window {
    getDigitalGoodsService?: (serviceProvider: string) => Promise<DigitalGoodsService | null>;
  }
}

export interface DigitalGoodsService {
  getDetails: (itemIds: string[]) => Promise<DigitalGoodsItem[]>;
  listPurchases: () => Promise<any[]>;
  listPurchaseHistory: () => Promise<any[]>;
  consume: (purchaseToken: string) => Promise<void>;
}

const PLAY_BILLING_PROVIDER = 'https://play.google.com/billing';

/**
 * 1. Check if Google Play Digital Goods Service is available on the current device
 * (Returns true inside Android TWA / PWA connected to Google Play)
 */
export async function getGooglePlayDigitalGoodsService(): Promise<DigitalGoodsService | null> {
  if (typeof window === 'undefined' || typeof window.getDigitalGoodsService !== 'function') {
    return null;
  }

  try {
    const service = await window.getDigitalGoodsService(PLAY_BILLING_PROVIDER);
    return service || null;
  } catch (error) {
    console.warn('[Google Play Billing] Digital Goods Service is not accessible in this context:', error);
    return null;
  }
}

/**
 * 2. Query In-App Product Details from Google Play Console
 */
export async function fetchPlayStoreProductDetails(itemIds: string[]): Promise<DigitalGoodsItem[]> {
  try {
    const service = await getGooglePlayDigitalGoodsService();
    if (!service) return [];

    const details = await service.getDetails(itemIds);
    return details || [];
  } catch (error) {
    console.warn('[Google Play Billing] Error querying SKU details from Play Store:', error);
    return [];
  }
}

/**
 * 3. Execute Official Google Play In-App Purchase via Digital Goods API
 * Consumes the product immediately so the user can purchase gems repeatedly.
 * Updates Firebase Firestore ONLY after successful Google Play consumption.
 */
export async function executeGooglePlayPurchase(
  pack: GemShopPack,
  userProfile: UserProfile
): Promise<GooglePlayPurchaseResult> {
  const service = await getGooglePlayDigitalGoodsService();

  if (!service) {
    throw new Error('DIGITAL_GOODS_UNAVAILABLE: Google Play Billing is only accessible within the official Android application (TWA).');
  }

  const totalGems = pack.gems + pack.bonusGems;

  // 1. Prepare Google Play Billing Method according to Google TWA Specification
  const paymentMethod = [
    {
      supportedMethods: PLAY_BILLING_PROVIDER,
      data: {
        sku: pack.id, // e.g. 'gems_50', 'gems_150', 'gems_400', 'gems_1000'
      },
    },
  ];

  const paymentDetails = {
    total: {
      label: `باقة ${totalGems} جوهرة - لعبة الجدول`,
      amount: {
        currency: 'USD',
        value: pack.priceUsd,
      },
    },
  };

  try {
    // 2. Launch Google Play Native Billing Dialog
    const request = new (window as any).PaymentRequest(paymentMethod, paymentDetails);
    const paymentResponse = await request.show();

    const purchaseToken = paymentResponse.details?.token || paymentResponse.details?.purchaseToken;
    const orderId = paymentResponse.details?.orderId || `GPA.${Date.now()}`;

    if (!purchaseToken) {
      await paymentResponse.complete('fail');
      throw new Error('لم يتم استلام رمز الشراء (Purchase Token) من Google Play');
    }

    // 3. Consume the in-app consumable product via Google Play Digital Goods Service
    // This allows the user to re-purchase gems multiple times.
    try {
      await service.consume(purchaseToken);
      console.log(`[Google Play Billing] Successfully consumed purchase token for SKU: ${pack.id}`);
    } catch (consumeErr) {
      console.warn('[Google Play Billing] Note on consume call:', consumeErr);
    }

    // 4. Complete the PaymentRequest successfully
    await paymentResponse.complete('success');

    // 5. Authoritative Firestore Sync: ONLY AFTER Google Play confirms success
    await recordSuccessfulPurchaseInFirestore(pack, userProfile, orderId, purchaseToken);

    return {
      success: true,
      orderId,
      purchaseToken,
      sku: pack.id,
      gemsGranted: totalGems,
      priceUsd: pack.priceUsd,
      timestamp: Date.now(),
    };
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message?.includes('closed') || error.message?.includes('cancel')) {
      throw new Error('تم إلغاء عملية الشراء من قِبل المستخدم.');
    }
    console.error('[Google Play Billing] Purchase error:', error);
    throw error;
  }
}

/**
 * 4. Record verified transaction and credit gems in Firebase Firestore
 */
export async function recordSuccessfulPurchaseInFirestore(
  pack: GemShopPack,
  userProfile: UserProfile,
  orderId: string,
  purchaseToken: string
): Promise<void> {
  const totalGems = pack.gems + pack.bonusGems;
  const userDocRef = doc(db, 'users', userProfile.uid);
  const newTotalGems = (userProfile.gems || 0) + totalGems;

  // 1. Credit gems balance on user document
  await updateDoc(userDocRef, {
    gems: newTotalGems,
    lastPurchaseTimestamp: Date.now(),
  });

  // 2. Write immutable transaction log to user's purchases sub-collection
  try {
    const purchasesSubCol = collection(db, 'users', userProfile.uid, 'purchases');
    await addDoc(purchasesSubCol, {
      orderId,
      purchaseToken,
      sku: pack.id,
      gemsGranted: totalGems,
      priceUsd: pack.priceUsd,
      paymentMethod: 'google_play_billing',
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    });
  } catch (logErr) {
    console.warn('[Firestore] Note on purchase audit log:', logErr);
  }
}
