import React, { useState, useEffect } from "react";
import { StyleSheet, View, Platform, Text, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Font from "expo-font";
import { useFonts } from "expo-font";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Optional KeyboardProvider - falls back to Fragment if native module not available
let KeyboardProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
try {
  const keyboardController = require("react-native-keyboard-controller");
  KeyboardProvider = keyboardController.KeyboardProvider;
} catch (e) {
  KeyboardProvider = null;
}
import { StatusBar } from "expo-status-bar";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useSystemBars } from "@/hooks/useSystemBars";
import { UiSoundProvider } from "@/contexts/UiSoundContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { MediaLibraryProvider, useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { SoundLabProvider } from "@/contexts/SoundLabContext";
import { RadioProvider } from "@/contexts/RadioContext";
import { OnlineRadioProvider } from "@/contexts/OnlineRadioContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { PlatformModeProvider } from "@/contexts/PlatformModeContext";
import SplashScreen from "@/screens/SplashScreen";
import LoadingScreen from "@/screens/LoadingScreen";
import PermissionOnboardingFlow from "@/screens/PermissionOnboardingFlow";
import SubscriptionRequiredScreen from "@/screens/SubscriptionRequiredScreen";
import { AudioTipNotification } from "@/components/AudioTipNotification";

type AppState = "splash" | "loading" | "checkingOnboarding" | "onboarding" | "ready";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLicensed, isLoading: isLicenseLoading } = useSubscription();

  if (isLicenseLoading) {
    return <LoadingScreen message="Checking license..." />;
  }

  if (!isLicensed) {
    return <SubscriptionRequiredScreen />;
  }

  return <>{children}</>;
}

function AppContent() {
  const [appState, setAppState] = useState<AppState>("splash");
  const [showAudioTip, setShowAudioTip] = useState(false);
  const { isOnboardingComplete, isLoading, completeOnboarding, skipOnboarding } = useMediaLibraryContext();
  
  useSystemBars();

  const handleSplashFinish = () => {
    setAppState("loading");
    setTimeout(() => {
      setAppState("checkingOnboarding");
    }, 800);
  };

  useEffect(() => {
    if (appState === "checkingOnboarding") {
      if (isOnboardingComplete) {
        setAppState("ready");
        setTimeout(() => setShowAudioTip(true), 500);
      } else {
        setAppState("onboarding");
      }
    }
  }, [appState, isOnboardingComplete]);

  const handleOnboardingComplete = async () => {
    setAppState("loading");
    await completeOnboarding();
    setTimeout(() => {
      setAppState("ready");
      setTimeout(() => setShowAudioTip(true), 500);
    }, 500);
  };

  const handleOnboardingSkip = async () => {
    setAppState("loading");
    await skipOnboarding();
    setTimeout(() => {
      setAppState("ready");
      setTimeout(() => setShowAudioTip(true), 500);
    }, 500);
  };

  if (appState === "splash") {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (appState === "loading" || appState === "checkingOnboarding") {
    const message = isLoading ? "Loading your music..." : "Preparing your music...";
    return <LoadingScreen message={message} />;
  }

  if (appState === "onboarding") {
    return (
      <PermissionOnboardingFlow
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  return (
    <View style={styles.appContainer}>
      <NavigationContainer>
        <NavigationProvider>
          <RootStackNavigator />
        </NavigationProvider>
      </NavigationContainer>
      <AudioTipNotification
        visible={showAudioTip}
        onDismiss={() => setShowAudioTip(false)}
      />
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        // Use the stable API for loading MaterialCommunityIcons font
        await Font.loadAsync(MaterialCommunityIcons.font);
        console.log('[App] Fonts loaded successfully');
        setFontsLoaded(true);
      } catch (error: any) {
        console.error('[App] Font loading error:', error);
        // Continue anyway - icons may still work on some platforms
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  // Wait for fonts to load on web to prevent empty icon squares
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1565C0', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  const content = (
    <PlatformModeProvider>
      <ThemeProvider>
        <UiSoundProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <AuthGuard>
                <MediaLibraryProvider>
                  <SoundLabProvider>
                    <RadioProvider>
                      <OnlineRadioProvider>
                        <PlayerProvider>
                          <ToastProvider>
                            <AppContent />
                          </ToastProvider>
                        </PlayerProvider>
                      </OnlineRadioProvider>
                    </RadioProvider>
                  </SoundLabProvider>
                </MediaLibraryProvider>
              </AuthGuard>
            </SubscriptionProvider>
          </AuthProvider>
        </UiSoundProvider>
      </ThemeProvider>
    </PlatformModeProvider>
  );

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          {KeyboardProvider ? (
            <KeyboardProvider>{content}</KeyboardProvider>
          ) : (
            content
          )}
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
  },
});
