import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_PROFILE: 'auth_user_profile',
  SUBSCRIPTION: 'auth_subscription',
  ENTITLEMENT: 'auth_entitlement',
  BIOMETRIC_ENABLED: 'auth_biometric_enabled',
  LAST_AUTH_TIME: 'auth_last_time',
};

const AUTH_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const BIOMETRIC_CACHE_DURATION = 24 * 60 * 60 * 1000;

interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
}

interface SubscriptionState {
  plan: 'free' | 'standard' | 'premium';
  isActive: boolean;
  expiresAt: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  subscription: SubscriptionState | null;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  requiresReauth: boolean;
}

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<boolean>;
  signInAsTestUser: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  verifyPurchase: (purchaseToken: string, productId: string, packageName: string) => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
  hasActiveSubscription: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    subscription: null,
    biometricEnabled: false,
    biometricAvailable: false,
    requiresReauth: false,
  });

  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'newaudio360',
    path: 'auth',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: Platform.OS === 'android' ? GOOGLE_ANDROID_CLIENT_ID : GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleAuthResponse(response);
    }
  }, [response]);

  const checkBiometricAvailability = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch {
      return false;
    }
  };

  const initializeAuth = async () => {
    try {
      const biometricAvailable = await checkBiometricAvailability();
      const biometricEnabled = (await secureGet(STORAGE_KEYS.BIOMETRIC_ENABLED)) === 'true';

      const accessToken = await secureGet(STORAGE_KEYS.ACCESS_TOKEN);
      const userJson = await secureGet(STORAGE_KEYS.USER_PROFILE);
      const subscriptionJson = await secureGet(STORAGE_KEYS.SUBSCRIPTION);
      const lastAuthTime = await secureGet(STORAGE_KEYS.LAST_AUTH_TIME);

      if (!accessToken || !userJson) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          biometricAvailable,
          biometricEnabled,
        }));
        return;
      }

      const user = JSON.parse(userJson) as UserProfile;
      const subscription = subscriptionJson ? JSON.parse(subscriptionJson) as SubscriptionState : null;

      const lastAuth = lastAuthTime ? parseInt(lastAuthTime, 10) : 0;
      const now = Date.now();
      const authExpired = now - lastAuth > AUTH_CACHE_DURATION;
      const biometricExpired = now - lastAuth > BIOMETRIC_CACHE_DURATION;

      if (authExpired) {
        const refreshed = await refreshSessionInternal();
        if (!refreshed) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            biometricAvailable,
            biometricEnabled,
            requiresReauth: true,
          }));
          return;
        }
      }

      const requiresBiometric = biometricEnabled && biometricExpired;

      setState({
        isAuthenticated: !requiresBiometric,
        isLoading: false,
        user,
        subscription,
        biometricEnabled,
        biometricAvailable,
        requiresReauth: requiresBiometric,
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleGoogleAuthResponse = async (response: AuthSession.AuthSessionResult) => {
    if (response.type !== 'success' || !response.params.id_token) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const apiResponse = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.params.id_token }),
      });

      if (!apiResponse.ok) {
        throw new Error('Authentication failed');
      }

      const data = await apiResponse.json();

      await secureSet(STORAGE_KEYS.ACCESS_TOKEN, data.tokens.accessToken);
      await secureSet(STORAGE_KEYS.REFRESH_TOKEN, data.tokens.refreshToken);
      await secureSet(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.user));
      await secureSet(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(data.subscription));
      await secureSet(STORAGE_KEYS.LAST_AUTH_TIME, Date.now().toString());

      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        user: data.user,
        subscription: data.subscription,
        requiresReauth: false,
      }));
    } catch (error) {
      console.error('Google auth error:', error);
      Alert.alert('Sign In Failed', 'Unable to sign in with Google. Please try again.');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const result = await promptAsync();
      return result.type === 'success';
    } catch (error) {
      console.error('Sign in error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [promptAsync]);

  const signInAsTestUser = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const testUser: UserProfile = {
        id: 'test-user-001',
        email: 'test@newaudio360.com',
        displayName: 'Test User',
        photoUrl: null,
      };

      const testSubscription: SubscriptionState = {
        plan: 'premium',
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await secureSet(STORAGE_KEYS.ACCESS_TOKEN, 'test-access-token');
      await secureSet(STORAGE_KEYS.REFRESH_TOKEN, 'test-refresh-token');
      await secureSet(STORAGE_KEYS.USER_PROFILE, JSON.stringify(testUser));
      await secureSet(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(testSubscription));
      await secureSet(STORAGE_KEYS.LAST_AUTH_TIME, Date.now().toString());

      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        user: testUser,
        subscription: testSubscription,
        requiresReauth: false,
      }));

      return true;
    } catch (error) {
      console.error('Test sign in error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  const refreshSessionInternal = async (): Promise<boolean> => {
    try {
      const refreshToken = await secureGet(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();

      await secureSet(STORAGE_KEYS.ACCESS_TOKEN, data.tokens.accessToken);
      await secureSet(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.user));
      await secureSet(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(data.subscription));
      await secureSet(STORAGE_KEYS.LAST_AUTH_TIME, Date.now().toString());

      return true;
    } catch {
      return false;
    }
  };

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const success = await refreshSessionInternal();
    if (success) {
      await initializeAuth();
    }
    return success;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await Promise.all([
      secureDelete(STORAGE_KEYS.ACCESS_TOKEN),
      secureDelete(STORAGE_KEYS.REFRESH_TOKEN),
      secureDelete(STORAGE_KEYS.USER_PROFILE),
      secureDelete(STORAGE_KEYS.SUBSCRIPTION),
      secureDelete(STORAGE_KEYS.ENTITLEMENT),
      secureDelete(STORAGE_KEYS.LAST_AUTH_TIME),
    ]);

    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      subscription: null,
      biometricEnabled: state.biometricEnabled,
      biometricAvailable: state.biometricAvailable,
      requiresReauth: false,
    });
  }, [state.biometricEnabled, state.biometricAvailable]);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!state.biometricAvailable) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric login',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        await secureSet(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
        setState(prev => ({ ...prev, biometricEnabled: true }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [state.biometricAvailable]);

  const disableBiometric = useCallback(async (): Promise<void> => {
    await secureDelete(STORAGE_KEYS.BIOMETRIC_ENABLED);
    setState(prev => ({ ...prev, biometricEnabled: false }));
  }, []);

  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    if (!state.biometricEnabled) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock New Audio 360',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        await secureSet(STORAGE_KEYS.LAST_AUTH_TIME, Date.now().toString());
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          requiresReauth: false,
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [state.biometricEnabled]);

  const verifyPurchase = useCallback(async (
    purchaseToken: string,
    productId: string,
    packageName: string
  ): Promise<boolean> => {
    try {
      const accessToken = await secureGet(STORAGE_KEYS.ACCESS_TOKEN);
      if (!accessToken) return false;

      const response = await fetch(`${API_BASE_URL}/api/subscription/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ purchaseToken, productId, packageName }),
      });

      if (!response.ok) return false;

      const data = await response.json();

      await secureSet(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(data.subscription));
      if (data.entitlement) {
        await secureSet(STORAGE_KEYS.ENTITLEMENT, data.entitlement);
      }

      setState(prev => ({
        ...prev,
        subscription: data.subscription,
      }));

      return true;
    } catch {
      return false;
    }
  }, []);

  const checkSubscriptionStatus = useCallback(async (): Promise<void> => {
    try {
      const accessToken = await secureGet(STORAGE_KEYS.ACCESS_TOKEN);
      if (!accessToken) return;

      const response = await fetch(`${API_BASE_URL}/api/subscription/status`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      await secureSet(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(data.subscription));
      if (data.entitlement) {
        await secureSet(STORAGE_KEYS.ENTITLEMENT, data.entitlement);
      }

      setState(prev => ({
        ...prev,
        subscription: data.subscription,
      }));
    } catch (error) {
      console.error('Subscription check error:', error);
    }
  }, []);

  const hasActiveSubscription = useCallback((): boolean => {
    if (!state.subscription) return false;
    return state.subscription.isActive && state.subscription.plan !== 'free';
  }, [state.subscription]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithGoogle,
        signInAsTestUser,
        signOut,
        refreshSession,
        enableBiometric,
        disableBiometric,
        authenticateWithBiometric,
        verifyPurchase,
        checkSubscriptionStatus,
        hasActiveSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
