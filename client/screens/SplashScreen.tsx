import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Animated, Platform } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";

const appIcon = require("../../assets/images/icon.png");

type SplashScreenProps = {
  onFinish: () => void;
};

const useNativeDriver = Platform.OS !== "web";

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [iconLoaded, setIconLoaded] = useState(false);

  useEffect(() => {
    if (iconLoaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver,
      }).start();
    }
  }, [iconLoaded]);

  useEffect(() => {
    Image.prefetch(appIcon);
  }, []);

  useEffect(() => {
    if (!iconLoaded) return;

    const fadeOutTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver,
      }).start(() => {
        onFinish();
      });
    }, 1500);

    const fallbackTimer = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(fallbackTimer);
    };
  }, [iconLoaded]);

  return (
    <View style={[styles.container, { backgroundColor: colors.colorNeutralBackground1 }]}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim },
        ]}
      >
        <View style={styles.iconContainer}>
          <Image
            source={appIcon}
            style={styles.icon}
            contentFit="contain"
            priority="high"
            cachePolicy="memory-disk"
            onLoad={() => setIconLoaded(true)}
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
