import React, { useCallback, useRef } from "react";
import { View, StyleSheet, Image, ImageBackground, Platform, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { ProgressBar } from "@/components/ProgressBar";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { usePlayer } from "@/hooks/usePlayer";
import {
  FluentSpacing,
  FluentRadius,
  FluentIconSize,
  FluentLightColors,
  FluentDarkColors,
  FluentLayoutSize,
  FluentTouchTarget,
  FluentSpring,
} from "@/constants/fluent2";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BLUR_INTENSITY = 40;
const TOP_BAR_HEIGHT = FluentLayoutSize.topBarHeight;
const TOUCH_TARGET = FluentTouchTarget.minimum;
const ARTWORK_MAX_SIZE = 280;
const PLAY_BUTTON_SIZE = 64;
const SKIP_BUTTON_SIZE = 48;
const SECONDARY_BUTTON_SIZE = TOUCH_TARGET;

interface ControlButtonProps {
  icon: string;
  size: number;
  color: string;
  onPress: () => void;
  isPrimary?: boolean;
  backgroundColor?: string;
  buttonSize?: number;
}

function ControlButton({
  icon,
  size,
  color,
  onPress,
  isPrimary = false,
  backgroundColor,
  buttonSize = TOUCH_TARGET,
}: ControlButtonProps) {
  const { playTapSound } = useUiSound();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, FluentSpring.standard);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, FluentSpring.standard);
  };

  const handlePress = () => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        isPrimary ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
      );
    }
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: backgroundColor || "transparent",
        },
        animatedStyle,
      ]}
    >
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={size}
        color={color}
      />
    </AnimatedPressable>
  );
}

export default function NowPlayingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
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

  const artworkSize = Math.min(ARTWORK_MAX_SIZE, screenWidth - 80);
  const progressBarWidth = screenWidth - FluentSpacing.l * 2;

  useFocusEffect(
    useCallback(() => {
      visitCountRef.current += 1;
      setNowPlayingVisible(true);
      return () => {
        setNowPlayingVisible(false);
      };
    }, [setNowPlayingVisible])
  );

  const textShadowStyle = {
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  };

  const handleBack = () => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.goBack();
  };

  const handleOptions = () => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={{ height: FluentSpacing.l }} />

        <View style={styles.topBar}>
          <Pressable
            style={styles.topBarButton}
            onPress={handleBack}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="chevron-down"
              size={FluentIconSize.large}
              color={colors.colorNeutralForeground1}
            />
          </Pressable>
          <Pressable
            style={styles.topBarButton}
            onPress={handleOptions}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={FluentIconSize.medium}
              color={colors.colorNeutralForeground1}
            />
          </Pressable>
        </View>

        <View style={{ height: FluentSpacing.xxxl }} />

        <View style={styles.artworkContainer}>
          <View style={[styles.artworkWrapper, { width: artworkSize, height: artworkSize }]}>
            <Image
              source={{ uri: currentSong.artwork }}
              style={[styles.artwork, { width: artworkSize, height: artworkSize }]}
            />
            {(isLoading || isBuffering) && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
                <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.m }}>
                  {isLoading ? "Loading..." : "Buffering..."}
                </FluentText>
              </View>
            )}
          </View>
          {error && (
            <View style={[styles.errorBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }]}>
              <MaterialCommunityIcons name="alert-circle" size={FluentIconSize.tiny} color={colors.colorPaletteRedForeground1} />
              <FluentText variant="caption1" style={{ color: colors.colorPaletteRedForeground1, marginLeft: FluentSpacing.xxs, flex: 1 }} numberOfLines={1}>
                {error}
              </FluentText>
            </View>
          )}
        </View>

        <View style={{ height: FluentSpacing.xxxl }} />

        <View style={styles.songInfo}>
          <FluentText
            variant="title3"
            style={[styles.songTitle, textShadowStyle, { maxWidth: screenWidth * 0.8 }]}
            numberOfLines={1}
          >
            {currentSong.title}
          </FluentText>
          <View style={{ height: FluentSpacing.xs }} />
          <FluentText
            variant="body2"
            style={[styles.artistName, textShadowStyle, { color: colors.colorNeutralForeground2, maxWidth: screenWidth * 0.8 }]}
            numberOfLines={1}
          >
            {currentSong.artist}
          </FluentText>
        </View>

        <View style={{ height: FluentSpacing.xxl }} />

        <View style={styles.progressContainer}>
          <ProgressBar
            progress={progress}
            duration={duration || currentSong.duration}
            currentTime={currentTime}
            onSeek={seek}
            width={progressBarWidth}
            showTextShadow={true}
          />
        </View>

        <View style={{ height: FluentSpacing.xxxl }} />

        <View style={styles.mainControls}>
          <ControlButton
            icon="skip-previous"
            size={FluentIconSize.large}
            color={colors.colorNeutralForeground1}
            onPress={handlePrevious}
            buttonSize={SKIP_BUTTON_SIZE}
          />
          <View style={{ width: FluentSpacing.xxxl }} />
          <ControlButton
            icon={isPlaying ? "pause" : "play"}
            size={FluentIconSize.xlarge}
            color={colors.colorNeutralForegroundOnBrand}
            onPress={togglePlayPause}
            isPrimary
            backgroundColor={colors.colorBrandBackground}
            buttonSize={PLAY_BUTTON_SIZE}
          />
          <View style={{ width: FluentSpacing.xxxl }} />
          <ControlButton
            icon="skip-next"
            size={FluentIconSize.large}
            color={colors.colorNeutralForeground1}
            onPress={handleNext}
            buttonSize={SKIP_BUTTON_SIZE}
          />
        </View>

        <View style={{ height: FluentSpacing.xxl }} />

        <View style={styles.secondaryControls}>
          <ControlButton
            icon="shuffle"
            size={FluentIconSize.medium}
            color={shuffle ? colors.colorBrandForeground1 : colors.colorNeutralForeground2}
            onPress={toggleShuffle}
            buttonSize={SECONDARY_BUTTON_SIZE}
          />
          <View style={{ width: FluentSpacing.xxl }} />
          <ControlButton
            icon={repeat === "one" ? "repeat-once" : "repeat"}
            size={FluentIconSize.medium}
            color={repeat !== "off" ? colors.colorBrandForeground1 : colors.colorNeutralForeground2}
            onPress={toggleRepeat}
            buttonSize={SECONDARY_BUTTON_SIZE}
          />
          <View style={{ width: FluentSpacing.xxl }} />
          <ControlButton
            icon="playlist-music"
            size={FluentIconSize.medium}
            color={colors.colorNeutralForeground2}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              navigation.navigate("Queue");
            }}
            buttonSize={SECONDARY_BUTTON_SIZE}
          />
          <View style={{ width: FluentSpacing.xxl }} />
          <ControlButton
            icon="tune-vertical"
            size={FluentIconSize.medium}
            color={colors.colorNeutralForeground2}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              navigation.navigate("SoundLab" as any);
            }}
            buttonSize={SECONDARY_BUTTON_SIZE}
          />
        </View>

        <View style={{ height: FluentSpacing.l }} />
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
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    height: TOP_BAR_HEIGHT,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: FluentSpacing.l,
  },
  topBarButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    justifyContent: "center",
    alignItems: "center",
  },
  artworkContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  artworkWrapper: {
    borderRadius: FluentRadius.xLarge,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
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
    fontWeight: "600",
    textAlign: "center",
  },
  artistName: {
    textAlign: "center",
    fontWeight: "400",
  },
  progressContainer: {
    width: "100%",
    paddingHorizontal: FluentSpacing.l,
  },
  mainControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
