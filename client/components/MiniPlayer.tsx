import React, { useCallback, useMemo, memo, useState } from "react";
import { View, StyleSheet, Pressable, Image, Platform, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeContext, useSkin, useThemeTokens } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import {
  FluentSpacing,
  FluentIconSize,
  FluentTypography,
  FluentLayoutSize,
  FluentControlRadius,
  FluentRadius,
  FluentTouchTarget,
  FluentGap,
  getShadowStyle,
} from "@/constants/fluent2";

interface MiniPlayerProps {
  bottomOffset?: number;
  isDismissed?: boolean;
  onDismiss?: () => void;
  onRestore?: () => void;
}

function MiniPlayerComponent({ bottomOffset = 0, isDismissed = false, onDismiss, onRestore }: MiniPlayerProps) {
  const navigation = useNavigation<any>();
  const { isDark } = useThemeContext();
  const { icons } = useSkin();
  const tokens = useThemeTokens();
  const { playTapSound } = useUiSound();
  const { currentSong, isPlaying, togglePlayPause, progress } = usePlayerContext();
  const insets = useSafeAreaInsets();
  const [isPressed, setIsPressed] = useState(false);
  
  const shadowStyle = useMemo(() => getShadowStyle('shadow8', isDark), [isDark]);
  
  const artworkSource = useMemo(() => currentSong ? { uri: currentSong.artwork } : undefined, [currentSong?.artwork]);
  
  const containerBottom = useMemo(() => bottomOffset + FluentLayoutSize.miniPlayerGapFromNav, [bottomOffset]);
  
  const progressWidth = useMemo(() => `${(progress || 0) * 100}%` as const, [progress]);

  const handlePress = useCallback(() => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentSong) {
      navigation.navigate("Main", {
        screen: "ListenTab",
        params: {
          screen: "NowPlaying",
          params: { songId: currentSong.id },
        },
      });
    }
  }, [playTapSound, navigation, currentSong]);

  const handlePlayPause = useCallback((event: any) => {
    event.stopPropagation();
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    togglePlayPause();
  }, [playTapSound, togglePlayPause]);

  const handleSwipeDown = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onDismiss?.();
  }, [onDismiss]);

  const handleSwipeUp = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onRestore?.();
  }, [onRestore]);

  if (!currentSong) {
    return null;
  }

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
      { 
        bottom: containerBottom,
        borderTopLeftRadius: FluentControlRadius.bottomSheet,
        borderTopRightRadius: FluentControlRadius.bottomSheet,
      }, 
      shadowStyle,
    ]}>
      <View style={[styles.progressTrack, { backgroundColor: tokens.colors.divider || tokens.colors.outline }]}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: progressWidth,
              backgroundColor: tokens.colors.primary,
            }
          ]} 
        />
      </View>
      <View style={[styles.background, { 
        borderTopLeftRadius: FluentControlRadius.bottomSheet,
        borderTopRightRadius: FluentControlRadius.bottomSheet,
      }]}>
        <Image 
          source={artworkSource} 
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
        <Pressable 
          style={[styles.content, { opacity: isPressed ? 0.7 : 1 }]} 
          onPress={handlePress}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
        >
          <Image source={artworkSource} style={styles.artwork} />
          <View style={styles.info}>
            <Text style={[FluentTypography.body2, { color: tokens.colors.text }]} numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text style={[FluentTypography.caption2, { color: tokens.colors.textSecondary }]} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>
          <View style={styles.controls}>
            <Pressable
              onPress={handlePlayPause}
              style={[styles.playButton, { backgroundColor: tokens.colors.primary }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? "Pause" : "Play"}
            >
              <MaterialCommunityIcons 
                name={(isPlaying ? icons.pause : icons.play) as keyof typeof MaterialCommunityIcons.glyphMap} 
                size={FluentIconSize.large} 
                color={tokens.colors.onPrimary} 
              />
            </Pressable>
            {onDismiss && (
              <Pressable
                onPress={handleSwipeDown}
                style={styles.dismissButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Minimize player"
              >
                <MaterialCommunityIcons 
                  name="chevron-down" 
                  size={FluentIconSize.medium} 
                  color={tokens.colors.textSecondary} 
                />
              </Pressable>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  restoreHandle: {
    position: "absolute",
    left: "50%",
    marginLeft: -40,
    width: 80,
    height: FluentTouchTarget.minimum,
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
    height: 2,
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
    paddingLeft: FluentSpacing.s,
    paddingRight: FluentSpacing.s,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.large,
  },
  info: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    gap: FluentSpacing.xxs,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentGap.smaller,
    paddingRight: FluentSpacing.s,
  },
  playButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  dismissButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    justifyContent: "center",
    alignItems: "center",
  },
});

export const MiniPlayer = memo(MiniPlayerComponent);
