import React, { useCallback, useMemo, memo, useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Image, Platform, Text, useWindowDimensions, LayoutChangeEvent } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
  FluentTouchTarget,
  getShadowStyle,
} from "@/constants/fluent2";
import { useAlbumArt } from "@/hooks/useAlbumArt";

interface MiniPlayerProps {
  bottomOffset?: number;
  isDismissed?: boolean;
  onDismiss?: () => void;
  onRestore?: () => void;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

const RESTORE_HANDLE_WIDTH = 80;
const RESTORE_HANDLE_HEIGHT = FluentTouchTarget.minimum;
const MIN_EDGE_PADDING = FluentSpacing.s;

function MiniPlayerComponent({ bottomOffset = 0, isDismissed = false, onDismiss, onRestore }: MiniPlayerProps) {
  const navigation = useNavigation<any>();
  const { isDark } = useThemeContext();
  const { icons } = useSkin();
  const tokens = useThemeTokens();
  const { playTapSound } = useUiSound();
  const { currentSong, isPlaying, togglePlayPause, progress } = usePlayerContext();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  const [playerHeight, setPlayerHeight] = useState(FluentLayoutSize.miniPlayerHeight + FluentSliderSize.trackThin);
  
  const cardEffectStyle = useMemo(() => getCardEffectStyle(tokens, 2), [tokens]);
  const glowStyle = useMemo(() => getGlowStyle(tokens), [tokens]);
  const shadowStyle = useMemo(() => getShadowStyle('shadow8', isDark), [isDark]);
  const restoreShadowStyle = useMemo(() => getShadowStyle('shadow4', isDark), [isDark]);
  
  const albumArt = useAlbumArt(currentSong?.id, currentSong?.artwork);
  const artworkSource = useMemo(() => currentSong ? { uri: albumArt } : undefined, [albumArt, currentSong]);
  
  const containerBottom = useMemo(() => bottomOffset + FluentSpacing.s + (insets.bottom > 0 ? 0 : FluentSpacing.s), [bottomOffset, insets.bottom]);
  
  const progressWidth = useMemo(() => `${(progress || 0) * 100}%` as const, [progress]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const restoreTranslateX = useSharedValue(0);
  const restoreTranslateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const hasDragged = useSharedValue(false);
  const restoreHasDragged = useSharedValue(false);
  const mainDraggedRef = useRef(false);
  const restoreDraggedRef = useRef(false);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    restoreTranslateX.value = 0;
    restoreTranslateY.value = 0;
  }, [screenWidth, screenHeight]);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const setMainDraggedTrue = useCallback(() => {
    mainDraggedRef.current = true;
  }, []);

