import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentIconSize } from "@/constants/fluent2";

type LoadingScreenProps = {
  message?: string;
};

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeContext();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    spinAnimation.start();
    pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ rotate: spin }, { scale: pulseAnim }],
          },
        ]}
      >
        <MaterialCommunityIcons name="music-circle" size={FluentIconSize.xxlarge + 16} color={theme.primary} />
      </Animated.View>
      <ThemedText type="body" style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: FluentSpacing.l,
  },
  message: {
    textAlign: "center",
  },
});
