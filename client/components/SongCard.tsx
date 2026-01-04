import React, { useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Image, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { FluentText } from "@/components/fluent2";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";
import { Fluent2 } from "@/constants/fluent2";

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
  const { colors, spacing, radius } = useFluent2Theme();
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
        { 
          backgroundColor: colors.surfacePrimary,
          borderRadius: radius.md,
          padding: spacing.sm,
          marginBottom: spacing.xs,
        },
        animatedStyle,
      ]}
      {...containerProps}
    >
      <View style={styles.artworkContainer}>
        <Image source={{ uri: song.artwork }} style={[styles.artwork, { borderRadius: radius.md }]} />
        {isPlaying && (
          <View style={[styles.playingIndicator, { backgroundColor: colors.brandPrimary }]}>
            <MaterialCommunityIcons name="volume-high" size={12} color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={[styles.info, { marginLeft: spacing.sm }]}>
        <FluentText variant="body1" numberOfLines={1} style={{ fontWeight: "500" }}>
          {song.title}
        </FluentText>
        <FluentText variant="caption1" color="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
          {song.artist}
        </FluentText>
      </View>
      {showDuration && (
        <FluentText variant="caption1" color="secondary" style={{ marginRight: spacing.xs }}>
          {formatDuration(song.duration)}
        </FluentText>
      )}
      {showAddToPlaylist && (
        <Pressable
          onPress={handleAddToPlaylistPress}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons 
            name="playlist-plus" 
            size={22} 
            color={colors.brandPrimary} 
          />
        </Pressable>
      )}
      {showFavoriteButton && (
        <Pressable
          onPress={handleFavoritePress}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons 
            name={favorite ? "heart" : "heart-outline"} 
            size={22} 
            color={favorite ? colors.statusDanger : colors.textSecondary} 
          />
        </Pressable>
      )}
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  artworkContainer: {
    position: "relative",
  },
  artwork: {
    width: 52,
    height: 52,
  },
  playingIndicator: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
