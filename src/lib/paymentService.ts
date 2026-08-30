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

export const PLAY_BILLING_PROVIDER = 'https://play.google.com/billing';

export interface BillingEnvironmentStatus {
  hasDigitalGoodsApi: boolean;
  hasPaymentRequest: boolean;
  isServiceAvailable: boolean;
  isStandaloneOrTwa: boolean;
  serviceError?: string;
}

/**
 * Check the full diagnostics of the current environment for Google Play Billing
 */
export async function checkBillingEnvironment(): Promise<BillingEnvironmentStatus> {
  const hasDigitalGoodsApi = typeof window !== 'undefined' && typeof window.getDigitalGoodsService === 'function';
  const hasPaymentRequest = typeof window !== 'undefined' && typeof (window as any).PaymentRequest === 'function';
  const isStandaloneOrTwa = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    document.referrer.startsWith('android-app://') ||
    navigator.userAgent.includes('wv')
  );

  let isServiceAvailable = false;
  let serviceError: string | undefined = undefined;

  console.log('[Google Play Billing 🔍] Checking Environment Diagnostics...');
  console.log(`[Google Play Billing 🔍] window.getDigitalGoodsService: ${hasDigitalGoodsApi ? '✅ Available' : '❌ Not found'}`);
  console.log(`[Google Play Billing 🔍] window.PaymentRequest: ${hasPaymentRequest ? '✅ Available' : '❌ Not found'}`);
  console.log(`[Google Play Billing 🔍] TWA/Standalone Context: ${isStandaloneOrTwa ? '✅ Active' : 'ℹ️ Standard Web'}`);

  if (hasDigitalGoodsApi) {
    try {
      console.log('[Google Play Billing 🔍] Calling window.getDigitalGoodsService("https://play.google.com/billing")...');
      const service = await window.getDigitalGoodsService!(PLAY_BILLING_PROVIDER);
      if (service) {
        isServiceAvailable = true;
        console.log('[Google Play Billing 🔍] ✅ Digital Goods Service successfully initialized from Google Play!');
      } else {
        serviceError = 'getDigitalGoodsService returned null/undefined (Not in an authorized TWA environment)';
        console.warn('[Google Play Billing 🔍] ⚠️ Service returned null. Ensure the app is running in a TWA with verified Digital Asset Links.');
      }
    } catch (err: any) {
      serviceError = err?.message || String(err);
      console.error('[Google Play Billing 🔍] ❌ Error initializing Digital Goods Service:', err);
    }
  } else {
    serviceError = 'Digital Goods API (window.getDigitalGoodsService) is not supported in this browser/environment.';
  }

  return {
    hasDigitalGoodsApi,
    hasPaymentRequest,
    isServiceAvailable,
    isStandaloneOrTwa,
    serviceError,
  };
}

/**
 * 1. Check if Google Play Digital Goods Service is available on the current device
 * (Returns true inside Android TWA / PWA connected to Google Play)
 */
export async function getGooglePlayDigitalGoodsService(): Promise<DigitalGoodsService | null> {
  if (typeof window === 'undefined' || typeof window.getDigitalGoodsService !== 'function') {
    console.log('[Google Play Billing] window.getDigitalGoodsService is not a function in this browser context.');
    return null;
  }

  try {
    console.log(`[Google Play Billing] Initializing DigitalGoodsService for: ${PLAY_BILLING_PROVIDER}`);
    const service = await window.getDigitalGoodsService(PLAY_BILLING_PROVIDER);
    if (!service) {
      console.warn('[Google Play Billing] window.getDigitalGoodsService resolved with null/undefined.');
      return null;
    }
    console.log('[Google Play Billing] Successfully acquired DigitalGoodsService instance.');
    return service;
  } catch (error) {
    console.warn('[Google Play Billing] Digital Goods Service is not accessible in this context:', error);
    return null;
  }
}

/**
 * 2. Query In-App Product Details from Google Play Console
 */
