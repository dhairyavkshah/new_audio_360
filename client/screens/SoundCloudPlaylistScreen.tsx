import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, CommonActions, RouteProp } from "@react-navigation/native";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useToast } from "@/contexts/ToastContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { getShadowStyle } from "@/constants/fluent2/shadows";
import SoundCloudService, { SoundCloudTrack, SoundCloudPlaylist } from "@/services/SoundCloudService";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SoundCloudPlaylistScreenRouteProp = RouteProp<
  { SoundCloudPlaylist: { playlist: SoundCloudPlaylist } },
  'SoundCloudPlaylist'
>;

export default function SoundCloudPlaylistScreen() {
  const navigation = useNavigation();
  const route = useRoute<SoundCloudPlaylistScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useThemeContext();
  const { playSong, setQueue } = usePlayerContext();
  const { showSuccess, showError } = useToast();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const { playlist } = route.params;
  const [tracks, setTracks] = useState<SoundCloudTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPlaylistTracks();
  }, [playlist.id]);

  const loadPlaylistTracks = async () => {
    setIsLoading(true);
    try {
      const result = await SoundCloudService.getPlaylistTracks(playlist.id);
      setTracks(result);
    } catch (error) {
      console.error('[SoundCloudPlaylistScreen] Load tracks error:', error);
      showError("Failed to load playlist tracks");
    } finally {
      setIsLoading(false);
    }
  };

  const playTrack = useCallback((track: SoundCloudTrack) => {
    const playableSong = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || 'SoundCloud',
      duration: track.duration * 1000,
      audioUrl: track.stream_url,
      artwork: track.artwork_url || undefined,
    };
    
    playSong(playableSong);
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ListenTab',
        params: {
          screen: 'NowPlaying',
          params: { songId: playableSong.id },
        },
      })
    );
  }, [playSong, navigation]);

  const playAllTracks = useCallback(() => {
    if (tracks.length === 0) return;

    const playableSongs = tracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || 'SoundCloud',
      duration: track.duration * 1000,
      audioUrl: track.stream_url,
      artwork: track.artwork_url || undefined,
    }));

    setQueue(playableSongs);
    playSong(playableSongs[0]);

    navigation.dispatch(
      CommonActions.navigate({
        name: 'ListenTab',
        params: {
          screen: 'NowPlaying',
          params: { songId: playableSongs[0].id },
        },
      })
    );
  }, [tracks, playSong, setQueue, navigation]);

  const addToLibrary = async (track: SoundCloudTrack) => {
    setAddingIds(prev => new Set(prev).add(track.id));
    try {
      await SoundCloudService.addToFavorites(track);
      showSuccess(`Added "${track.title}" to favorites`);
    } catch (error) {
      showError("Failed to add song");
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  };

  const formatTotalDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  const renderHeader = () => (
    <View style={[
      styles.header,
      { backgroundColor: colors.colorNeutralBackground2 },
      getShadowStyle('shadow8', isDark),
    ]}>
      <Pressable 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <MaterialCommunityIcons 
          name="arrow-left" 
          size={24} 
          color={colors.colorNeutralForeground1} 
        />
      </Pressable>

      <View style={styles.headerContent}>
        {playlist.artwork_url ? (
          <Image 
            source={{ uri: playlist.artwork_url }} 
            style={styles.playlistArtwork}
          />
        ) : (
          <View style={[styles.playlistArtwork, styles.artworkPlaceholder, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="playlist-music" size={48} color="#FFFFFF" />
          </View>
        )}

        <View style={styles.headerInfo}>
          <FluentText variant="title2" numberOfLines={2} style={styles.playlistTitle}>
            {playlist.title}
          </FluentText>
          <FluentText variant="body2" color="secondary" numberOfLines={1}>
            {playlist.user}
          </FluentText>
          <FluentText variant="caption1" color="tertiary" style={styles.playlistMeta}>
            {playlist.trackCount} tracks • {formatTotalDuration(playlist.duration)}
          </FluentText>
        </View>
      </View>

      <Pressable
        style={[styles.playAllButton, { backgroundColor: theme.primary }]}
        onPress={playAllTracks}
        disabled={isLoading || tracks.length === 0}
      >
        <MaterialCommunityIcons name="play" size={20} color="#FFFFFF" />
        <FluentText variant="body2" style={styles.playAllText}>
          Play All
        </FluentText>
      </Pressable>
    </View>
  );

  const renderTrack = ({ item, index }: { item: SoundCloudTrack; index: number }) => {
    const isAdding = addingIds.has(item.id);

    return (
      <Pressable 
        style={[
          styles.trackCard, 
          { backgroundColor: colors.colorNeutralBackground2 },
          getShadowStyle('shadow2', isDark),
        ]}
        onPress={() => playTrack(item)}
      >
        <FluentText variant="body2" color="tertiary" style={styles.trackNumber}>
          {index + 1}
        </FluentText>

        {item.artwork_url ? (
          <Image 
            source={{ uri: item.artwork_url }} 
            style={styles.artworkImage}
          />
        ) : (
          <View style={[styles.playIcon, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="soundcloud" size={20} color="#FFFFFF" />
          </View>
        )}
        
        <View style={styles.trackInfo}>
          <FluentText variant="body1" numberOfLines={1} style={{ fontWeight: '600' }}>
            {item.title}
          </FluentText>
          <FluentText variant="body2" color="secondary" numberOfLines={1}>
            {item.artist}
          </FluentText>
          <FluentText variant="caption1" color="tertiary">
            {SoundCloudService.formatDurationFromSeconds(item.duration)}
          </FluentText>
        </View>

        <Pressable
          style={[styles.addButton, { backgroundColor: theme.primary + '15' }]}
          onPress={(e) => {
            e.stopPropagation();
            addToLibrary(item);
          }}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <MaterialCommunityIcons name="heart-plus-outline" size={22} color={theme.primary} />
          )}
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.colorNeutralBackground1, paddingTop: insets.top }]}>
      {renderHeader()}

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <FluentText variant="body2" color="secondary" style={styles.statusText}>
            Loading tracks...
          </FluentText>
        </View>
      ) : tracks.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons 
            name="playlist-music-outline" 
            size={64} 
            color={theme.primary} 
            style={{ opacity: 0.5 }} 
          />
          <FluentText variant="subtitle1" color="secondary" style={styles.statusText}>
            No tracks in this playlist
          </FluentText>
        </View>
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderTrack}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderBottomLeftRadius: FluentRadius.large,
    borderBottomRightRadius: FluentRadius.large,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -FluentSpacing.s,
    marginBottom: FluentSpacing.s,
  },
  headerContent: {
    flexDirection: 'row',
    gap: FluentSpacing.m,
  },
  playlistArtwork: {
    width: 100,
    height: 100,
    borderRadius: FluentRadius.medium,
  },
  artworkPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  playlistTitle: {
    fontWeight: '600',
    marginBottom: FluentSpacing.xxs,
  },
  playlistMeta: {
    marginTop: FluentSpacing.xs,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.l,
    borderRadius: FluentRadius.medium,
    marginTop: FluentSpacing.m,
    gap: FluentSpacing.xs,
  },
  playAllText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.xl,
  },
  statusText: {
    marginTop: FluentSpacing.m,
    textAlign: 'center',
  },
  listContent: {
    padding: FluentSpacing.m,
    paddingBottom: FluentSpacing.xxl,
  },
  separator: {
    height: FluentSpacing.s,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    gap: FluentSpacing.m,
  },
  trackNumber: {
    width: 24,
    textAlign: 'center',
  },
  artworkImage: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.small,
  },
  playIcon: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: FluentRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
