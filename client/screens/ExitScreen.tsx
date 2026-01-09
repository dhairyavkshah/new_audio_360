import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, BackHandler, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";

type ExitScreenProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ExitScreen({ onCancel, onConfirm }: ExitScreenProps) {
  const { theme } = useThemeContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleConfirmExit = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      if (Platform.OS === "android") {
        BackHandler.exitApp();
      } else {
        onConfirm();
      }
    });
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={[styles.backdrop, { backgroundColor: theme.scrim }]} />
      <Animated.View
        style={[
          styles.dialog,
          {
            backgroundColor: theme.backgroundDefault,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.error + "15" }]}>
          <MaterialCommunityIcons name="power" size={FluentIconSize.xlarge} color={theme.error} />
        </View>
        <ThemedText type="h4" style={styles.title}>
          Close New Audio 360?
        </ThemedText>
        <ThemedText type="body" style={[styles.message, { color: theme.textSecondary }]}>
          Are you sure you want to close the app? Your playback will stop.
        </ThemedText>
        <View style={styles.buttonContainer}>
          <Button
            variant="secondary"
            onPress={onCancel}
            style={styles.button}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onPress={handleConfirmExit}
            style={styles.button}
          >
            Close App
          </Button>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    width: "85%",
    maxWidth: 340,
    borderRadius: FluentControlRadius.dialog,
    padding: FluentSpacing.xl,
    alignItems: "center",
  },
  iconContainer: {
    width: FluentSpacing.xxxxxxl,
    height: FluentSpacing.xxxxxxl,
    borderRadius: FluentSpacing.xxxl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: FluentSpacing.m,
  },
  title: {
    marginBottom: FluentSpacing.xs,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    marginBottom: FluentSpacing.l,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: FluentSpacing.s,
    width: "100%",
  },
  button: {
    flex: 1,
  },
});
