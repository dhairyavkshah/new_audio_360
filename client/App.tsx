import React, { useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UiSoundProvider } from "@/contexts/UiSoundContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { MediaLibraryProvider, useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { SoundLabProvider } from "@/contexts/SoundLabContext";
import { RadioProvider } from "@/contexts/RadioContext";
import { OnlineRadioProvider } from "@/contexts/OnlineRadioContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { AuthProvider } from "@/contexts/AuthContext";
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
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
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
                                <AppContent />
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
          </KeyboardProvider>
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
