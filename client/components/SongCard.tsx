import React, { useCallback, useRef, useMemo, memo } from "react";
import { View, StyleSheet, Pressable, Image, Platform, GestureResponderEvent, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";
import {
  FluentSpacing,
  FluentRadius,
  FluentIconSize,
  FluentDuration,
  FluentLightColors,
  FluentDarkColors,
  FluentTouchTarget,
} from "@/constants/fluent2";

const ITEM_HEIGHT = 72;
const COMPACT_HEIGHT = 56;
const ARTWORK_SIZE = 48;
const PLAYING_INDICATOR_WIDTH = 4;

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

interface SongCardProps {
  song: PlayableSong;
  onPress: () => void;
  onContextMenu?: (song: PlayableSong) => void;
  onAddToPlaylist?: (song: PlayableSong) => void;
  isPlaying?: boolean;
  showDuration?: boolean;
  showDivider?: boolean;
  compact?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SongCardComponent({ 
  song, 
  onPress, 
  onContextMenu, 
  onAddToPlaylist, 
  isPlaying = false, 
  showDuration = true,
  showDivider = false,
  compact = false,
}: SongCardProps) {
  const { isDark } = useThemeContext();
  const { playTapSound } = useUiSound();
  const bgOpacity = useSharedValue(0);
  const longPressTriggered = useRef(false);
  const fluentColors = useMemo(() => isDark ? FluentDarkColors : FluentLightColors, [isDark]);
  
  const artworkSource = useMemo(() => ({ uri: song.artwork }), [song.artwork]);
  
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);
  
  const formattedDuration = useMemo(() => formatDuration(song.duration), [formatDuration, song.duration]);

  const handleMenuPress = useCallback((e: any) => {
    e.stopPropagation?.();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    playTapSound();
    onContextMenu?.(song);
  }, [song, onContextMenu, playTapSound]);

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const handlePressIn = () => {
    longPressTriggered.current = false;
    bgOpacity.value = withTiming(1, { duration: FluentDuration.fast });
  };

  const handlePressOut = () => {
    bgOpacity.value = withTiming(0, { duration: FluentDuration.normal });
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

  const itemHeight = compact ? COMPACT_HEIGHT : ITEM_HEIGHT;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onContextMenu ? handleLongPress : undefined}
      delayLongPress={400}
      style={[
        styles.container,
        { height: itemHeight },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${song.title} by ${song.artist}`}
      {...containerProps}
    >
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: fluentColors.colorSubtleBackgroundPressed },
          bgAnimatedStyle,
        ]} 
      />
      
      {isPlaying && (
        <View 
          style={[
            styles.playingIndicator, 
            { backgroundColor: fluentColors.colorBrandBackground }
          ]} 
        />
      )}
      
      <View style={styles.content}>
        {!compact && (
          <View style={styles.artworkContainer}>
            <Image source={artworkSource} style={styles.artwork} />
          </View>
        )}
        
        <View style={styles.info}>
          <FluentText 
            variant="body2"
            style={{ 
              color: isPlaying ? fluentColors.colorBrandForeground1 : fluentColors.colorNeutralForeground1 
            }}
            numberOfLines={2}
          >
            {song.title}
          </FluentText>
          <FluentText
            variant="caption1"
            color="secondary"
            numberOfLines={1}
          >
            {song.artist}
          </FluentText>
        </View>
        
        {showDuration && (
          <FluentText 
            variant="caption1"
            color="secondary"
            style={styles.duration}
          >
            {formattedDuration}
          </FluentText>
        )}
        
        {onContextMenu && (
          <ActionButton onPress={handleMenuPress} accessibilityLabel="More options">
            <MaterialCommunityIcons 
              name="dots-vertical" 
              size={FluentIconSize.regular} 
              color={fluentColors.colorNeutralForeground3} 
            />
          </ActionButton>
        )}
      </View>
      
      {showDivider && (
        <View 
          style={[
            styles.divider, 
            { 
              backgroundColor: fluentColors.colorNeutralStroke2,
              left: compact ? FluentSpacing.l : FluentSpacing.l + ARTWORK_SIZE + FluentSpacing.m,
            }
          ]} 
        />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: '100%',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
  },
  playingIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: PLAYING_INDICATOR_WIDTH,
  },
  artworkContainer: {
    position: "relative",
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: FluentRadius.medium,
  },
  info: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    justifyContent: 'center',
    gap: FluentSpacing.xxs,
  },
  duration: {
    marginRight: FluentSpacing.s,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: 1,
  },
});

export const SongCard = memo(SongCardComponent);
