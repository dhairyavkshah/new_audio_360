import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Image, Dimensions, ImageBackground, Platform, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { PlaybackControls } from "@/components/PlaybackControls";
import { ProgressBar } from "@/components/ProgressBar";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { usePlayer } from "@/hooks/usePlayer";
import { Spacing, BorderRadius, ModeStyles, Layout } from "@/constants/theme";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IS_COMPACT = SCREEN_WIDTH <= 375 || SCREEN_HEIGHT <= 667;
const ARTWORK_SIZE = IS_COMPACT 
  ? Math.min(SCREEN_WIDTH - Spacing.l * 2, 240)
  : Math.min(SCREEN_WIDTH - Spacing.xxl * 2, 320);
const BLUR_INTENSITY = 40;

export default function NowPlayingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = Layout.bottomNavHeight + insets.bottom;
  }
  const { theme, isDark } = useThemeContext();
  const { playTapSound } = useUiSound();
  const { isFavorite, toggleFavorite } = usePlayerContext();
  const { setNowPlayingVisible } = useNavigationContext();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    progress,
    shuffle,
    repeat,
    isLoading,
    isBuffering,
    error,
    togglePlayPause,
    handleNext,
    handlePrevious,
    seek,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const artworkScale = useSharedValue(1);

  useFocusEffect(
    useCallback(() => {
      setNowPlayingVisible(true);
      return () => {
        setNowPlayingVisible(false);
      };
    }, [setNowPlayingVisible])
  );

  useEffect(() => {
    if (isPlaying) {
      artworkScale.value = withSpring(1.02, { damping: 20, stiffness: 100 });
    } else {
      artworkScale.value = withSpring(1, { damping: 20, stiffness: 100 });
    }
  }, [isPlaying]);

  const artworkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: artworkScale.value }],
  }));

  const textShadowStyle = {
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  };

  if (!currentSong) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.emptyState}>
          <ThemedText type="h3">No song playing</ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.m }}>
            Select a song from your library
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: currentSong.artwork }}
        style={StyleSheet.absoluteFill}
        blurRadius={Platform.OS === "ios" ? BLUR_INTENSITY : BLUR_INTENSITY / 2}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? `rgba(0,0,0,${ModeStyles.listen.overlayOpacityDark + 0.2})` : `rgba(255,255,255,${ModeStyles.listen.overlayOpacityLight + 0.1})` }]} />
      </ImageBackground>

      <View style={[styles.content, { paddingTop: headerHeight + (IS_COMPACT ? Spacing.m : Spacing.xl), paddingBottom: tabBarHeight + (IS_COMPACT ? Spacing.m : Spacing.xl), paddingHorizontal: IS_COMPACT ? Spacing.m : Layout.horizontalPadding }]}>
        <View style={[styles.artworkContainer, IS_COMPACT && { marginTop: Spacing.s }]}>
          <Animated.View style={[styles.artworkWrapper, artworkStyle]}>
            <Image
              source={{ uri: currentSong.artwork }}
              style={[styles.artwork, { width: ARTWORK_SIZE, height: ARTWORK_SIZE }]}
            />
            {(isLoading || isBuffering) ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.m }}>
                  {isLoading ? "Loading..." : "Buffering..."}
                </ThemedText>
              </View>
            ) : null}
          </Animated.View>
        </View>
        
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#FF4D67" />
            <ThemedText type="caption" style={{ color: "#FF4D67", marginLeft: Spacing.xs }}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.songInfo}>
          <ThemedText type="h3" style={[styles.songTitle, textShadowStyle]} numberOfLines={1}>
            {currentSong.title}
          </ThemedText>
          <ThemedText 
            type="body" 
            style={[styles.artistName, textShadowStyle, { color: isDark ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]} 
            numberOfLines={1}
          >
            {currentSong.artist}
          </ThemedText>
          <View style={styles.actionButtons}>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                playTapSound();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleFavorite(currentSong.id);
              }}
            >
              <MaterialCommunityIcons
                name={isFavorite(currentSong.id) ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite(currentSong.id) ? "#FF4D67" : (isDark ? "rgba(255,255,255,0.85)" : theme.textSecondary)}
              />
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                playTapSound();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("Queue");
              }}
            >
              <MaterialCommunityIcons
                name="playlist-music"
                size={24}
                color={isDark ? "rgba(255,255,255,0.85)" : theme.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.waveformContainer}>
          <AudioWaveform
            isAnimating={isPlaying}
            barCount={50}
            barWidth={3}
            height={40}
            color={theme.primary}
          />
        </View>

        <View style={styles.progressContainer}>
          <ProgressBar
            progress={progress}
            duration={duration || currentSong.duration}
            currentTime={currentTime}
            onSeek={seek}
            width={SCREEN_WIDTH - (IS_COMPACT ? Spacing.l * 2 : Spacing.xxl * 2)}
            showTextShadow={true}
          />
        </View>

        <View style={styles.controlsContainer}>
          <PlaybackControls
            isPlaying={isPlaying}
            onPlayPause={togglePlayPause}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onShuffle={toggleShuffle}
            onRepeat={toggleRepeat}
            shuffleEnabled={shuffle}
            repeatMode={repeat}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.horizontalPadding,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  artworkContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.artworkMargin,
  },
  artworkWrapper: {
    borderRadius: BorderRadius.xl,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    position: "relative",
  },
  artwork: {
    borderRadius: BorderRadius.xl,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.contentBlock,
    paddingHorizontal: Spacing.l,
  },
  songInfo: {
    alignItems: "center",
    marginTop: IS_COMPACT ? Spacing.m : Spacing.artworkMarginLarge,
    marginBottom: IS_COMPACT ? Spacing.s : Spacing.l,
    width: "100%",
  },
  songTitle: {
    fontWeight: "700",
    textAlign: "center",
  },
  artistName: {
    marginTop: Spacing.titleToSubtitle,
    textAlign: "center",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: Spacing.l,
    gap: Spacing.controlCluster,
  },
  actionButton: {
    width: Layout.touchTargetMin,
    height: Layout.touchTargetMin,
    justifyContent: "center",
    alignItems: "center",
  },
  waveformContainer: {
    marginVertical: IS_COMPACT ? Spacing.s : Spacing.progressBarSpacing,
  },
  progressContainer: {
    marginBottom: IS_COMPACT ? Spacing.s : Spacing.progressBarSpacing,
  },
  controlsContainer: {
    width: "100%",
    marginBottom: IS_COMPACT ? Spacing.s : Spacing.l,
  },
});
