import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SecureStorage } from '@/services/SecureStorage';
import { GooglePlayLicense, PurchaseInfo, PRODUCT_ID } from '@/lib/payment';

const APP_VARIANT = Constants.expoConfig?.extra?.appVariant || process.env.APP_ENV || 'production';
const LICENSE_MODE = process.env.EXPO_PUBLIC_LICENSE_MODE || 'trial';
const IS_DEV = __DEV__ === true;
const IS_WEB_DEV = Platform.OS === 'web' && IS_DEV;
const DEV_MODE_BYPASS_LICENSE = IS_WEB_DEV; // Bypass license check for web dev mode
const TESTING_MODE_BYPASS_LICENSE = APP_VARIANT === 'testing'; // Standalone testing APK bypasses license check
const IS_PRODUCTION = APP_VARIANT === 'production';
const ELECTRON_LICENSED_MODE = LICENSE_MODE === 'licensed'; // Electron builds with license passed

export type LicenseStatus = 'checking' | 'unlicensed' | 'licensed';

export interface LicenseState {
  status: LicenseStatus;
  purchase: PurchaseInfo | null;
}

const SECURE_STORAGE_KEY = 'license_data';

export const PRICING = {
  india: {
    amount: 311,
    symbol: '₹',
    currency: 'INR',
  },
  international: {
    amount: 13.11,
    symbol: '$',
    currency: 'USD',
  },
} as const;

export type SupportedCurrency = 'INR' | 'USD';

interface LicenseContextType {
  licenseStatus: LicenseStatus;
  isLoading: boolean;
  purchase: PurchaseInfo | null;
  isLicensed: boolean;
  checkLicenseStatus: () => Promise<void>;
  setLicenseForTesting: (status: LicenseStatus) => void;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LicenseState>({
    status: 'checking',
    purchase: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeLicense();
  }, []);

  const initializeLicense = async () => {
    try {
      if (DEV_MODE_BYPASS_LICENSE || TESTING_MODE_BYPASS_LICENSE || ELECTRON_LICENSED_MODE) {
        const mode = ELECTRON_LICENSED_MODE ? 'Electron licensed' : (TESTING_MODE_BYPASS_LICENSE ? 'Testing' : 'Development');
        console.log(`[License] ${mode} mode - license verified`);
        const devState: LicenseState = {
          status: 'licensed',
          purchase: {
            productId: PRODUCT_ID,
            installSource: ELECTRON_LICENSED_MODE ? 'electron' : (TESTING_MODE_BYPASS_LICENSE ? 'testing' : 'development'),
            installTime: Date.now(),
          },
        };
        setState(devState);
        setIsLoading(false);
        return;
      }

      // Production must verify the current installer on every launch. This
      // prevents a sideloaded build from inheriting a cached licensed state.
      if (!IS_PRODUCTION) {
        const stored = await SecureStorage.getSecureItem(SECURE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as LicenseState;
          if (parsed.status === 'licensed' && parsed.purchase) {
            setState(parsed);
            setIsLoading(false);
            return;
          }
        }
      }

      const result = await GooglePlayLicense.checkPurchaseStatus();
      
      if (result.isPurchased && result.purchase) {
        const newState: LicenseState = {
          status: 'licensed',
          purchase: result.purchase,
        };
        await SecureStorage.setSecureItem(SECURE_STORAGE_KEY, JSON.stringify(newState));
        setState(newState);
      } else {
        setState({ status: 'unlicensed', purchase: null });
      }
    } catch (error) {
      console.error('License initialization error:', error);
      setState({ status: 'unlicensed', purchase: null });
    } finally {
      setIsLoading(false);
    }
  };

  const checkLicenseStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await GooglePlayLicense.checkPurchaseStatus();
      
      if (result.isPurchased && result.purchase) {
        const newState: LicenseState = {
          status: 'licensed',
          purchase: result.purchase,
        };
        await SecureStorage.setSecureItem(SECURE_STORAGE_KEY, JSON.stringify(newState));
        setState(newState);
      } else {
        setState({ status: 'unlicensed', purchase: null });
      }
    } catch (error) {
      console.error('License check error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setLicenseForTesting = useCallback((status: LicenseStatus) => {
    const newState: LicenseState = {
      status,
      purchase: status === 'licensed' ? {
        productId: PRODUCT_ID,
        installSource: 'test',
        installTime: Date.now(),
      } : null,
    };
    SecureStorage.setSecureItem(SECURE_STORAGE_KEY, JSON.stringify(newState));
    setState(newState);
  }, []);

  const isLicensed = state.status === 'licensed';

  return (
    <LicenseContext.Provider
      value={{
        licenseStatus: state.status,
        isLoading,
        purchase: state.purchase,
        isLicensed,
        checkLicenseStatus,
        setLicenseForTesting,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
