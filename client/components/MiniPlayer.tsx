import React from "react";
import { View, StyleSheet, Pressable, Image, Platform, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeContext, useSkin, useThemeTokens } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { getCardEffectStyle, getGlowStyle } from "@/lib/themeUtils";
import {
  FluentSpacing,
  FluentIconSize,
  FluentTypography,
  FluentLayoutSize,
  FluentControlRadius,
  FluentSliderSize,
} from "@/constants/fluent2";

interface MiniPlayerProps {
  bottomOffset?: number;
  isDismissed?: boolean;
  onDismiss?: () => void;
  onRestore?: () => void;
}

export function MiniPlayer({ bottomOffset = 0, isDismissed = false, onDismiss, onRestore }: MiniPlayerProps) {
  const navigation = useNavigation<any>();
  const { isDark } = useThemeContext();
  const { icons } = useSkin();
  const tokens = useThemeTokens();
  const { playTapSound } = useUiSound();
  const { currentSong, isPlaying, togglePlayPause, progress } = usePlayerContext();
  const insets = useSafeAreaInsets();
  
  const cardEffectStyle = getCardEffectStyle(tokens, 2);
  const glowStyle = getGlowStyle(tokens);

  if (!currentSong) {
    return null;
  }

  const handlePress = () => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

  const handleSwipeDown = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onDismiss?.();
  };

  const handleSwipeUp = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onRestore?.();
  };

  const containerBottom = bottomOffset + FluentSpacing.s + (insets.bottom > 0 ? 0 : FluentSpacing.s);

  if (isDismissed) {
    return (
      <Pressable 
        style={[
          styles.restoreHandle, 
          { 
            bottom: containerBottom,
            backgroundColor: tokens.colors.primary,
          }
        ]}
        onPress={handleSwipeUp}
      >
        <MaterialCommunityIcons name="chevron-up" size={FluentIconSize.regular} color={tokens.colors.onPrimary} />
        <MaterialCommunityIcons 
          name={isPlaying ? "music" : "music-off"} 
          size={16} 
          color={tokens.colors.onPrimary} 
          style={{ marginLeft: FluentSpacing.xs }}
        />
      </Pressable>
    );
  }

  return (
    <View style={[
      styles.container, 
      { bottom: containerBottom, borderRadius: tokens.shapes.cardBorderRadius }, 
      cardEffectStyle,
      glowStyle,
    ]}>
      <View style={[styles.progressTrack, { backgroundColor: tokens.colors.outline }]}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${(progress || 0) * 100}%`,
              backgroundColor: tokens.colors.primary,
            }
          ]} 
        />
      </View>
      <View style={[styles.background, { borderRadius: tokens.shapes.cardBorderRadius }]}>
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
          <Image source={{ uri: currentSong.artwork }} style={[styles.artwork, { borderRadius: tokens.shapes.buttonBorderRadius }]} />
          <View style={styles.info}>
            <Text style={[FluentTypography.body1Strong, { color: tokens.colors.text }]} numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text style={[FluentTypography.caption1, { color: tokens.colors.textSecondary }]} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>
          <Pressable
            onPress={handlePlayPause}
            style={[styles.playButton, { backgroundColor: tokens.colors.primary }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
          >
            <MaterialCommunityIcons 
              name={(isPlaying ? icons.pause : icons.play) as keyof typeof MaterialCommunityIcons.glyphMap} 
              size={FluentIconSize.medium} 
              color={tokens.colors.onPrimary} 
            />
          </Pressable>
          <Pressable
            onPress={handleSwipeDown}
            style={[styles.dismissButton, { backgroundColor: tokens.colors.surfaceVariant }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Hide player"
          >
            <MaterialCommunityIcons 
              name="chevron-down" 
              size={FluentIconSize.medium} 
              color={tokens.colors.text} 
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
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    overflow: "hidden",
  },
  dismissButton: {
    width: 44,
    height: 44,
    borderRadius: FluentControlRadius.fab,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: FluentSpacing.s,
  },
  restoreHandle: {
    position: "absolute",
    left: "50%",
    marginLeft: -40,
    width: 80,
    height: 44,
    borderRadius: FluentControlRadius.fab,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  progressTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: FluentSliderSize.trackThin,
    zIndex: 10,
  },
  progressFill: {
    height: "100%",
  },
  background: {
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    height: FluentLayoutSize.miniPlayerHeight,
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.l,
  },
  artwork: {
    width: FluentIconSize.xxlarge,
    height: FluentIconSize.xxlarge,
  },
  info: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    gap: FluentSpacing.xxs,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: FluentControlRadius.fab,
    justifyContent: "center",
    alignItems: "center",
  },
});
