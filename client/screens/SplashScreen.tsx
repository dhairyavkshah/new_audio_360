import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Image } from "expo-image";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { FluentText } from "@/components/fluent2/FluentText";

type SplashScreenProps = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { colors, spacing, radius } = useFluent2Theme();
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
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.brand.primary, borderRadius: radius.xl }]}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.icon}
            contentFit="contain"
          />
        </View>
        <FluentText variant="title2" style={{ marginTop: spacing.xl, textAlign: 'center' }}>
          New Audio 360
        </FluentText>
        <FluentText variant="body1" color="secondary" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
          Your personal music experience
        </FluentText>
      </Animated.View>
      <View style={[styles.footer, { bottom: spacing.xxxl }]}>
        <FluentText variant="caption1" color="tertiary">
          v1.0.0
        </FluentText>
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
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  icon: {
    width: 120,
    height: 120,
  },
  footer: {
    position: "absolute",
  },
});
