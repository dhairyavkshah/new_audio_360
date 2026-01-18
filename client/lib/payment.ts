/**
 * Google Play Store License Verification
 * 
 * Simple one-time purchase model:
 * - App is a PAID app on Google Play Store (₹311 / $13.11)
 * - User purchases and downloads from Play Store
 * - Since the app is PAID, anyone who downloads from Play Store has already paid
 * 
 * No sign-in required - purchase happens at download time on Play Store.
 * 
 * License verification uses native module to check installer package name:
 * - Play Store installs have installer = "com.android.vending"
 * - Sideloaded APKs have different or null installer
 * 
 * For development builds:
 * - Auto-licensed for testing
 */

import { Platform } from "react-native";
import Constants from 'expo-constants';
import { LicenseVerificationModule } from '../../modules/audio-effects';

const APP_VARIANT = Constants.expoConfig?.extra?.appVariant;
const IS_PRODUCTION = APP_VARIANT === 'production';
const IS_DEVELOPMENT = APP_VARIANT === 'development' || APP_VARIANT === 'preview' || __DEV__;

export interface PurchaseInfo {
  productId: string;
  installSource: string;
  installTime: number;
}

export interface InstallVerificationResult {
  isValidInstall: boolean;
  installSource: string;
  purchase?: PurchaseInfo;
  error?: string;
}

export const PRODUCT_ID = 'new_audio_360_lifetime';

export const PlayStoreVerification = {
  async verifyInstallSource(): Promise<InstallVerificationResult> {
    try {
      if (Platform.OS === "web") {
        const isTestMode = typeof window !== 'undefined' && 
          (localStorage.getItem('na360_test_mode') === 'true' || IS_DEVELOPMENT);
        
        return {
          isValidInstall: isTestMode,
          installSource: 'web',
          purchase: isTestMode ? {
            productId: PRODUCT_ID,
            installSource: 'web_test',
            installTime: Date.now(),
          } : undefined,
        };
      }

      if (Platform.OS === 'ios') {
        return {
          isValidInstall: true,
          installSource: 'app_store',
          purchase: {
            productId: PRODUCT_ID,
            installSource: 'app_store',
            installTime: Date.now(),
          },
        };
      }

      if (IS_DEVELOPMENT) {
        console.log("[PlayStoreVerification] Development mode - auto-licensing for testing");
        return {
          isValidInstall: true,
          installSource: 'development',
          purchase: {
            productId: PRODUCT_ID,
            installSource: 'development',
            installTime: Date.now(),
          },
        };
      }

      // Use native module to verify Play Store installation
      if (LicenseVerificationModule.isAvailable()) {
        console.log("[PlayStoreVerification] Using native installer verification");
        const result = await LicenseVerificationModule.isPlayStoreInstall();
        
        if (result.isPlayStoreInstall) {
          console.log("[PlayStoreVerification] Verified Play Store install:", result.installerPackageName);
          return {
            isValidInstall: true,
            installSource: result.installerPackageName,
            purchase: {
              productId: PRODUCT_ID,
              installSource: 'play_store',
              installTime: Date.now(),
            },
          };
        } else {
          console.log("[PlayStoreVerification] Not a Play Store install:", result.installerPackageName);
          return {
            isValidInstall: false,
            installSource: result.installerPackageName,
            error: 'App not installed from Google Play Store',
          };
        }
      }

      // Fallback if native module not available (shouldn't happen in production)
      console.log("[PlayStoreVerification] Native module not available, build variant:", APP_VARIANT);
      return {
        isValidInstall: false,
        installSource: 'native_module_unavailable',
        error: 'License verification not available',
      };
    } catch (error) {
      console.error("[PlayStoreVerification] Error:", error);
      
      if (IS_DEVELOPMENT) {
        return {
          isValidInstall: true,
          installSource: 'error_dev_fallback',
          purchase: {
            productId: PRODUCT_ID,
            installSource: 'error_fallback',
            installTime: Date.now(),
          },
        };
      }
      
      return {
        isValidInstall: false,
        installSource: 'error',
        error: error instanceof Error ? error.message : "Failed to verify installation",
      };
    }
  },

  enableTestMode(): void {
    if (Platform.OS === "web" && typeof window !== 'undefined') {
      localStorage.setItem('na360_test_mode', 'true');
    }
  },

  disableTestMode(): void {
    if (Platform.OS === "web" && typeof window !== 'undefined') {
      localStorage.removeItem('na360_test_mode');
    }
  },
};