  const setMainDraggedFalse = useCallback(() => {
    mainDraggedRef.current = false;
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setPlayerHeight(height);
    }
  }, []);

  const miniPlayerWidth = screenWidth - FluentSpacing.l * 2;
  const minTranslateX = -(FluentSpacing.l - MIN_EDGE_PADDING);
  const maxTranslateX = FluentSpacing.l - MIN_EDGE_PADDING;
  const minTranslateY = -(screenHeight - playerHeight - containerBottom - insets.top - MIN_EDGE_PADDING);
  const maxTranslateY = containerBottom - MIN_EDGE_PADDING;

  const panGesture = Gesture.Pan()
    .onStart(() => {
      hasDragged.value = false;
      runOnJS(setMainDraggedFalse)();
      startX.value = translateX.value;
      startY.value = translateY.value;
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      hasDragged.value = true;
      runOnJS(setMainDraggedTrue)();
      const newX = startX.value + event.translationX;
      const newY = startY.value + event.translationY;
      translateX.value = Math.max(minTranslateX, Math.min(newX, maxTranslateX));
      translateY.value = Math.max(minTranslateY, Math.min(newY, maxTranslateY));
    })
    .onEnd(() => {
      translateX.value = withSpring(translateX.value, SPRING_CONFIG);
      translateY.value = withSpring(translateY.value, SPRING_CONFIG);
    })
    .minDistance(15)
    .activeOffsetX([-15, 15])
    .activeOffsetY([-15, 15]);

  const restoreCenterX = (screenWidth - RESTORE_HANDLE_WIDTH) / 2;
  const restoreMinX = -(restoreCenterX - MIN_EDGE_PADDING);
  const restoreMaxX = screenWidth - restoreCenterX - RESTORE_HANDLE_WIDTH - MIN_EDGE_PADDING;
  const restoreMinY = -(screenHeight - RESTORE_HANDLE_HEIGHT - containerBottom - insets.top - MIN_EDGE_PADDING);
  const restoreMaxY = containerBottom - MIN_EDGE_PADDING;

  const setRestoreDraggedTrue = useCallback(() => {
    restoreDraggedRef.current = true;
  }, []);

  const setRestoreDraggedFalse = useCallback(() => {
    restoreDraggedRef.current = false;
  }, []);

  const restorePanGesture = Gesture.Pan()
    .onStart(() => {
      restoreHasDragged.value = false;
      runOnJS(setRestoreDraggedFalse)();
      startX.value = restoreTranslateX.value;
      startY.value = restoreTranslateY.value;
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      restoreHasDragged.value = true;
      runOnJS(setRestoreDraggedTrue)();
      const newX = startX.value + event.translationX;
      const newY = startY.value + event.translationY;
      restoreTranslateX.value = Math.max(restoreMinX, Math.min(newX, restoreMaxX));
      restoreTranslateY.value = Math.max(restoreMinY, Math.min(newY, restoreMaxY));
    })
    .onEnd(() => {
      restoreTranslateX.value = withSpring(restoreTranslateX.value, SPRING_CONFIG);
      restoreTranslateY.value = withSpring(restoreTranslateY.value, SPRING_CONFIG);
    })
    .minDistance(15)
    .activeOffsetX([-15, 15])
    .activeOffsetY([-15, 15]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const restoreAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: restoreTranslateX.value },
      { translateY: restoreTranslateY.value },
    ],
  }));

  const handlePress = useCallback(() => {
    if (mainDraggedRef.current) {
      mainDraggedRef.current = false;
      return;
    }
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
    if (restoreDraggedRef.current) {
      restoreDraggedRef.current = false;
      return;
    }
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
      <GestureDetector gesture={restorePanGesture}>
        <Animated.View 
          style={[
            styles.restoreHandle, 
            { 
              bottom: containerBottom,
              backgroundColor: tokens.colors.primary,
            },
            restoreShadowStyle,
            restoreAnimatedStyle,
          ]}
        >
          <Pressable 
            style={styles.restoreHandleContent}
            onPress={handleSwipeUp}
          >
            <MaterialCommunityIcons name="chevron-up" size={FluentIconSize.regular} color={tokens.colors.onPrimary} />
            <MaterialCommunityIcons 
              name={isPlaying ? "music" : "music-off"} 
              size={FluentIconSize.small} 
              color={tokens.colors.onPrimary} 
            />
          </Pressable>
          <View style={styles.dragIndicator}>
            <MaterialCommunityIcons 
              name="drag" 
              size={FluentIconSize.tiny} 
              color={tokens.colors.onPrimary} 
              style={{ opacity: 0.7 }}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View 
        style={[
          styles.container, 
          { bottom: containerBottom, borderRadius: tokens.shapes.cardBorderRadius }, 
          shadowStyle,
          cardEffectStyle,
          glowStyle,
          animatedStyle,
        ]}
        onLayout={onLayout}
      >
        <View style={[styles.progressTrack, { backgroundColor: tokens.colors.outline }]}>
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
        <View style={[styles.background, { borderRadius: tokens.shapes.cardBorderRadius }]}>
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
          <Pressable style={styles.content} onPress={handlePress}>
            <View style={styles.dragHandle}>
              <MaterialCommunityIcons 
                name="drag" 
                size={FluentIconSize.small} 
                color={tokens.colors.textSecondary} 
              />
            </View>
            <Image source={artworkSource} style={[styles.artwork, { borderRadius: tokens.shapes.buttonBorderRadius }]} />
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
              hitSlop={{ top: FluentSpacing.s, bottom: FluentSpacing.s, left: FluentSpacing.s, right: FluentSpacing.s }}
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
              hitSlop={{ top: FluentSpacing.s, bottom: FluentSpacing.s, left: FluentSpacing.s, right: FluentSpacing.s }}
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
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    overflow: "hidden",
    borderRadius: FluentControlRadius.card,
  },
  dismissButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.fab,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: FluentSpacing.s,
  },
  restoreHandle: {
    position: "absolute",
    left: "50%",
    marginLeft: -(RESTORE_HANDLE_WIDTH / 2),
    width: RESTORE_HANDLE_WIDTH,
    height: RESTORE_HANDLE_HEIGHT,
    borderRadius: FluentControlRadius.fab,
    alignItems: "center",
    justifyContent: "center",
  },
  restoreHandleContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    width: "100%",
    gap: FluentSpacing.xs,
  },
  dragIndicator: {
    position: "absolute",
    top: FluentSpacing.xxs,
    right: FluentSpacing.xs,
  },
  dragHandle: {
    position: "absolute",
    left: FluentSpacing.xs,
    top: "50%",
    marginTop: -(FluentIconSize.small / 2),
    opacity: 0.6,
  },
  progressTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: FluentSliderSize.trackThin,
    zIndex: 10,
    borderTopLeftRadius: FluentControlRadius.card,
    borderTopRightRadius: FluentControlRadius.card,
    overflow: "hidden",
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
    paddingLeft: FluentSpacing.xl,
    gap: FluentSpacing.m,
  },
  artwork: {
    width: FluentIconSize.xxlarge,
    height: FluentIconSize.xxlarge,
    borderRadius: FluentControlRadius.button,
  },
  info: {
    flex: 1,
    gap: FluentSpacing.xxs,
  },
  playButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.fab,
    justifyContent: "center",
    alignItems: "center",
  },
});

export const MiniPlayer = memo(MiniPlayerComponent);
