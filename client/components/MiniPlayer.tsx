import React from "react";
import { View, StyleSheet, Pressable, Image, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext, useSkin } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";

interface MiniPlayerProps {
  bottomOffset?: number;
}

export function MiniPlayer({ bottomOffset = 0 }: MiniPlayerProps) {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useThemeContext();
  const { icons } = useSkin();
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
    <View style={[styles.container, { bottom: bottomOffset + Spacing.sm }]}>
      <View style={styles.background}>
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
        <Pressable style={styles.content} onPress={handlePress}>
          <Image source={{ uri: currentSong.artwork }} style={styles.artwork} />
          <View style={styles.info}>
            <ThemedText type="small" numberOfLines={1} style={{ fontWeight: "600" }}>
              {currentSong.title}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }} numberOfLines={1}>
              {currentSong.artist}
            </ThemedText>
          </View>
          <Pressable
            onPress={handlePlayPause}
            style={[styles.playButton, { backgroundColor: theme.primary }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons 
              name={(isPlaying ? icons.pause : icons.play) as keyof typeof MaterialCommunityIcons.glyphMap} 
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
    left: Layout.horizontalPadding,
    right: Layout.horizontalPadding,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  background: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.size2,
    paddingHorizontal: Spacing.size3,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
