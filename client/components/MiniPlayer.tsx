import React from "react";
import { View, StyleSheet, Pressable, Image, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { FluentText } from "@/components/fluent2";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { Fluent2 } from "@/constants/fluent2";

interface MiniPlayerProps {
  bottomOffset?: number;
}

export function MiniPlayer({ bottomOffset = 0 }: MiniPlayerProps) {
  const navigation = useNavigation<any>();
  const { colors, spacing, radius, isDark } = useFluent2Theme();
  const { playTapSound } = useUiSound();
  const { currentSong, isPlaying, togglePlayPause } = usePlayerContext();

  if (!currentSong) {
    return null;
  }

  const handlePress = () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("ListenTab", {
      screen: "NowPlaying",
      params: { songId: currentSong.id },
    });
  };

  const handlePlayPause = (event: any) => {
    event.stopPropagation();
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePlayPause();
  };

  return (
    <View style={[styles.container, { bottom: bottomOffset + spacing.sm, left: spacing.m, right: spacing.m, borderRadius: radius.large }]}>
      <View style={[styles.background, { borderRadius: radius.large }]}>
        <Image 
          source={{ uri: currentSong.artwork }} 
          style={StyleSheet.absoluteFill}
        />
        <BlurView 
          intensity={Platform.OS === "ios" ? 60 : 80} 
          tint={isDark ? "dark" : "light"} 
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        />
        <Pressable style={[styles.content, { paddingVertical: spacing.xs, paddingHorizontal: spacing.m }]} onPress={handlePress}>
          <Image source={{ uri: currentSong.artwork }} style={[styles.artwork, { borderRadius: radius.medium }]} />
          <View style={[styles.info, { marginLeft: spacing.sm }]}>
            <FluentText variant="body2" numberOfLines={1} style={{ fontWeight: "600" }}>
              {currentSong.title}
            </FluentText>
            <FluentText variant="caption1" color="secondary" numberOfLines={1}>
              {currentSong.artist}
            </FluentText>
          </View>
          <Pressable
            onPress={handlePlayPause}
            style={[styles.playButton, { backgroundColor: colors.brandPrimary }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons 
              name={isPlaying ? "pause" : "play"} 
              size={18} 
              color="#FFFFFF" 
            />
          </Pressable>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  background: {
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  artwork: {
    width: 48,
    height: 48,
  },
  info: {
    flex: 1,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
