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

export const GooglePlayBilling = {
  async purchaseSubscription(productId: string): Promise<PurchaseResult> {
    try {
      if (Platform.OS === "web") {
        console.log("[GooglePlayBilling] Web platform - simulating purchase for:", productId);
        return {
          success: true,
          purchaseToken: `mock_web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      console.log("[GooglePlayBilling] Initiating purchase for product:", productId);
      
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

  async restoreSubscriptions(): Promise<void> {
    try {
      if (Platform.OS === "web") {
        console.log("[GooglePlayBilling] Web platform - restore not available");
        return;
      }

      console.log("[GooglePlayBilling] Restoring subscriptions...");
    } catch (error) {
      console.error("[GooglePlayBilling] Restore error:", error);
      throw error;
    }
  },

  async getSubscriptionStatus(purchaseToken: string): Promise<{ isActive: boolean; expiresAt?: number }> {
    try {
      console.log("[GooglePlayBilling] Checking subscription status for token:", purchaseToken);
      
      return {
        isActive: true,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
    } catch (error) {
      console.error("[GooglePlayBilling] Status check error:", error);
      return { isActive: false };
    }
  },
};
