import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { FluentSpacing, FluentRadius, FluentTouchTarget, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";
import { getShadowStyle } from "@/constants/fluent2/shadows";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import SoundCloudService, { SoundCloudTrack } from "@/services/SoundCloudService";

interface SoundCloudTrackCardProps {
  track: SoundCloudTrack;
  onPress: (track: SoundCloudTrack) => void;
  onAddToLibrary: (track: SoundCloudTrack) => void;
  isAdding: boolean;
  isFavorited?: boolean;
}

export function SoundCloudTrackCard({ track, onPress, onAddToLibrary, isAdding, isFavorited = false }: SoundCloudTrackCardProps) {
  const { isDark } = useThemeContext();
  const colors = useThemedColors();

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.trackCard, 
        { 
          backgroundColor: colors.colorNeutralBackground2,
          borderColor: colors.colorNeutralStroke2,
          borderWidth: 1,
          opacity: pressed ? 0.9 : 1,
        },
        getShadowStyle('shadow2', isDark),
      ]}
      onPress={() => onPress(track)}
    >
      {track.artwork_url ? (
        <Image 
          source={{ uri: track.artwork_url }} 
          style={styles.artworkImage}
        />
      ) : (
        <View style={[styles.playIcon, { backgroundColor: colors.colorBrandBackground }]}>
          <MaterialCommunityIcons name="soundcloud" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
        </View>
      )}
      
      <View style={styles.trackInfo}>
        <FluentText variant="body1Strong" numberOfLines={1}>
          {track.title}
        </FluentText>
        <FluentText variant="caption1" color="secondary" numberOfLines={1}>
          {track.artist}
        </FluentText>
      </View>

      <FluentText variant="caption1" color="tertiary" style={styles.durationText}>
        {SoundCloudService.formatDurationFromSeconds(track.duration)}
      </FluentText>

      <Pressable
        style={[styles.addButton, { backgroundColor: colors.colorSubtleBackgroundHover }]}
        onPress={(e) => {
          e.stopPropagation();
          onAddToLibrary(track);
        }}
        disabled={isAdding || isFavorited}
      >
        {isAdding ? (
          <ActivityIndicator size="small" color={colors.colorBrandForeground1} />
        ) : isFavorited ? (
          <MaterialCommunityIcons name="heart" size={FluentIconSize.regular} color="#FF4D67" />
        ) : (
          <MaterialCommunityIcons name="heart-plus-outline" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
        )}
      </Pressable>

      <MaterialCommunityIcons 
        name="chevron-right" 
        size={FluentIconSize.small} 
        color={colors.colorNeutralForeground3} 
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
    marginBottom: FluentSpacing.s,
    minHeight: 72,
    gap: FluentSpacing.m,
  },
  playIcon: {
    width: FluentIconSize.xxlarge,
    height: FluentIconSize.xxlarge,
    borderRadius: FluentControlRadius.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkImage: {
    width: FluentIconSize.xxlarge,
    height: FluentIconSize.xxlarge,
    borderRadius: FluentControlRadius.card,
  },
  durationText: {
    marginRight: FluentSpacing.s,
  },
  trackInfo: {
    flex: 1,
    gap: FluentSpacing.xxs,
  },
  addButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SoundCloudTrackCard;