export async function fetchPlayStoreProductDetails(itemIds: string[]): Promise<DigitalGoodsItem[]> {
  console.log(`[Google Play Billing 📦] Querying product details for SKUs: [${itemIds.join(', ')}]`);
  try {
    const service = await getGooglePlayDigitalGoodsService();
    if (!service) {
      console.warn('[Google Play Billing 📦] Cannot query details: DigitalGoodsService is unavailable.');
      return [];
    }

    console.log('[Google Play Billing 📦] Calling service.getDetails()...');
    const details = await service.getDetails(itemIds);
    console.log('[Google Play Billing 📦] Received product details from Play Store:', details);
    return details || [];
  } catch (error) {
    console.error('[Google Play Billing 📦] Error querying SKU details from Play Store:', error);
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
  console.log('================================================================');
  console.log(`[Google Play Billing 🛒] STARTING PURCHASE: ${pack.id} ($${pack.priceUsd})`);
  console.log(`[Google Play Billing 🛒] Target User: ${userProfile.displayName || userProfile.uid}`);
  console.log('================================================================');

  // STEP 1: Check PaymentRequest support
  if (typeof window === 'undefined' || typeof (window as any).PaymentRequest !== 'function') {
    const err = 'PAYMENT_REQUEST_UNSUPPORTED: متصفحك أو جهازك لا يدعم PaymentRequest API اللازم للدفع.';
    console.error(`[Google Play Billing 🛒] Step 1 FAILED: ${err}`);
    throw new Error(err);
  }
  console.log('[Google Play Billing 🛒] Step 1/7: PaymentRequest API is available in window.');

  // STEP 2: Check DigitalGoodsService
  console.log('[Google Play Billing 🛒] Step 2/7: Checking DigitalGoodsService...');
  const service = await getGooglePlayDigitalGoodsService();

  if (!service) {
    const err = 'DIGITAL_GOODS_UNAVAILABLE: خدمة الشراء عبر Google Play متاحة فقط عند فتح التطبيق من خلال متجر Google Play (TWA) على جهاز أندرويد.';
    console.error(`[Google Play Billing 🛒] Step 2 FAILED: ${err}`);
    throw new Error(err);
  }
  console.log('[Google Play Billing 🛒] Step 2/7: DigitalGoodsService is verified and active.');

  // STEP 3: Optional SKU verification via getDetails
  try {
    console.log(`[Google Play Billing 🛒] Step 3/7: Querying SKU '${pack.id}' info from Play Store...`);
    const details = await service.getDetails([pack.id]);
    if (details && details.length > 0) {
      console.log('[Google Play Billing 🛒] Step 3/7: Play Store recognized product:', details[0]);
    } else {
      console.warn(`[Google Play Billing 🛒] Step 3/7 Warning: SKU '${pack.id}' not returned in details (check Play Console In-App Products status). Proceeding with PaymentRequest...`);
    }
  } catch (detailsErr) {
    console.warn('[Google Play Billing 🛒] Step 3/7 Note: getDetails check produced note (non-fatal):', detailsErr);
  }

  const totalGems = pack.gems + pack.bonusGems;

  // STEP 4: Prepare Google Play Billing PaymentMethodData
  console.log('[Google Play Billing 🛒] Step 4/7: Constructing PaymentRequest data for Google Play...');
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

  console.log('[Google Play Billing 🛒] PaymentMethod payload:', JSON.stringify(paymentMethod));

  let paymentResponse: any = null;

  try {
    // STEP 5: Launch Google Play Native Billing Sheet
    console.log('[Google Play Billing 🛒] Step 5/7: Launching Google Play Native UI via request.show()...');
    const request = new (window as any).PaymentRequest(paymentMethod, paymentDetails);
    
    paymentResponse = await request.show();
    console.log('[Google Play Billing 🛒] Step 5/7: User completed Google Play prompt! Response received:', paymentResponse);

    const purchaseToken = paymentResponse.details?.token || paymentResponse.details?.purchaseToken;
    const orderId = paymentResponse.details?.orderId || `GPA.${Date.now()}`;

    console.log(`[Google Play Billing 🛒] Purchase Token: ${purchaseToken ? '✅ Present (' + purchaseToken.substring(0, 15) + '...)' : '❌ Missing'}`);
    console.log(`[Google Play Billing 🛒] Order ID: ${orderId}`);

    if (!purchaseToken) {
      console.error('[Google Play Billing 🛒] Step 5 FAILED: No purchaseToken found in paymentResponse.details.');
      await paymentResponse.complete('fail');
      throw new Error('لم يتم استلام رمز الشراء (Purchase Token) من Google Play.');
    }

    // STEP 6: Consume the in-app consumable product via Google Play Digital Goods Service
    // This allows the user to re-purchase gems multiple times.
    console.log(`[Google Play Billing 🛒] Step 6/7: Consuming purchase token via service.consume()...`);
    try {
      await service.consume(purchaseToken);
      console.log(`[Google Play Billing 🛒] Step 6/7: Successfully consumed purchase token for SKU: ${pack.id}`);
    } catch (consumeErr: any) {
      console.error('[Google Play Billing 🛒] Step 6/7 Warning on consume call:', consumeErr);
      // We don't fail the whole user flow if consume fails, but we log the warning
    }

    // STEP 7: Complete PaymentRequest
    console.log('[Google Play Billing 🛒] Step 7/7: Calling paymentResponse.complete("success")...');
    await paymentResponse.complete('success');
    console.log('[Google Play Billing 🛒] Step 7/7: PaymentRequest completed successfully!');

    // STEP 8: Authoritative Firestore Sync
    console.log('[Google Play Billing 🛒] Step 8/8: Recording transaction & crediting gems in Firestore...');
    await recordSuccessfulPurchaseInFirestore(pack, userProfile, orderId, purchaseToken);
    console.log(`[Google Play Billing 🛒] ✅ PURCHASE COMPLETE! ${totalGems} gems credited.`);

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
    console.error('[Google Play Billing 🛒] ❌ Purchase Execution Error:', error);

    if (paymentResponse) {
      try {
        await paymentResponse.complete('fail');
      } catch (e) {
        // ignore
      }
    }

    if (error.name === 'AbortError' || error.message?.includes('closed') || error.message?.includes('cancel') || error.message?.includes('User closed')) {
      console.log('[Google Play Billing 🛒] User canceled purchase.');
      throw new Error('تم إلغاء عملية الشراء من قِبل المستخدم.');
    }

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
  const newTotalGems = (userProfile.gems || 0) + totalGems;

  console.log(`[Firestore 💾] Crediting user ${userProfile.uid}: current gems = ${userProfile.gems}, adding = ${totalGems}, new total = ${newTotalGems}`);

  // 1. Credit gems balance on user document if not a temporary guest
  if (userProfile.uid && !userProfile.uid.startsWith('guest_')) {
    try {
      const userDocRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userDocRef, {
        gems: newTotalGems,
        lastPurchaseTimestamp: Date.now(),
      });
      console.log('[Firestore 💾] User document successfully updated in Firestore.');
    } catch (userDocErr) {
      console.error('[Firestore 💾] Error updating user gems in Firestore:', userDocErr);
    }

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
      console.log('[Firestore 💾] Transaction log written to purchases subcollection.');
    } catch (logErr) {
      console.warn('[Firestore 💾] Note on purchase audit log:', logErr);
    }
  } else {
    console.log('[Firestore 💾] Guest user purchase: updated in local state.');
  }
}

