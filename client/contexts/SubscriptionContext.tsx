import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeName } from '@/constants/theme';

export type SubscriptionPlan = 'free' | 'standard' | 'premium';

export interface SubscriptionState {
  plan: SubscriptionPlan;
  purchaseToken: string | null;
  productId: string | null;
  purchaseTime: number | null;
}

const STORAGE_KEY = 'subscription_state';

const STANDARD_THEMES: ThemeName[] = [
  'fluent',
  'fluentDark',
  'nightAmoled',
  'warmNeutral',
  'coolBlue',
];

const STANDARD_NOISE_REDUCTION = ['Off', 'Light'];
const STANDARD_REVERB = ['None', 'Small Studio'];

export const PRODUCT_IDS = {
  standard: 'new_audio_360_standard',
  premium: 'new_audio_360_premium',
  upgrade: 'new_audio_360_upgrade_premium',
};

export const PRICING = {
  INR: {
    standard: 100,
    premium: 299,
    upgrade: 199,
    symbol: '₹',
  },
  USD: {
    standard: 10,
    premium: 30,
    upgrade: 20,
    symbol: '$',
  },
  EUR: {
    standard: 9,
    premium: 27,
    upgrade: 18,
    symbol: '€',
  },
  GBP: {
    standard: 8,
    premium: 24,
    upgrade: 16,
    symbol: '£',
  },
  AUD: {
    standard: 15,
    premium: 45,
    upgrade: 30,
    symbol: 'A$',
  },
  CAD: {
    standard: 14,
    premium: 42,
    upgrade: 28,
    symbol: 'C$',
  },
  JPY: {
    standard: 1500,
    premium: 4500,
    upgrade: 3000,
    symbol: '¥',
  },
  BRL: {
    standard: 50,
    premium: 150,
    upgrade: 100,
    symbol: 'R$',
  },
} as const;

export type SupportedCurrency = keyof typeof PRICING;

interface SubscriptionContextType {
  plan: SubscriptionPlan;
  isLoading: boolean;
  isThemeUnlocked: (themeId: ThemeName) => boolean;
  isImmersiveModeUnlocked: () => boolean;
  isNoiseReductionUnlocked: (level: string) => boolean;
  isReverbUnlocked: (reverb: string) => boolean;
  getAvailableThemes: () => ThemeName[];
  purchaseStandard: () => Promise<boolean>;
  purchasePremium: () => Promise<boolean>;
  upgradeToPremiun: () => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  setPlanForTesting: (plan: SubscriptionPlan) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({
    plan: 'free',
    purchaseToken: null,
    productId: null,
    purchaseTime: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionState();
  }, []);

  const loadSubscriptionState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SubscriptionState;
        setState(parsed);
      }
    } catch (error) {
      console.error('Error loading subscription state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSubscriptionState = async (newState: SubscriptionState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      setState(newState);
    } catch (error) {
      console.error('Error saving subscription state:', error);
    }
  };

  const isThemeUnlocked = useCallback((themeId: ThemeName): boolean => {
    if (state.plan === 'premium') return true;
    if (state.plan === 'standard') return STANDARD_THEMES.includes(themeId);
    return STANDARD_THEMES.includes(themeId);
  }, [state.plan]);

  const getAvailableThemes = useCallback((): ThemeName[] => {
    if (state.plan === 'premium') {
      return [];
    }
    return STANDARD_THEMES;
  }, [state.plan]);

  const isImmersiveModeUnlocked = useCallback((): boolean => {
    return state.plan === 'premium';
  }, [state.plan]);

  const isNoiseReductionUnlocked = useCallback((level: string): boolean => {
    if (state.plan === 'premium') return true;
    return STANDARD_NOISE_REDUCTION.includes(level);
  }, [state.plan]);

  const isReverbUnlocked = useCallback((reverb: string): boolean => {
    if (state.plan === 'premium') return true;
    return STANDARD_REVERB.includes(reverb);
  }, [state.plan]);

  const purchaseStandard = useCallback(async (): Promise<boolean> => {
    try {
      const newState: SubscriptionState = {
        plan: 'standard',
        purchaseToken: `mock_token_${Date.now()}`,
        productId: PRODUCT_IDS.standard,
        purchaseTime: Date.now(),
      };
      await saveSubscriptionState(newState);
      return true;
    } catch (error) {
      console.error('Error purchasing standard:', error);
      return false;
    }
  }, []);

  const purchasePremium = useCallback(async (): Promise<boolean> => {
    try {
      const newState: SubscriptionState = {
        plan: 'premium',
        purchaseToken: `mock_token_${Date.now()}`,
        productId: PRODUCT_IDS.premium,
        purchaseTime: Date.now(),
      };
      await saveSubscriptionState(newState);
      return true;
    } catch (error) {
      console.error('Error purchasing premium:', error);
      return false;
    }
  }, []);

  const upgradeToPremiun = useCallback(async (): Promise<boolean> => {
    if (state.plan !== 'standard') return false;
    try {
      const newState: SubscriptionState = {
        plan: 'premium',
        purchaseToken: `mock_token_${Date.now()}`,
        productId: PRODUCT_IDS.upgrade,
        purchaseTime: Date.now(),
      };
      await saveSubscriptionState(newState);
      return true;
    } catch (error) {
      console.error('Error upgrading to premium:', error);
      return false;
    }
  }, [state.plan]);

  const restorePurchases = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await loadSubscriptionState();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setPlanForTesting = useCallback((plan: SubscriptionPlan) => {
    const newState: SubscriptionState = {
      plan,
      purchaseToken: plan === 'free' ? null : `test_token_${Date.now()}`,
      productId: plan === 'free' ? null : plan === 'standard' ? PRODUCT_IDS.standard : PRODUCT_IDS.premium,
      purchaseTime: plan === 'free' ? null : Date.now(),
    };
    saveSubscriptionState(newState);
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        plan: state.plan,
        isLoading,
        isThemeUnlocked,
        isImmersiveModeUnlocked,
        isNoiseReductionUnlocked,
        isReverbUnlocked,
        getAvailableThemes,
        purchaseStandard,
        purchasePremium,
        upgradeToPremiun,
        restorePurchases,
        setPlanForTesting,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
