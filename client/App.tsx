import React, { useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Fluent2ThemeProvider, useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UiSoundProvider } from "@/contexts/UiSoundContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { MediaLibraryProvider, useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import SplashScreen from "@/screens/SplashScreen";
import LoadingScreen from "@/screens/LoadingScreen";
import PermissionOnboardingScreen from "@/screens/PermissionOnboardingScreen";

type AppState = "splash" | "loading" | "checkingOnboarding" | "onboarding" | "ready";

function AppContent() {
  const { isDark } = useFluent2Theme();
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
      <StatusBar style={isDark ? "light" : "dark"} />
      <NavigationContainer>
        <RootStackNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <Fluent2ThemeProvider>
              <ThemeProvider>
                <UiSoundProvider>
                  <MediaLibraryProvider>
                    <PlayerProvider>
                      <AppContent />
                    </PlayerProvider>
                  </MediaLibraryProvider>
                </UiSoundProvider>
              </ThemeProvider>
            </Fluent2ThemeProvider>
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
