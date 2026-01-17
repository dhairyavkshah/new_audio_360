import { Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DONOR_KEY = "@new_audio_360_is_donor";
const UPI_ID = process.env.EXPO_PUBLIC_UPI_ID || "dhairyavkshah@icici";
const PAYEE_NAME = process.env.EXPO_PUBLIC_PAYEE_NAME || "Dhairya Shah";
const PAYPAL_USERNAME = process.env.EXPO_PUBLIC_PAYPAL_USERNAME || "dhairyavkshah";

export type Currency = "INR" | "USD" | "EUR" | "GBP" | "AED";

export interface PaymentResult {
  success: boolean;
  method: "upi" | "paypal";
  requiresConfirmation: boolean;
  error?: string;
}

export interface GeoDetectionResult {
  country: string;
  currency: Currency;
  isIndian: boolean;
}

export async function detectUserRegion(): Promise<GeoDetectionResult> {
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
    
    const currencyMap: Record<string, Currency> = {
      IN: "INR",
      US: "USD",
      GB: "GBP",
      AE: "AED",
      DE: "EUR",
      FR: "EUR",
      IT: "EUR",
      ES: "EUR",
      NL: "EUR",
      BE: "EUR",
      AT: "EUR",
      IE: "EUR",
      PT: "EUR",
      FI: "EUR",
      GR: "EUR",
    };
    
    const detectedCurrency = currencyMap[countryCode] || "USD";
    const isIndian = countryCode === "IN";
    
    return {
      country: countryCode,
      currency: detectedCurrency,
      isIndian,
    };
  } catch (error) {
    return {
      country: "US",
      currency: "USD",
      isIndian: false,
    };
  }
}

export const PaymentHandler = {
  validateAmount(amount: number | string): { valid: boolean; sanitized: number; error?: string } {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return { valid: false, sanitized: 0, error: "Invalid amount" };
    }
    
    if (numAmount <= 0) {
      return { valid: false, sanitized: 0, error: "Amount must be greater than 0" };
    }
    
    if (numAmount > 100000) {
      return { valid: false, sanitized: 0, error: "Amount exceeds maximum limit" };
    }
    
    const sanitized = Math.round(numAmount * 100) / 100;
    return { valid: true, sanitized };
  },

  buildUPIUrl(amount: number): string {
    const txnRef = `NA360_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: PAYEE_NAME,
      am: amount.toFixed(2),
      cu: "INR",
      tn: "Support New Audio 360",
      tr: txnRef,
      mode: "00",
    });
    return `upi://pay?${params.toString()}`;
  },

  buildPayPalUrl(amount: number, currency: Currency): string {
    return `https://www.paypal.me/${PAYPAL_USERNAME}/${amount}${currency}`;
  },

  async openUPIPayment(amount: number): Promise<PaymentResult> {
    const validation = this.validateAmount(amount);
    if (!validation.valid) {
      return {
        success: false,
        method: "upi",
        requiresConfirmation: false,
        error: validation.error,
      };
    }

    const upiUrl = this.buildUPIUrl(validation.sanitized);

    try {
      if (Platform.OS === "web") {
        return {
          success: false,
          method: "upi",
          requiresConfirmation: false,
          error: "UPI is not available on web. Please use the manual payment option.",
        };
      }

      const canOpen = await Linking.canOpenURL(upiUrl);
      if (!canOpen) {
        return {
          success: false,
          method: "upi",
          requiresConfirmation: false,
          error: "No UPI app found on this device.",
        };
      }

      await Linking.openURL(upiUrl);
      return {
        success: true,
        method: "upi",
        requiresConfirmation: true,
      };
    } catch (error) {
      return {
        success: false,
        method: "upi",
        requiresConfirmation: false,
        error: "Failed to open UPI app.",
      };
    }
  },

  async openPayPalPayment(amount: number, currency: Currency): Promise<PaymentResult> {
    const validation = this.validateAmount(amount);
    if (!validation.valid) {
      return {
        success: false,
        method: "paypal",
        requiresConfirmation: false,
        error: validation.error,
      };
    }

    const paypalUrl = this.buildPayPalUrl(validation.sanitized, currency);

    try {
      await Linking.openURL(paypalUrl);
      return {
        success: true,
        method: "paypal",
        requiresConfirmation: true,
      };
    } catch (error) {
      return {
        success: false,
        method: "paypal",
        requiresConfirmation: false,
        error: "Failed to open PayPal.",
      };
    }
  },

  async setDonorStatus(isDonor: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(DONOR_KEY, JSON.stringify(isDonor));
    } catch (error) {
      console.error("Failed to save donor status:", error);
    }
  },

  async getDonorStatus(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(DONOR_KEY);
      return value ? JSON.parse(value) : false;
    } catch (error) {
      return false;
    }
  },

  isUPICurrency(currency: Currency): boolean {
    return currency === "INR";
  },

  getCurrencySymbol(currency: Currency): string {
    const symbols: Record<Currency, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
      AED: "د.إ",
    };
    return symbols[currency] || currency;
  },
};

export const CURRENCIES: { value: Currency; label: string; symbol: string; flag: string }[] = [
  { value: "INR", label: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  { value: "USD", label: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { value: "EUR", label: "Euro", symbol: "€", flag: "🇪🇺" },
  { value: "GBP", label: "British Pound", symbol: "£", flag: "🇬🇧" },
  { value: "AED", label: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
];

export const DONATION_TIERS: Record<Currency, { amount: number; label: string; icon: string }[]> = {
  INR: [
    { amount: 9, label: "Tea", icon: "coffee" },
    { amount: 29, label: "Snack", icon: "cookie" },
    { amount: 99, label: "Meal", icon: "food" },
    { amount: 299, label: "Support", icon: "hand-heart" },
    { amount: 599, label: "Champion", icon: "trophy" },
    { amount: 999, label: "Hero", icon: "star" },
  ],
  USD: [
    { amount: 1, label: "Tea", icon: "coffee" },
    { amount: 3, label: "Snack", icon: "cookie" },
    { amount: 5, label: "Meal", icon: "food" },
    { amount: 10, label: "Support", icon: "hand-heart" },
    { amount: 20, label: "Champion", icon: "trophy" },
    { amount: 50, label: "Hero", icon: "star" },
  ],
  EUR: [
    { amount: 1, label: "Tea", icon: "coffee" },
    { amount: 3, label: "Snack", icon: "cookie" },
    { amount: 5, label: "Meal", icon: "food" },
    { amount: 10, label: "Support", icon: "hand-heart" },
    { amount: 20, label: "Champion", icon: "trophy" },
    { amount: 50, label: "Hero", icon: "star" },
  ],
  GBP: [
    { amount: 1, label: "Tea", icon: "coffee" },
    { amount: 2, label: "Snack", icon: "cookie" },
    { amount: 4, label: "Meal", icon: "food" },
    { amount: 8, label: "Support", icon: "hand-heart" },
    { amount: 15, label: "Champion", icon: "trophy" },
    { amount: 40, label: "Hero", icon: "star" },
  ],
  AED: [
    { amount: 5, label: "Tea", icon: "coffee" },
    { amount: 10, label: "Snack", icon: "cookie" },
    { amount: 20, label: "Meal", icon: "food" },
    { amount: 40, label: "Support", icon: "hand-heart" },
    { amount: 75, label: "Champion", icon: "trophy" },
    { amount: 200, label: "Hero", icon: "star" },
  ],
};
