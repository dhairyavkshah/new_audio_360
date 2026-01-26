/**
 * Store License Verification (Android Play Store & iOS App Store)
 * 
 * Simple one-time purchase model:
 * - App is a PAID app on both stores
 * - Android: Google Play Store (₹311 / $13.11)
 * - iOS: App Store (same pricing, converted to local currency)
 * - User purchases and downloads from respective store
 * - Since the app is PAID, anyone who downloads from either store has already paid
 * 
 * No sign-in required - purchase happens at download time on respective store.
 * 
 * License verification:
 * - Android: Uses native module to check installer package name
 *   - Play Store installs have installer = "com.android.vending"
 *   - Sideloaded APKs have different or null installer
 * - iOS (iPhone Mode): App Store receipt validation
 *   - App Store installs are verified via receipt presence
 *   - TestFlight builds are auto-licensed for testing
 * 
 * For development builds:
 * - Auto-licensed for testing
 */

import { Platform } from "react-native";
import Constants from 'expo-constants';
import { LicenseVerificationModule } from '../../modules/audio-effects';

// Import react-native-iap for iOS receipt validation (only used on iOS)
let getReceiptIOS: (() => Promise<string | null>) | null = null;
if (Platform.OS === 'ios') {
  try {
    // Dynamic import to avoid issues on non-iOS platforms
    const RNIap = require('react-native-iap');
    getReceiptIOS = RNIap.getReceiptIOS;
  } catch (e) {
    console.log('[AppStoreVerification] react-native-iap not available for receipt validation');
  }
}

const APP_VARIANT = Constants.expoConfig?.extra?.appVariant;
const IS_PRODUCTION = APP_VARIANT === 'production';
// Bypass license in development, preview, or testing builds (testing = production APK without license check)
const IS_DEVELOPMENT = APP_VARIANT === 'development' || APP_VARIANT === 'preview' || APP_VARIANT === 'testing';

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
        // iPhone Mode: App Store license verification for PAID app
        // Uses react-native-iap getReceiptIOS() to verify App Store receipt presence
        // 
        // Verification approach:
        // 1. Expo Go / Development builds → auto-license for testing
        // 2. Production builds → verify App Store receipt exists (fail-closed)
        //
        // For paid apps, receipt presence indicates App Store installation.
        // Sideloaded or enterprise builds won't have a valid App Store receipt.
        
        const isExpoGo = Constants.appOwnership === 'expo';
        const isDevBuild = APP_VARIANT === 'development' || APP_VARIANT === 'preview';
        
        // Detect test/development environment (NOT using __DEV__ to avoid false positives)
        const isTestEnvironment = isExpoGo || isDevBuild;
        
        console.log("[AppStoreVerification] iOS device detected", {
          isExpoGo,
          isDevBuild,
          appVariant: APP_VARIANT,
          hasReceiptAPI: !!getReceiptIOS,
        });
        
        if (isTestEnvironment) {
          // Auto-license for Expo Go and development/preview builds only
          const source = isExpoGo ? 'expo_go' : 'development';
          console.log(`[AppStoreVerification] Test environment detected: ${source}`);
          return {
            isValidInstall: true,
            installSource: source,
            purchase: {
              productId: PRODUCT_ID,
              installSource: source,
              installTime: Date.now(),
            },
          };
        }
        
        // Production iOS build - verify App Store receipt presence
        // For paid apps, the receipt proves App Store installation
        if (getReceiptIOS) {
          try {
            const receipt = await getReceiptIOS();
            
            if (receipt && receipt.length > 0) {
              console.log("[AppStoreVerification] App Store receipt found - valid install");
              return {
                isValidInstall: true,
                installSource: 'app_store',
                purchase: {
                  productId: PRODUCT_ID,
                  installSource: 'app_store',
                  installTime: Date.now(),
                },
              };
            } else {
              console.log("[AppStoreVerification] No App Store receipt - sideloaded install");
              return {
                isValidInstall: false,
                installSource: 'sideloaded',
                error: 'App not installed from App Store',
              };
            }
          } catch (receiptError) {
            // Receipt fetch error - fail closed for security
            console.log("[AppStoreVerification] Receipt validation failed:", receiptError);
            return {
              isValidInstall: false,
              installSource: 'receipt_error',
              error: 'Unable to verify App Store installation',
            };
          }
        } else {
          // react-native-iap not available - fail closed
          console.log("[AppStoreVerification] Receipt API not available - cannot verify");
          return {
            isValidInstall: false,
            installSource: 'no_receipt_api',
            error: 'License verification not available',
          };
        }
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
