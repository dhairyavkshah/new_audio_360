import React, { useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Image, Platform, GestureResponderEvent } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Song } from "@/lib/data";

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

export function SongCard({ song, onPress, onContextMenu, onAddToPlaylist, isPlaying = false, showDuration = true, showFavoriteButton = true, showAddToPlaylist = false }: SongCardProps) {
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const { isFavorite, toggleFavorite } = usePlayerContext();
  const scale = useSharedValue(1);
  const longPressTriggered = useRef(false);
  const favorite = isFavorite(song.id);

  const handleFavoritePress = useCallback((e: any) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playTapSound();
    toggleFavorite(song.id);
  }, [song.id, toggleFavorite, playTapSound]);

  const handleAddToPlaylistPress = useCallback((e: any) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playTapSound();
    onAddToPlaylist?.(song);
  }, [song, onAddToPlaylist, playTapSound]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    longPressTriggered.current = false;
    scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playTapSound();
    onPress();
  };

  const handleLongPress = useCallback(() => {
    if (onContextMenu) {
      longPressTriggered.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
      {...containerProps}
    >
      <View style={styles.artworkContainer}>
        <Image source={{ uri: song.artwork }} style={styles.artwork} />
        {isPlaying ? (
          <View style={[styles.playingIndicator, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="volume-high" size={12} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <ThemedText type="body" numberOfLines={1} style={styles.title}>
          {song.title}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.artist, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {song.artist}
        </ThemedText>
      </View>
      {showDuration ? (
        <ThemedText type="small" style={[styles.duration, { color: theme.textSecondary }]}>
          {formatDuration(song.duration)}
        </ThemedText>
      ) : null}
      {showAddToPlaylist ? (
        <Pressable
          onPress={handleAddToPlaylistPress}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons 
            name="playlist-plus" 
            size={22} 
            color={theme.primary} 
          />
        </Pressable>
      ) : null}
      {showFavoriteButton ? (
        <Pressable
          onPress={handleFavoritePress}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons 
            name={favorite ? "heart" : "heart-outline"} 
            size={22} 
            color={favorite ? "#FF4D67" : theme.textSecondary} 
          />
        </Pressable>
      ) : null}
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.size4,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.size3,
  },
  artworkContainer: {
    position: "relative",
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
  },
  playingIndicator: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginLeft: Spacing.size3,
  },
  title: {
    fontWeight: "500",
  },
  artist: {
    marginTop: 2,
  },
  duration: {
    marginRight: Spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
