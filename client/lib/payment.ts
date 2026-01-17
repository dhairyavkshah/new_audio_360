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
}

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
    };
  } catch (error) {
    return {
      country: "US",
      isIndian: false,
    };
  }
}
