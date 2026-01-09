import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Image, Dimensions, ImageBackground, Platform, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { FluentText } from "@/components/fluent";
import { PlaybackControls } from "@/components/PlaybackControls";
import { ProgressBar } from "@/components/ProgressBar";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { usePlayer } from "@/hooks/usePlayer";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IS_COMPACT = SCREEN_WIDTH <= 375 || SCREEN_HEIGHT <= 667;
const ARTWORK_SIZE = IS_COMPACT 
  ? Math.min(SCREEN_WIDTH - FluentSpacing.l * 2, 240)
  : Math.min(SCREEN_WIDTH - FluentSpacing.xxl * 2, 320);
const BLUR_INTENSITY = 40;
const TOUCH_TARGET_MIN = 44;
const HORIZONTAL_PADDING = FluentSpacing.l;

export default function NowPlayingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
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

  const colors = isDark ? FluentDarkColors : FluentLightColors;
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
      <View style={[styles.container, { backgroundColor: colors.colorNeutralBackground1 }]}>
        <View style={styles.emptyState}>
          <FluentText variant="title1">No song playing</FluentText>
          <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.m }}>
            Select a song from your library
          </FluentText>
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
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.65)' }]} />
      </ImageBackground>

      <View style={[styles.content, { paddingTop: headerHeight + (IS_COMPACT ? FluentSpacing.m : FluentSpacing.xl), paddingBottom: tabBarHeight + (IS_COMPACT ? FluentSpacing.m : FluentSpacing.xl), paddingHorizontal: IS_COMPACT ? FluentSpacing.m : HORIZONTAL_PADDING }]}>
        <View style={[styles.artworkContainer, IS_COMPACT && { marginTop: FluentSpacing.s }]}>
          <Animated.View style={[styles.artworkWrapper, artworkStyle]}>
            <Image
              source={{ uri: currentSong.artwork }}
              style={[styles.artwork, { width: ARTWORK_SIZE, height: ARTWORK_SIZE }]}
            />
            {(isLoading || isBuffering) ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
                <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.m }}>
                  {isLoading ? "Loading..." : "Buffering..."}
                </FluentText>
              </View>
            ) : null}
          </Animated.View>
          {error ? (
            <View style={[styles.errorBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }]}>
              <MaterialCommunityIcons name="alert-circle" size={14} color={colors.colorPaletteRedForeground1} />
              <FluentText variant="caption1" style={{ color: colors.colorPaletteRedForeground1, marginLeft: FluentSpacing.xxs, flex: 1 }} numberOfLines={1}>
                {error}
              </FluentText>
            </View>
          ) : null}
        </View>

        <View style={styles.songInfo}>
          <FluentText variant="title1" style={[styles.songTitle, textShadowStyle]} numberOfLines={1}>
            {currentSong.title}
          </FluentText>
          <FluentText 
            variant="subtitle1" 
            style={[styles.artistName, textShadowStyle, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.colorNeutralForeground2 }]} 
            numberOfLines={1}
          >
            {currentSong.artist}
          </FluentText>
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
                color={isFavorite(currentSong.id) ? colors.colorPaletteRedForeground1 : (isDark ? "rgba(255,255,255,0.85)" : colors.colorNeutralForeground2)}
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
                color={isDark ? "rgba(255,255,255,0.85)" : colors.colorNeutralForeground2}
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
            color={colors.colorBrandForeground1}
          />
        </View>

        <View style={styles.progressContainer}>
          <ProgressBar
            progress={progress}
            duration={duration || currentSong.duration}
            currentTime={currentTime}
            onSeek={seek}
            width={SCREEN_WIDTH - (IS_COMPACT ? FluentSpacing.l * 2 : FluentSpacing.xxl * 2)}
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
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  artworkContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: FluentSpacing.xxxl,
  },
  artworkWrapper: {
    borderRadius: FluentRadius.xLarge,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    position: "relative",
  },
  artwork: {
    borderRadius: FluentRadius.xLarge,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: FluentRadius.xLarge,
    justifyContent: "center",
    alignItems: "center",
  },
  errorBadge: {
    position: "absolute",
    bottom: -FluentSpacing.l,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.xxs,
    borderRadius: FluentRadius.small,
  },
  songInfo: {
    alignItems: "center",
    marginTop: IS_COMPACT ? FluentSpacing.m : FluentSpacing.xxxxl,
    marginBottom: IS_COMPACT ? FluentSpacing.s : FluentSpacing.l,
    width: "100%",
  },
  songTitle: {
    fontWeight: "700",
    textAlign: "center",
  },
  artistName: {
    marginTop: FluentSpacing.xs,
    textAlign: "center",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: FluentSpacing.l,
    gap: FluentSpacing.xxl,
  },
  actionButton: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    justifyContent: "center",
    alignItems: "center",
  },
  waveformContainer: {
    marginVertical: IS_COMPACT ? FluentSpacing.s : FluentSpacing.l,
  },
  progressContainer: {
    marginBottom: IS_COMPACT ? FluentSpacing.s : FluentSpacing.l,
  },
  controlsContainer: {
    width: "100%",
    marginBottom: IS_COMPACT ? FluentSpacing.s : FluentSpacing.l,
  },
});
