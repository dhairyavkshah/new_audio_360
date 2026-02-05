import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { FluentSpacing, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";
import { getShadowStyle } from "@/constants/fluent2/shadows";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import SoundCloudService, { SoundCloudPlaylist } from "@/services/SoundCloudService";

interface SoundCloudPlaylistCardProps {
  playlist: SoundCloudPlaylist;
  onPress: (playlist: SoundCloudPlaylist) => void;
}

export function SoundCloudPlaylistCard({ playlist, onPress }: SoundCloudPlaylistCardProps) {
  const { isDark } = useThemeContext();
  const colors = useThemedColors();

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.playlistCard, 
        { 
          backgroundColor: colors.colorNeutralBackground2,
          borderColor: colors.colorNeutralStroke2,
          borderWidth: 1,
          opacity: pressed ? 0.9 : 1,
        },
        getShadowStyle('shadow2', isDark),
      ]}
      onPress={() => onPress(playlist)}
    >
      {playlist.artwork_url ? (
        <Image 
          source={{ uri: playlist.artwork_url }} 
          style={styles.playlistArtwork}
        />
      ) : (
        <View style={[styles.playlistArtwork, { backgroundColor: colors.colorBrandBackground }]}>
          <MaterialCommunityIcons name="playlist-music" size={FluentIconSize.large} color={colors.colorNeutralForegroundOnBrand} />
        </View>
      )}
      
      <View style={styles.playlistInfo}>
        <FluentText variant="body1Strong" numberOfLines={1}>
          {playlist.title}
        </FluentText>
        <FluentText variant="body2" color="secondary" numberOfLines={1}>
          {playlist.user}
        </FluentText>
        <View style={styles.playlistMeta}>
          <FluentText variant="caption1" color="tertiary">
            {playlist.trackCount} tracks • {SoundCloudService.formatDurationFromSeconds(playlist.duration)}
          </FluentText>
          {playlist.likesCount > 0 && (
            <View style={styles.likesRow}>
              <MaterialCommunityIcons name="heart" size={FluentIconSize.tiny} color={colors.colorNeutralForeground3} />
              <FluentText variant="caption1" color="tertiary" style={{ marginLeft: FluentSpacing.xxs }}>
                {SoundCloudService.formatPlaybackCount(playlist.likesCount)}
              </FluentText>
            </View>
          )}
        </View>
      </View>

      <MaterialCommunityIcons 
        name="chevron-right" 
        size={FluentIconSize.medium} 
        color={colors.colorNeutralForeground3} 
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    gap: FluentSpacing.m,
    marginBottom: FluentSpacing.s,
  },
  playlistArtwork: {
    width: 56,
    height: 56,
    borderRadius: FluentControlRadius.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    gap: FluentSpacing.xxs,
  },
  playlistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.m,
    marginTop: FluentSpacing.xs,
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SoundCloudPlaylistCard;
