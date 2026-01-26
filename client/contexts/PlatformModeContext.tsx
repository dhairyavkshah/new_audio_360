import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { Platform } from 'react-native';

export type PlatformMode = 'android' | 'iphone' | 'web';

export interface PlatformCapabilities {
  hasNativeAudioEffects: boolean;
  hasNativeFMRadio: boolean;
  hasNativeMediaScanner: boolean;
  hasNativeLicenseVerification: boolean;
  hasNativeBiometrics: boolean;
  supportsBackgroundAudio: boolean;
  requiresAppStoreCompliance: boolean;
  requiresPlayStoreCompliance: boolean;
  storeDisplayName: string;
  storePurchaseUrl: string;
}

interface PlatformModeContextType {
  mode: PlatformMode;
  isAndroid: boolean;
  isIPhone: boolean;
  isWeb: boolean;
  capabilities: PlatformCapabilities;
}

const ANDROID_CAPABILITIES: PlatformCapabilities = {
  hasNativeAudioEffects: true,
  hasNativeFMRadio: true,
  hasNativeMediaScanner: true,
  hasNativeLicenseVerification: true,
  hasNativeBiometrics: true,
  supportsBackgroundAudio: true,
  requiresAppStoreCompliance: false,
  requiresPlayStoreCompliance: true,
  storeDisplayName: 'Google Play Store',
  storePurchaseUrl: 'https://play.google.com/store/apps/details?id=com.theteam360.newaudio360',
};

const IPHONE_CAPABILITIES: PlatformCapabilities = {
  hasNativeAudioEffects: false,
  hasNativeFMRadio: false,
  hasNativeMediaScanner: false,
  hasNativeLicenseVerification: false,
  hasNativeBiometrics: true,
  supportsBackgroundAudio: true,
  requiresAppStoreCompliance: true,
  requiresPlayStoreCompliance: false,
  storeDisplayName: 'App Store',
  storePurchaseUrl: 'https://apps.apple.com/app/new-audio-360/id0000000000',
};

const WEB_CAPABILITIES: PlatformCapabilities = {
  hasNativeAudioEffects: false,
  hasNativeFMRadio: false,
  hasNativeMediaScanner: false,
  hasNativeLicenseVerification: false,
  hasNativeBiometrics: false,
  supportsBackgroundAudio: false,
  requiresAppStoreCompliance: false,
  requiresPlayStoreCompliance: false,
  storeDisplayName: 'Web',
  storePurchaseUrl: '',
};

const PlatformModeContext = createContext<PlatformModeContextType | undefined>(undefined);

function detectPlatformMode(): PlatformMode {
  if (Platform.OS === 'ios') return 'iphone';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

function getCapabilities(mode: PlatformMode): PlatformCapabilities {
  switch (mode) {
    case 'android':
      return ANDROID_CAPABILITIES;
    case 'iphone':
      return IPHONE_CAPABILITIES;
    case 'web':
      return WEB_CAPABILITIES;
  }
}

export function PlatformModeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<PlatformModeContextType>(() => {
    const mode = detectPlatformMode();
    return {
      mode,
      isAndroid: mode === 'android',
      isIPhone: mode === 'iphone',
      isWeb: mode === 'web',
      capabilities: getCapabilities(mode),
    };
  }, []);

  return (
    <PlatformModeContext.Provider value={value}>
      {children}
    </PlatformModeContext.Provider>
  );
}

export function usePlatformMode(): PlatformModeContextType {
  const context = useContext(PlatformModeContext);
  if (context === undefined) {
    throw new Error('usePlatformMode must be used within a PlatformModeProvider');
  }
  return context;
}

export function getPlatformMode(): PlatformMode {
  return detectPlatformMode();
}

export function getPlatformCapabilities(): PlatformCapabilities {
  return getCapabilities(detectPlatformMode());
}
