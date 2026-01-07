import React, { useState, useEffect } from "react";
import { StyleSheet } from "react-native";
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
import { StudioProvider } from "@/contexts/StudioContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import SplashScreen from "@/screens/SplashScreen";
import LoadingScreen from "@/screens/LoadingScreen";
import PermissionOnboardingScreen from "@/screens/PermissionOnboardingScreen";
import LockoutScreen from "@/screens/LockoutScreen";

type AppState = "splash" | "loading" | "checkingOnboarding" | "onboarding" | "ready";

function LockoutGuard({ children }: { children: React.ReactNode }) {
  const { isLocked, isLoading } = useSubscription();

  if (isLoading) {
    return <LoadingScreen message="Verifying app integrity..." />;
  }

  if (isLocked) {
    return <LockoutScreen />;
  }

  return <>{children}</>;
}

function AppContent() {
  const [appState, setAppState] = useState<AppState>("splash");
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
    }, 500);
  };

  const handleOnboardingSkip = async () => {
    setAppState("loading");
    await skipOnboarding();
    setTimeout(() => {
      setAppState("ready");
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
      <PermissionOnboardingScreen
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  return (
    <>
      <NavigationContainer>
        <NavigationProvider>
          <RootStackNavigator />
        </NavigationProvider>
      </NavigationContainer>
      <StatusBar style="auto" />
    </>
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
                <SubscriptionProvider>
                  <LockoutGuard>
                    <MediaLibraryProvider>
                      <SoundLabProvider>
                        <StudioProvider>
                          <PlayerProvider>
                            <AppContent />
                          </PlayerProvider>
                        </StudioProvider>
                      </SoundLabProvider>
                    </MediaLibraryProvider>
                  </LockoutGuard>
                </SubscriptionProvider>
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
});
