import React, { useState, useEffect } from "react";
import { View, StyleSheet, Image, Pressable, ImageBackground, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { RecordButton } from "@/components/RecordButton";
import { AudioWaveform } from "@/components/AudioWaveform";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius, ModeStyles, Layout } from "@/constants/theme";

const STUDIO_BLUR_INTENSITY = 35;
import { getSongById } from "@/lib/data";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;
type RecordingRouteProp = RouteProp<CreateStackParamList, "Recording">;

export default function RecordingScreen() {
  const insets = useSafeAreaInsets();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = Layout.bottomNavHeight + insets.bottom;
  }
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RecordingRouteProp>();
  const { theme, isDark } = useThemeContext();

  const song = getSongById(route.params.songId);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showHeadphoneReminder, setShowHeadphoneReminder] = useState(true);

  const textShadowStyle = {
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleRecordPress = () => {
    if (!isRecording) {
      setIsRecording(true);
      setShowHeadphoneReminder(false);
    } else {
      setIsRecording(false);
      const recordingId = `rec_${Date.now()}`;
      navigation.navigate("Mixing", { recordingId });
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!song) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: song.artwork }}
        style={StyleSheet.absoluteFill}
        blurRadius={Platform.OS === "ios" ? STUDIO_BLUR_INTENSITY : STUDIO_BLUR_INTENSITY / 2}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? `rgba(0,0,0,${ModeStyles.studio.overlayOpacityDark + 0.15})` : `rgba(255,255,255,${ModeStyles.studio.overlayOpacityLight + 0.1})` }]} />
      </ImageBackground>

      <View style={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl }]}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="body" style={[{ fontWeight: "600" }, textShadowStyle]}>
              Recording
            </ThemedText>
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <View style={[styles.recordingDot, { backgroundColor: theme.recordButton }]} />
                <ThemedText type="small" style={{ color: theme.recordButton }}>
                  {formatTime(recordingTime)}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <View style={styles.closeButton} />
        </View>

        {showHeadphoneReminder ? (
          <GlassCard style={styles.reminderCard}>
            <View style={styles.reminderContent}>
              <MaterialCommunityIcons name="headphones" size={24} color={theme.primary} />
              <View style={styles.reminderText}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Use Headphones
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  For the best recording experience
                </ThemedText>
              </View>
              <Pressable onPress={() => setShowHeadphoneReminder(false)}>
                <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </GlassCard>
        ) : null}

        <View style={styles.songInfo}>
          <Image source={{ uri: song.artwork }} style={styles.artwork} />
          <ThemedText type="h4" style={[styles.songTitle, textShadowStyle]} numberOfLines={1}>
            {song.title}
          </ThemedText>
          <ThemedText type="body" style={[textShadowStyle, { color: isDark ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>
            {song.artist}
          </ThemedText>
        </View>

        <View style={styles.waveformContainer}>
          <AudioWaveform
            isAnimating={isRecording}
            barCount={60}
            barWidth={4}
            height={80}
            color={isRecording ? theme.recordButton : theme.primary}
          />
        </View>

        <View style={styles.controlsContainer}>
          <ThemedText type="body" style={[styles.instruction, textShadowStyle, { color: isDark ? 'rgba(255,255,255,0.8)' : theme.textSecondary }]}>
            {isRecording ? "Tap to stop recording" : "Tap to start recording"}
          </ThemedText>
          <RecordButton isRecording={isRecording} onPress={handleRecordPress} size={100} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  reminderCard: {
    marginBottom: Spacing.lg,
  },
  reminderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  reminderText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  songInfo: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  artwork: {
    width: 140,
    height: 140,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  songTitle: {
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  waveformContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  controlsContainer: {
    alignItems: "center",
    paddingBottom: Spacing.lg,
  },
  instruction: {
    marginBottom: Spacing.lg,
  },
});
