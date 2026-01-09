import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Platform } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius } from "@/constants/fluent2";

type SplashScreenProps = {
  onFinish: () => void;
};

const useNativeDriver = Platform.OS !== "web";

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { theme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver,
      }),
    ]).start();

    const fadeOutTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver,
      }).start(() => {
        onFinish();
      });
    }, 1500);

    const fallbackTimer = setTimeout(() => {
      onFinish();
    }, 2100);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.icon}
            contentFit="contain"
          />
        </View>
        <ThemedText type="h1" style={styles.title}>
          New Audio 360
        </ThemedText>
        <ThemedText type="body" style={[styles.tagline, { color: theme.textSecondary }]}>
          Your personal music experience
        </ThemedText>
      </Animated.View>
      <View style={[styles.footer, { bottom: insets.bottom + FluentSpacing.xxxl }]}>
        <ThemedText type="caption" style={{ color: theme.textTertiary }}>
          By: Dhairya Shah (The Team 360)
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textTertiary, marginTop: FluentSpacing.xs }}>
          v1.0.0
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: FluentControlRadius.dialog,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: FluentSpacing.xxl,
    overflow: "hidden",
  },
  icon: {
    width: 120,
    height: 120,
  },
  title: {
    marginBottom: FluentSpacing.s,
    textAlign: "center",
  },
  tagline: {
    textAlign: "center",
  },
  footer: {
    position: "absolute",
  },
});
