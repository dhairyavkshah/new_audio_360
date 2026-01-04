import React, { useEffect } from "react";
import { View, StyleSheet, Image, Dimensions, ImageBackground, Platform, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { FluentText } from "@/components/fluent2";
import { PlaybackControls } from "@/components/PlaybackControls";
import { ProgressBar } from "@/components/ProgressBar";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { usePlayer } from "@/hooks/usePlayer";
import { Fluent2 } from "@/constants/fluent2";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 64, 320);
const BLUR_INTENSITY = 40;

export default function NowPlayingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = 80 + insets.bottom;
  }
  const { colors, spacing, radius, isDark } = useFluent2Theme();
  const { playTapSound } = useUiSound();
  const { isFavorite, toggleFavorite } = usePlayerContext();
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <FluentText variant="title2">No song playing</FluentText>
          <FluentText variant="body1" color="secondary" style={{ marginTop: spacing.sm }}>
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
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }]} />
      </ImageBackground>

      <View style={[styles.content, { paddingTop: headerHeight + spacing.lg, paddingBottom: tabBarHeight + spacing.xl, paddingHorizontal: spacing.xl }]}>
        <View style={[styles.artworkContainer, { marginTop: spacing.lg }]}>
          <Animated.View style={[styles.artworkWrapper, { borderRadius: radius.xl }, artworkStyle]}>
            <Image
              source={{ uri: currentSong.artwork }}
              style={[styles.artwork, { width: ARTWORK_SIZE, height: ARTWORK_SIZE, borderRadius: radius.xl }]}
            />
            {(isLoading || isBuffering) && (
              <View style={[styles.loadingOverlay, { borderRadius: radius.xl }]}>
                <ActivityIndicator size="large" color={colors.brandPrimary} />
                <FluentText variant="caption1" color="secondary" style={{ marginTop: spacing.sm }}>
                  {isLoading ? "Loading..." : "Buffering..."}
                </FluentText>
              </View>
            )}
          </Animated.View>
        </View>
        
        {error && (
          <View style={[styles.errorContainer, { marginTop: spacing.sm, paddingHorizontal: spacing.md }]}>
            <MaterialCommunityIcons name="alert-circle" size={20} color={colors.statusDanger} />
            <FluentText variant="caption1" style={{ color: colors.statusDanger, marginLeft: spacing.xs }}>
              {error}
            </FluentText>
          </View>
        )}

        <View style={[styles.songInfo, { marginTop: spacing.xxl, marginBottom: spacing.md }]}>
          <FluentText variant="title2" style={[styles.songTitle, textShadowStyle]} numberOfLines={1}>
            {currentSong.title}
          </FluentText>
          <FluentText 
            variant="body1" 
            style={[styles.artistName, textShadowStyle, { marginTop: spacing.sm, color: isDark ? 'rgba(255,255,255,0.85)' : colors.textSecondary }]} 
            numberOfLines={1}
          >
            {currentSong.artist}
          </FluentText>
          <View style={[styles.actionButtons, { marginTop: spacing.md, gap: spacing.lg }]}>
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
                color={isFavorite(currentSong.id) ? colors.statusDanger : (isDark ? "rgba(255,255,255,0.85)" : colors.textSecondary)}
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
                color={isDark ? "rgba(255,255,255,0.85)" : colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        <View style={[styles.waveformContainer, { marginVertical: spacing.lg }]}>
          <AudioWaveform
            isAnimating={isPlaying}
            barCount={50}
            barWidth={3}
            height={40}
            color={colors.brandPrimary}
          />
        </View>

        <View style={[styles.progressContainer, { marginBottom: spacing.xl }]}>
          <ProgressBar
            progress={progress}
            duration={duration || currentSong.duration}
            currentTime={currentTime}
            onSeek={seek}
            width={SCREEN_WIDTH - 64}
            showTextShadow={true}
          />
        </View>

        <View style={[styles.controlsContainer, { marginBottom: spacing.md }]}>
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
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  artworkContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  artworkWrapper: {
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    position: "relative",
  },
  artwork: {},
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  songInfo: {
    alignItems: "center",
    width: "100%",
  },
  songTitle: {
    fontWeight: "700",
    textAlign: "center",
  },
  artistName: {
    textAlign: "center",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  waveformContainer: {},
  progressContainer: {},
  controlsContainer: {
    width: "100%",
  },
});
