import React from "react";
import { View, StyleSheet, Pressable, Image, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext, useSkin } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { Spacing, BorderRadius, Layout, M3Shape, M3Elevation, FluentShadow } from "@/constants/theme";

interface MiniPlayerProps {
  bottomOffset?: number;
}

export function MiniPlayer({ bottomOffset = 0 }: MiniPlayerProps) {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useThemeContext();
  const { icons } = useSkin();
  const { playTapSound } = useUiSound();
  const { currentSong, isPlaying, togglePlayPause, progress } = usePlayerContext();

  if (!currentSong) {
    return null;
  }

  const handlePress = () => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Navigate through root stack -> tab -> stack screen
    navigation.navigate("Main", {
      screen: "ListenTab",
      params: {
        screen: "NowPlaying",
        params: { songId: currentSong.id },
      },
    });
  };

  const handlePlayPause = (event: any) => {
    event.stopPropagation();
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    togglePlayPause();
  };

  return (
    <View style={[
      styles.container, 
      { 
        bottom: bottomOffset + Layout.miniPlayerGapFromNav,
        backgroundColor: theme.surface,
        borderColor: theme.stroke2,
      }
    ]}>
      <View style={styles.progressTrack}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${(progress || 0) * 100}%`,
              backgroundColor: theme.primary,
            }
          ]} 
        />
      </View>
      <View style={styles.background}>
        <Image 
          source={{ uri: currentSong.artwork }} 
          style={StyleSheet.absoluteFill}
        />
        <BlurView 
          intensity={Platform.OS === "ios" ? 80 : 100} 
          tint={isDark ? "dark" : "light"} 
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        />
        <View 
          style={[
            StyleSheet.absoluteFill, 
            { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }
          ]} 
        />
        <Pressable style={styles.content} onPress={handlePress}>
          <Image source={{ uri: currentSong.artwork }} style={styles.artwork} />
          <View style={styles.info}>
            <ThemedText type="labelMedium" numberOfLines={1}>
              {currentSong.title}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }} numberOfLines={1}>
              {currentSong.artist}
            </ThemedText>
          </View>
          <Pressable
            onPress={handlePlayPause}
            style={[styles.playButton, { backgroundColor: theme.primary }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
          >
            <MaterialCommunityIcons 
              name={(isPlaying ? icons.pause : icons.play) as keyof typeof MaterialCommunityIcons.glyphMap} 
              size={20} 
              color="#FFFFFF" 
            />
          </Pressable>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Layout.horizontalPadding,
    right: Layout.horizontalPadding,
    height: Layout.miniPlayerHeight,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: FluentShadow.shadow8.key.color,
        shadowOffset: { width: FluentShadow.shadow8.key.x, height: FluentShadow.shadow8.key.y },
        shadowOpacity: 1,
        shadowRadius: FluentShadow.shadow8.key.blur,
      },
      android: {
        elevation: FluentShadow.shadow8.elevation,
      },
      default: {
        boxShadow: FluentShadow.shadow8.combined,
      },
    }),
  },
  progressTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    zIndex: 10,
  },
  progressFill: {
    height: "100%",
  },
  background: {
    borderRadius: BorderRadius.large,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    height: Layout.miniPlayerHeight,
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.l,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.miniPlayerArtworkGap,
    gap: Spacing.titleToSubtitle,
  },
  playButton: {
    width: Layout.touchTargetMin,
    height: Layout.touchTargetMin,
    borderRadius: Layout.touchTargetMin / 2,
    justifyContent: "center",
    alignItems: "center",
  },
});
