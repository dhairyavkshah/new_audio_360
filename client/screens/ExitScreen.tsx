import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, BackHandler, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { Button } from "@/components/Button";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";

type ExitScreenProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ExitScreen({ onCancel, onConfirm }: ExitScreenProps) {
  const colors = useThemedColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
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
      <View style={[styles.backdrop, { backgroundColor: colors.colorNeutralBackgroundInverted + '80' }]} />
      <View
        style={[
          styles.dialog,
          { backgroundColor: colors.colorNeutralBackground1 },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.colorPaletteRedBackground1 }]}>
          <MaterialCommunityIcons name="power" size={FluentIconSize.xlarge} color={colors.colorPaletteRedForeground1} />
        </View>
        <FluentText variant="subtitle1" align="center" style={styles.title}>
          Close New Audio 360?
        </FluentText>
        <FluentText variant="body1" color="secondary" align="center" style={styles.message}>
          Are you sure you want to close the app? Your playback will stop.
        </FluentText>
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
      </View>
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
  },
  message: {
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
