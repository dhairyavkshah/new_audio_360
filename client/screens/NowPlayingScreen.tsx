import React, { useCallback, useRef } from "react";
import { View, StyleSheet, Image, ImageBackground, Platform, Pressable, ActivityIndicator, ScrollView, useWindowDimensions } from "react-native";

// Default album art for songs without artwork
const DEFAULT_ALBUM_ART = require("@/assets/images/default_album_art.png");
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
// Animation disabled to prevent overlay issues
// import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { FluentText } from "@/components/fluent";
import { PlaybackControls } from "@/components/PlaybackControls";
import { ProgressBar } from "@/components/ProgressBar";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { usePlayer } from "@/hooks/usePlayer";
import { FluentSpacing, FluentRadius, FluentIconSize, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

const BLUR_INTENSITY = 40;
const TOUCH_TARGET_MIN = 44;
const HORIZONTAL_PADDING = FluentSpacing.l;

export default function NowPlayingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useSafeTabBarHeight();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
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
  const visitCountRef = useRef(0);
  
  const isCompact = screenWidth <= 375 || screenHeight <= 700;
  const isVeryCompact = screenHeight <= 667;
  const isExtraCompact = screenHeight <= 580;
  const availableHeight = screenHeight - headerHeight - tabBarHeight - insets.top - insets.bottom;
  const artworkSize = isExtraCompact 
    ? Math.min(screenWidth - FluentSpacing.m * 2, availableHeight * 0.32, 160)
    : isVeryCompact 
      ? Math.min(screenWidth - FluentSpacing.l * 2, availableHeight * 0.35, 200)
      : isCompact 
        ? Math.min(screenWidth - FluentSpacing.l * 2, availableHeight * 0.4, 240)
        : Math.min(screenWidth - FluentSpacing.xxl * 2, availableHeight * 0.45, 320);

  useFocusEffect(
    useCallback(() => {
      visitCountRef.current += 1;
      setNowPlayingVisible(true);
      return () => {
        setNowPlayingVisible(false);
      };
    }, [setNowPlayingVisible])
  );

  // Animation disabled to prevent overlay issues

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
        source={currentSong.artwork ? { uri: currentSong.artwork } : DEFAULT_ALBUM_ART}
        style={StyleSheet.absoluteFill}
        blurRadius={Platform.OS === "ios" ? BLUR_INTENSITY : BLUR_INTENSITY / 2}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.65)' }]} />
      </ImageBackground>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content, 
          { 
            paddingTop: isExtraCompact ? FluentSpacing.xxs : isCompact ? FluentSpacing.s : FluentSpacing.m, 
            paddingBottom: tabBarHeight + (isExtraCompact ? FluentSpacing.xs : FluentSpacing.m), 
            paddingHorizontal: isExtraCompact ? FluentSpacing.s : isCompact ? FluentSpacing.m : HORIZONTAL_PADDING,
            minHeight: availableHeight,
          }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.artworkContainer, { marginTop: isExtraCompact ? 0 : isVeryCompact ? FluentSpacing.xxs : isCompact ? FluentSpacing.s : FluentSpacing.l }]}>
          <View style={styles.artworkWrapper}>
            <Image
              source={currentSong.artwork ? { uri: currentSong.artwork } : DEFAULT_ALBUM_ART}
              style={[styles.artwork, { width: artworkSize, height: artworkSize }]}
            />
            {(isLoading || isBuffering) ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
                <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.m }}>
                  {isLoading ? "Loading..." : "Buffering..."}
                </FluentText>
              </View>
            ) : null}
          </View>
          {error ? (
            <View style={[styles.errorBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }]}>
              <MaterialCommunityIcons name="alert-circle" size={FluentIconSize.tiny} color={colors.colorPaletteRedForeground1} />
              <FluentText variant="caption1" style={{ color: colors.colorPaletteRedForeground1, marginLeft: FluentSpacing.xxs, flex: 1 }} numberOfLines={1}>
                {error}
              </FluentText>
            </View>
          ) : null}
        </View>

        <View style={[styles.songInfo, { marginTop: isExtraCompact ? FluentSpacing.s : isVeryCompact ? FluentSpacing.m : isCompact ? FluentSpacing.l : FluentSpacing.xl, marginBottom: isExtraCompact ? 0 : isVeryCompact ? FluentSpacing.xs : FluentSpacing.s }]}>
          <FluentText variant={isExtraCompact ? "body1" : isVeryCompact ? "subtitle1" : "title1"} style={[styles.songTitle, textShadowStyle]} numberOfLines={1}>
            {currentSong.title}
          </FluentText>
          <FluentText 
            variant={isExtraCompact ? "caption1" : isVeryCompact ? "body2" : "subtitle1"} 
            style={[styles.artistName, textShadowStyle, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.colorNeutralForeground2 }]} 
            numberOfLines={1}
          >
            {currentSong.artist}
          </FluentText>
          <View style={[styles.actionButtons, (isExtraCompact || isVeryCompact) && { marginTop: FluentSpacing.xs, gap: FluentSpacing.l }]}>
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

        {!isExtraCompact && (
          <View style={[styles.waveformContainer, { marginVertical: isVeryCompact ? FluentSpacing.xxs : isCompact ? FluentSpacing.s : FluentSpacing.m }]}>
            <AudioWaveform
              isAnimating={isPlaying}
              barCount={isVeryCompact ? 35 : 50}
              barWidth={isVeryCompact ? 2 : 3}
              height={isVeryCompact ? 24 : 40}
              color={colors.colorBrandForeground1}
            />
          </View>
        )}

        <View style={[styles.progressContainer, { marginTop: isExtraCompact ? FluentSpacing.xs : 0, marginBottom: isExtraCompact ? FluentSpacing.xxs : isVeryCompact ? FluentSpacing.xs : FluentSpacing.s }]}>
          <ProgressBar
            progress={progress}
            duration={duration || currentSong.duration}
            currentTime={currentTime}
            onSeek={seek}
            width={screenWidth - (isExtraCompact ? FluentSpacing.m * 2 : isCompact ? FluentSpacing.l * 2 : FluentSpacing.xxl * 2)}
            showTextShadow={true}
          />
        </View>

        <View style={[styles.controlsContainer, { marginBottom: isExtraCompact ? 0 : isVeryCompact ? FluentSpacing.xs : FluentSpacing.s }]}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: "center",
    justifyContent: "space-between",
    flexGrow: 1,
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
  waveformContainer: {},
  progressContainer: {},
  controlsContainer: {
    width: "100%",
  },
});
