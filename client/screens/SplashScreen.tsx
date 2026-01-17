import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Platform } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";

type SplashScreenProps = {
  onFinish: () => void;
};

const useNativeDriver = Platform.OS !== "web";

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
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
    <View style={[styles.container, { backgroundColor: colors.colorNeutralBackground1 }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.icon}
            contentFit="contain"
          />
        </View>
        <FluentText variant="title1" align="center" style={styles.title}>
          New Audio 360
        </FluentText>
        <FluentText variant="body1" color="secondary" align="center">
          Your personal music experience
        </FluentText>
      </Animated.View>
      <View style={[styles.footer, { bottom: insets.bottom + FluentSpacing.xxxl }]}>
        <FluentText variant="caption1" color="tertiary" align="center">
          By: Dhairya Shah (The Team 360)
        </FluentText>
        <FluentText variant="caption1" color="tertiary" align="center" style={{ marginTop: FluentSpacing.xs }}>
          v1.0
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
    marginBottom: FluentSpacing.xxl,
  },
  icon: {
    width: 120,
    height: 120,
  },
  title: {
    marginBottom: FluentSpacing.s,
  },
  footer: {
    position: "absolute",
  },
});
