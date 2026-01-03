import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Image } from "expo-image";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius } from "@/constants/theme";

type SplashScreenProps = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { theme } = useThemeContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2000);

    return () => clearTimeout(timer);
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
      <View style={styles.footer}>
        <ThemedText type="caption" style={{ color: theme.textTertiary }}>
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
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.size6,
    overflow: "hidden",
  },
  icon: {
    width: 120,
    height: 120,
  },
  title: {
    marginBottom: Spacing.size2,
    textAlign: "center",
  },
  tagline: {
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: Spacing.size8,
  },
});
