/**
 * Google Play License Verification
 * 
 * This module handles direct Google Play purchase verification.
 * No server required - all verification happens on-device.
 * 
 * PRODUCTION SETUP:
 * 1. Install react-native-iap: npm install react-native-iap
 * 2. Configure in app.json/app.config.js for Expo EAS Build
 * 3. Replace stubs below with real react-native-iap calls
 * 4. Set up the product in Google Play Console with ID: new_audio_360_lifetime
 * 
 * The current implementation has development stubs for testing.
 * Web platform uses localStorage; Android uses mock responses.
 */

import { Platform } from "react-native";
import Constants from 'expo-constants';

const IS_PRODUCTION = Constants.expoConfig?.extra?.appVariant === 'production';

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

export interface PurchaseInfo {
  productId: string;
  purchaseToken: string;
  purchaseTime: number;
  orderId: string;
}

export interface PurchaseVerificationResult {
  isPurchased: boolean;
  purchase?: PurchaseInfo;
  error?: string;
}

export const PRODUCT_ID = 'new_audio_360_lifetime';

export const GooglePlayLicense = {
  async checkPurchaseStatus(): Promise<PurchaseVerificationResult> {
    try {
      if (Platform.OS === "web") {
        const storedPurchase = localStorage.getItem('na360_test_purchase');
        if (storedPurchase) {
          return {
            isPurchased: true,
            purchase: JSON.parse(storedPurchase),
          };
        }
        return { isPurchased: false };
      }

      if (IS_PRODUCTION) {
        console.warn("[GooglePlayLicense] Production mode: react-native-iap integration required for real purchase verification");
      } else {
        console.log("[GooglePlayLicense] Development mode: Checking purchase status...");
      }
      
      return { isPurchased: false };
    } catch (error) {
      console.error("[GooglePlayLicense] Error checking purchase:", error);
      return {
        isPurchased: false,
        error: error instanceof Error ? error.message : "Failed to verify purchase",
      };
    }
  },

  async purchaseApp(): Promise<PurchaseVerificationResult> {
    try {
      if (Platform.OS === "web") {
        const mockPurchase: PurchaseInfo = {
          productId: PRODUCT_ID,
          purchaseToken: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          purchaseTime: Date.now(),
          orderId: `GPA.WEB.${Date.now()}`,
        };
        localStorage.setItem('na360_test_purchase', JSON.stringify(mockPurchase));
        return {
          isPurchased: true,
          purchase: mockPurchase,
        };
      }

      if (IS_PRODUCTION) {
        console.warn("[GooglePlayLicense] Production mode: react-native-iap integration required for real purchases");
        return {
          isPurchased: false,
          error: "In-app purchases require react-native-iap integration",
        };
      }

      console.log("[GooglePlayLicense] Development mode: Initiating mock purchase...");
      
      const mockPurchase: PurchaseInfo = {
        productId: PRODUCT_ID,
        purchaseToken: `gp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        purchaseTime: Date.now(),
        orderId: `GPA.${Date.now()}`,
      };
      
      return {
        isPurchased: true,
        purchase: mockPurchase,
      };
    } catch (error) {
      console.error("[GooglePlayLicense] Purchase error:", error);
      return {
        isPurchased: false,
        error: error instanceof Error ? error.message : "Purchase failed",
      };
    }
  },

  async restorePurchases(): Promise<PurchaseVerificationResult> {
    try {
      if (Platform.OS === "web") {
        const storedPurchase = localStorage.getItem('na360_test_purchase');
        if (storedPurchase) {
          return {
            isPurchased: true,
            purchase: JSON.parse(storedPurchase),
          };
        }
        return { isPurchased: false };
      }

      if (IS_PRODUCTION) {
        console.warn("[GooglePlayLicense] Production mode: react-native-iap integration required for restoring purchases");
      } else {
        console.log("[GooglePlayLicense] Development mode: Restoring purchases...");
      }
      
      return { isPurchased: false };
    } catch (error) {
      console.error("[GooglePlayLicense] Restore error:", error);
      return {
        isPurchased: false,
        error: error instanceof Error ? error.message : "Failed to restore purchases",
      };
    }
  },

  clearTestPurchase(): void {
    if (Platform.OS === "web") {
      localStorage.removeItem('na360_test_purchase');
    }
  },
};
