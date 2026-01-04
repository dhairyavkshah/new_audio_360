import React, { useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Image, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";
import { Spacing, BorderRadius, Fluent2Tokens } from "@/constants/theme";

interface SongCardProps {
  song: PlayableSong;
  onPress: () => void;
  onContextMenu?: (song: PlayableSong) => void;
  onAddToPlaylist?: (song: PlayableSong) => void;
  isPlaying?: boolean;
  showDuration?: boolean;
  showFavoriteButton?: boolean;
  showAddToPlaylist?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SongCard({ 
  song, 
  onPress, 
  onContextMenu, 
  onAddToPlaylist, 
  isPlaying = false, 
  showDuration = true, 
  showFavoriteButton = true, 
  showAddToPlaylist = false 
}: SongCardProps) {
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const { isFavorite, toggleFavorite } = usePlayerContext();
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);
  const longPressTriggered = useRef(false);
  const favorite = isFavorite(song.id);

  const handleFavoritePress = useCallback((e: any) => {
    e.stopPropagation?.();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    playTapSound();
    toggleFavorite(song.id);
  }, [song.id, toggleFavorite, playTapSound]);

  const handleAddToPlaylistPress = useCallback((e: any) => {
    e.stopPropagation?.();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    playTapSound();
    onAddToPlaylist?.(song);
  }, [song, onAddToPlaylist, playTapSound]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const handlePressIn = () => {
    longPressTriggered.current = false;
    scale.value = withTiming(0.98, { 
      duration: Fluent2Tokens.durationFast,
      easing: Easing.out(Easing.cubic),
    });
    bgOpacity.value = withTiming(1, { duration: Fluent2Tokens.durationFast });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { 
      duration: Fluent2Tokens.durationNormal,
      easing: Easing.out(Easing.cubic),
    });
    bgOpacity.value = withTiming(0, { duration: Fluent2Tokens.durationNormal });
  };

  const handlePress = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    playTapSound();
    onPress();
  };

  const handleLongPress = useCallback(() => {
    if (onContextMenu) {
      longPressTriggered.current = true;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      playTapSound();
      onContextMenu(song);
    }
  }, [onContextMenu, song, playTapSound]);

  const handleContextMenuWeb = useCallback(
    (e: any) => {
      if (Platform.OS === "web" && onContextMenu) {
        e.preventDefault?.();
        e.stopPropagation?.();
        onContextMenu(song);
      }
    },
    [onContextMenu, song]
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const containerProps = Platform.OS === "web" ? { onContextMenu: handleContextMenuWeb } : {};

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onContextMenu ? handleLongPress : undefined}
      delayLongPress={400}
      style={[
        styles.container,
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${song.title} by ${song.artist}`}
      {...containerProps}
    >
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: theme.surfaceContainerHigh, borderRadius: BorderRadius.large },
          bgAnimatedStyle,
        ]} 
      />
      <View style={styles.artworkContainer}>
        <Image source={{ uri: song.artwork }} style={styles.artwork} />
        {isPlaying ? (
          <View style={[styles.playingIndicator, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="volume-high" size={10} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <ThemedText type="labelMedium" numberOfLines={1}>
          {song.title}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary }}
          numberOfLines={1}
        >
          {song.artist}
        </ThemedText>
      </View>
      {showDuration ? (
        <ThemedText type="caption" style={[styles.duration, { color: theme.textSecondary }]}>
          {formatDuration(song.duration)}
        </ThemedText>
      ) : null}
      {showAddToPlaylist ? (
        <Pressable
          onPress={handleAddToPlaylistPress}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Add to playlist"
        >
          <MaterialCommunityIcons 
            name="playlist-plus" 
            size={20} 
            color={theme.primary} 
          />
        </Pressable>
      ) : null}
      {showFavoriteButton ? (
        <Pressable
          onPress={handleFavoritePress}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <MaterialCommunityIcons 
            name={favorite ? "heart" : "heart-outline"} 
            size={20} 
            color={favorite ? "#FF4D67" : theme.textSecondary} 
          />
        </Pressable>
      ) : null}
      <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textSecondary} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.xs,
    minHeight: Spacing.listItemHeight,
  },
  artworkContainer: {
    position: "relative",
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
  },
  playingIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  info: {
    flex: 1,
    marginLeft: Spacing.m,
    gap: 2,
  },
  duration: {
    marginRight: Spacing.s,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
