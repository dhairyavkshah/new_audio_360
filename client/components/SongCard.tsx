import React, { useCallback, useRef, useMemo, memo } from "react";
import { View, StyleSheet, Pressable, Platform, GestureResponderEvent, TouchableOpacity } from "react-native";

// Default album art for songs without artwork
const DEFAULT_ALBUM_ART = require("@/assets/images/default_album_art.png");
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentText } from "@/components/fluent";
import { LazyImage } from "@/components/LazyImage";
import { useThemedColors } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";
import {
  FluentSpacing,
  FluentControlRadius,
  FluentTypography,
  FluentIconSize,
  FluentTouchTarget,
} from "@/constants/fluent2";

const ActionButton = ({ onPress, accessibilityLabel, children }: { 
  onPress: (e: any) => void; 
  accessibilityLabel: string; 
  children: React.ReactNode;
}) => {
  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    onPress(e);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={actionButtonStyles.button}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </TouchableOpacity>
  );
};

const actionButtonStyles = StyleSheet.create({
  button: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    justifyContent: "center",
    alignItems: "center",
  },
});

type SourceType = 'local' | 'soundcloud' | 'archive' | undefined;

interface SongCardProps {
  song: PlayableSong;
  onPress: () => void;
  onContextMenu?: (song: PlayableSong) => void;
  onAddToPlaylist?: (song: PlayableSong) => void;
  isPlaying?: boolean;
  showDuration?: boolean;
  showFavoriteButton?: boolean;
  showAddToPlaylist?: boolean;
  sourceType?: SourceType;
}

function SongCardComponent({ 
  song, 
  onPress, 
  onContextMenu, 
  onAddToPlaylist, 
  isPlaying = false, 
  showDuration = true, 
  showFavoriteButton = true, 
  showAddToPlaylist = false,
  sourceType,
}: SongCardProps) {
  const fluentColors = useThemedColors();
  const { playTapSound } = useUiSound();
  const { isFavorite, toggleFavorite } = usePlayerContext();
  const longPressTriggered = useRef(false);
  const favorite = isFavorite(song.id);
  const [isPressed, setIsPressed] = React.useState(false);
  
  const artworkSource = useMemo(() => song.artwork ? { uri: song.artwork } : DEFAULT_ALBUM_ART, [song.artwork]);
  
  const formatDuration = useCallback((seconds: number) => {
    if (!seconds || !isFinite(seconds) || seconds < 0) return "0:00";
    const normalizedSeconds = seconds > 36000 ? Math.floor(seconds / 1000) : Math.floor(seconds);
    const mins = Math.floor(normalizedSeconds / 60);
    const secs = normalizedSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);
  
  const formattedDuration = useMemo(() => formatDuration(song.duration), [formatDuration, song.duration]);

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

  const handlePressIn = () => {
    longPressTriggered.current = false;
    setIsPressed(true);
  };

  const handlePressOut = () => {
    setIsPressed(false);
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

  const containerProps = useMemo(() => Platform.OS === "web" ? { onContextMenu: handleContextMenuWeb } : {}, [handleContextMenuWeb]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onContextMenu ? handleLongPress : undefined}
      delayLongPress={400}
      style={[
        styles.container,
        {
          backgroundColor: fluentColors.colorNeutralBackground2,
          borderColor: isPlaying ? fluentColors.colorBrandStroke1 : fluentColors.colorNeutralStroke2,
          borderWidth: 1,
          opacity: isPressed ? 0.9 : 1,
          ...(Platform.OS === "web" ? {
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.14)",
          } : {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 1,
          }),
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${song.title} by ${song.artist}`}
      {...containerProps}
    >
      <View style={styles.artworkContainer}>
        <LazyImage 
          source={artworkSource} 
          fallbackSource={DEFAULT_ALBUM_ART}
          style={styles.artwork}
        />
        {isPlaying ? (
          <View style={[styles.playingIndicator, { backgroundColor: fluentColors.colorBrandBackground, borderColor: fluentColors.colorNeutralBackground1 }]}>
            <MaterialCommunityIcons name="volume-high" size={FluentIconSize.tiny} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <FluentText 
          variant="body1Strong"
          color="primary"
          numberOfLines={1}
        >
          {song.title}
        </FluentText>
        <View style={styles.artistRow}>
          <FluentText
            variant="caption1"
            color="secondary"
            numberOfLines={1}
            style={styles.artistText}
          >
            {song.artist}
          </FluentText>
          {sourceType && (
            <View style={[
              styles.sourceTag, 
              { 
                backgroundColor: sourceType === 'soundcloud' ? '#FF5500' + '20' 
                  : sourceType === 'archive' ? '#00BFA5' + '20' 
                  : fluentColors.colorSubtleBackground 
              }
            ]}>
              <MaterialCommunityIcons 
                name={sourceType === 'soundcloud' ? 'soundcloud' : sourceType === 'archive' ? 'web' : 'music-note'} 
                size={FluentIconSize.tiny} 
                color={sourceType === 'soundcloud' ? '#FF5500' : sourceType === 'archive' ? '#00BFA5' : fluentColors.colorNeutralForeground3} 
              />
            </View>
          )}
        </View>
      </View>
      {showDuration ? (
        <FluentText 
          variant="caption1"
          color="tertiary"
          style={styles.duration}
        >
          {formattedDuration}
        </FluentText>
      ) : null}
      {showAddToPlaylist ? (
        <ActionButton onPress={handleAddToPlaylistPress} accessibilityLabel="Add to playlist">
          <MaterialCommunityIcons 
            name="playlist-plus" 
            size={FluentIconSize.regular} 
            color={fluentColors.colorBrandForeground1} 
          />
        </ActionButton>
      ) : null}
      {showFavoriteButton ? (
        <ActionButton onPress={handleFavoritePress} accessibilityLabel={favorite ? "Remove from favorites" : "Add to favorites"}>
          <MaterialCommunityIcons 
            name={favorite ? "heart" : "heart-outline"} 
            size={FluentIconSize.regular} 
            color={favorite ? "#FF4D67" : fluentColors.colorNeutralForeground3} 
          />
        </ActionButton>
      ) : null}
      <MaterialCommunityIcons 
        name="chevron-right" 
        size={FluentIconSize.small} 
        color={fluentColors.colorNeutralForeground3} 
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
    marginBottom: FluentSpacing.s,
    minHeight: 72,
  },
  artworkContainer: {
    position: "relative",
  },
  artwork: {
    width: FluentIconSize.xxlarge,
    height: FluentIconSize.xxlarge,
    borderRadius: FluentControlRadius.card,
  },
  playingIndicator: {
    position: "absolute",
    bottom: -FluentSpacing.xxs,
    right: -FluentSpacing.xxs,
    width: FluentIconSize.regular,
    height: FluentIconSize.regular,
    borderRadius: FluentControlRadius.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  info: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    gap: FluentSpacing.xxs,
  },
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.xs,
  },
  artistText: {
    flex: 1,
  },
  sourceTag: {
    paddingHorizontal: FluentSpacing.xs,
    paddingVertical: 2,
    borderRadius: FluentControlRadius.chip,
    justifyContent: "center",
    alignItems: "center",
  },
  duration: {
    marginRight: FluentSpacing.s,
  },
});

export const SongCard = memo(SongCardComponent);