export const GooglePlayLicense = {
  async checkPurchaseStatus(): Promise<{ isPurchased: boolean; purchase?: PurchaseInfo; error?: string }> {
    const result = await PlayStoreVerification.verifyInstallSource();
    return {
      isPurchased: result.isValidInstall,
      purchase: result.purchase,
      error: result.error,
    };
  },

  async purchaseApp(): Promise<{ isPurchased: boolean; purchase?: PurchaseInfo; error?: string }> {
    return this.checkPurchaseStatus();
  },

  async restorePurchases(): Promise<{ isPurchased: boolean; purchase?: PurchaseInfo; error?: string }> {
    return this.checkPurchaseStatus();
  },

  clearTestPurchase(): void {
    PlayStoreVerification.disableTestMode();
  },
};

export interface RegionDetectionResult {
  isIndian: boolean;
  country: string;
  currency: Currency;
}

export type Currency = "INR" | "USD" | "EUR" | "GBP" | "AUD" | "CAD";

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: "INR", label: "Indian Rupee", symbol: "₹" },
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "AUD", label: "Australian Dollar", symbol: "A$" },
  { value: "CAD", label: "Canadian Dollar", symbol: "C$" },
];

export const DONATION_TIERS: Record<Currency, { amount: number; label: string; icon: string }[]> = {
  INR: [
    { amount: 49, label: "Coffee", icon: "coffee" },
    { amount: 99, label: "Snack", icon: "food" },
    { amount: 199, label: "Meal", icon: "food-variant" },
    { amount: 499, label: "Generous", icon: "gift" },
  ],
  USD: [
    { amount: 2, label: "Coffee", icon: "coffee" },
    { amount: 5, label: "Snack", icon: "food" },
    { amount: 10, label: "Meal", icon: "food-variant" },
    { amount: 25, label: "Generous", icon: "gift" },
  ],
  EUR: [
    { amount: 2, label: "Coffee", icon: "coffee" },
    { amount: 5, label: "Snack", icon: "food" },
    { amount: 10, label: "Meal", icon: "food-variant" },
    { amount: 20, label: "Generous", icon: "gift" },
  ],
  GBP: [
    { amount: 2, label: "Coffee", icon: "coffee" },
    { amount: 4, label: "Snack", icon: "food" },
    { amount: 8, label: "Meal", icon: "food-variant" },
    { amount: 20, label: "Generous", icon: "gift" },
  ],
  AUD: [
    { amount: 3, label: "Coffee", icon: "coffee" },
    { amount: 7, label: "Snack", icon: "food" },
    { amount: 15, label: "Meal", icon: "food-variant" },
    { amount: 35, label: "Generous", icon: "gift" },
  ],
  CAD: [
    { amount: 3, label: "Coffee", icon: "coffee" },
    { amount: 7, label: "Snack", icon: "food" },
    { amount: 15, label: "Meal", icon: "food-variant" },
    { amount: 35, label: "Generous", icon: "gift" },
  ],
};

export const PaymentHandler = {
  getCurrencySymbol(currency: Currency): string {
    const found = CURRENCIES.find(c => c.value === currency);
    return found?.symbol || "$";
  },

  async getDonorStatus(): Promise<boolean> {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('na360_donor') === 'true';
    }
    return false;
  },

  async setDonorStatus(isDonor: boolean): Promise<void> {
    if (typeof window !== 'undefined') {
      if (isDonor) {
        localStorage.setItem('na360_donor', 'true');
      } else {
        localStorage.removeItem('na360_donor');
      }
    }
  },

  async openUPIPayment(amount: number): Promise<{ success: boolean; requiresConfirmation?: boolean; error?: string }> {
    const upiId = "theteam360@okaxis";
    const name = "The Team 360";
    const note = "Support New Audio 360";
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    
    try {
      if (typeof window !== 'undefined') {
        window.open(upiUrl, '_blank');
        return { success: true, requiresConfirmation: true };
      }
      return { success: false, error: "Unable to open UPI" };
    } catch (error) {
      return { success: false, error: "Failed to open UPI app" };
    }
  },

  async openPayPalPayment(amount: number, currency: Currency): Promise<{ success: boolean; requiresConfirmation?: boolean; error?: string }> {
    const paypalEmail = "theteam360@paypal.com";
    const paypalUrl = `https://www.paypal.com/paypalme/theteam360/${amount}${currency}`;
    
    try {
      if (typeof window !== 'undefined') {
        window.open(paypalUrl, '_blank');
        return { success: true, requiresConfirmation: true };
      }
      return { success: false, error: "Unable to open PayPal" };
    } catch (error) {
      return { success: false, error: "Failed to open PayPal" };
    }
  },
};

export async function detectUserRegion(): Promise<RegionDetectionResult> {
  try {
    const response = await fetch("https://ipapi.co/json/", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    
    if (!response.ok) {
      throw new Error("Failed to detect region");
    }
    
    const data = await response.json();
    const countryCode = data.country_code || "US";
    const isIndian = countryCode === "IN";
    
    return {
      country: countryCode,
      isIndian,
      currency: isIndian ? "INR" : "USD",
    };
  } catch (error) {
    return {
      country: "US",
      isIndian: false,
      currency: "USD",
    };
  }
}
