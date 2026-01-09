import React from "react";
import { View, StyleSheet, Pressable, Image, Platform, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext, useSkin } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { Layout } from "@/constants/theme";
import {
  FluentSpacing,
  FluentIconSize,
  FluentTypography,
  FluentControlRadius,
  FluentDuration,
  FluentLightColors,
  FluentDarkColors,
  getShadowStyle,
} from "@/constants/fluent2";

interface MiniPlayerProps {
  bottomOffset?: number;
}

export function MiniPlayer({ bottomOffset = 0 }: MiniPlayerProps) {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useThemeContext();
  const { icons } = useSkin();
  const { playTapSound } = useUiSound();
  const { currentSong, isPlaying, togglePlayPause, progress } = usePlayerContext();
  const insets = useSafeAreaInsets();
  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;

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

  const containerBottom = bottomOffset + FluentSpacing.s + (insets.bottom > 0 ? 0 : FluentSpacing.s);

  return (
    <View style={[styles.container, { bottom: containerBottom }, getShadowStyle('shadow8', isDark)]}>
      <View style={styles.progressTrack}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${(progress || 0) * 100}%`,
              backgroundColor: fluentColors.colorBrandForeground1,
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
            <Text style={[FluentTypography.body1Strong, { color: fluentColors.colorNeutralForeground1 }]} numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text style={[FluentTypography.caption1, { color: fluentColors.colorNeutralForeground3 }]} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>
          <Pressable
            onPress={handlePlayPause}
            style={[styles.playButton, { backgroundColor: fluentColors.colorBrandBackground }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
          >
            <MaterialCommunityIcons 
              name={(isPlaying ? icons.pause : icons.play) as keyof typeof MaterialCommunityIcons.glyphMap} 
              size={FluentIconSize.medium} 
              color={fluentColors.colorNeutralForegroundOnBrand} 
            />
          </Pressable>
        </Pressable>
      </View>
    </View>
  );
}

const MINI_PLAYER_HEIGHT = 64;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
    overflow: "hidden",
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
    borderRadius: FluentControlRadius.card,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    height: MINI_PLAYER_HEIGHT,
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.l,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: FluentControlRadius.button,
  },
  info: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    gap: FluentSpacing.xxs,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
