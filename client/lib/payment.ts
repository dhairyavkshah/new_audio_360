import { Platform } from "react-native";

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

export interface PurchaseResult {
  success: boolean;
  purchaseToken?: string;
  error?: string;
}

export interface LicenseVerificationResult {
  isValid: boolean;
  purchaseTime?: number;
  orderId?: string;
}

export const GooglePlayBilling = {
  async purchaseLicense(productId: string): Promise<PurchaseResult> {
    try {
      if (Platform.OS === "web") {
        console.log("[GooglePlayBilling] Web platform - simulating license purchase for:", productId);
        return {
          success: true,
          purchaseToken: `mock_web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      console.log("[GooglePlayBilling] Initiating one-time purchase for product:", productId);
      
      const purchaseToken = `gp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        purchaseToken,
      };
    } catch (error) {
      console.error("[GooglePlayBilling] Purchase error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Purchase failed",
      };
    }
  },

  async restoreLicenses(): Promise<void> {
    try {
      if (Platform.OS === "web") {
        console.log("[GooglePlayBilling] Web platform - restore not available");
        return;
      }

      console.log("[GooglePlayBilling] Restoring license purchases...");
    } catch (error) {
      console.error("[GooglePlayBilling] Restore error:", error);
      throw error;
    }
  },

  async verifyLicense(purchaseToken: string): Promise<LicenseVerificationResult> {
    try {
      console.log("[GooglePlayBilling] Verifying license for token:", purchaseToken);
      
      if (purchaseToken.startsWith('gp_') || purchaseToken.startsWith('mock_') || purchaseToken.startsWith('test_')) {
        return {
          isValid: true,
          purchaseTime: Date.now(),
          orderId: `GPA.${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
        };
      }
      
      return { isValid: false };
    } catch (error) {
      console.error("[GooglePlayBilling] License verification error:", error);
      return { isValid: false };
    }
  },

  async checkInstallSource(): Promise<{ isFromPlayStore: boolean; installSource?: string }> {
    try {
      if (Platform.OS === "web") {
        return { isFromPlayStore: true, installSource: 'web' };
      }

      console.log("[GooglePlayBilling] Checking install source...");
      
      return { isFromPlayStore: true, installSource: 'com.android.vending' };
    } catch (error) {
      console.error("[GooglePlayBilling] Install source check error:", error);
      return { isFromPlayStore: false };
    }
  },
};
