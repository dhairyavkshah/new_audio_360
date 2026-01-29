import React, { useState, useCallback, useMemo, memo } from "react";
import { View, StyleSheet, Pressable, Image, Platform, ActivityIndicator, FlatList, ImageSourcePropType } from "react-native";

// Default album art for songs without artwork
const DEFAULT_ALBUM_ART = require("@/assets/images/default_album_art.png");
import { useNavigation, useFocusEffect, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentText, FluentScreenLayout, FluentListItem } from "@/components/fluent";
import { FluentTopBar, SortOption, CategoryOption } from "@/components/FluentTopBar";
import { SongContextMenu } from "@/components/SongContextMenu";
import { SongCard } from "@/components/SongCard";
import { AnimatedCard } from "@/components/AnimatedCard";
import { usePlayer } from "@/hooks/usePlayer";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { useMediaLibraryContext, DeviceSong } from "@/contexts/MediaLibraryContext";
import { useToast } from "@/contexts/ToastContext";
import { FluentSpacing, FluentRadius, FluentControlRadius, FluentLightColors, FluentDarkColors, FluentTouchTarget, FluentIconSize, getShadowStyle } from "@/constants/fluent2";
import { Song } from "@/lib/data";
import { Album } from "@/navigation/LibraryStackNavigator";
import ArchiveOrgService, { StoredArchiveTrack, ArchiveOrgTrack } from "@/services/ArchiveOrgService";
import SoundCloudService, { StoredSoundCloudTrack } from "@/services/SoundCloudService";

interface DerivedAlbum extends Album {
  songs: DeviceSong[];
}

interface DerivedArtist {
  id: string;
  name: string;
  artwork: string;
  songCount: number;
  songs: DeviceSong[];
}
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";
import { Playlist, getPlaylists } from "@/lib/storage";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";

type NavigationProp = NativeStackNavigationProp<LibraryStackParamList>;

type CategoryType = "liked" | "recent" | "top" | "songs" | "albums" | "artists" | "playlists" | "streaming";

interface CategoryConfig {
  key: CategoryType;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

const categories: CategoryConfig[] = [
  { key: "liked", label: "Liked", icon: "heart", color: "#E91E63" },
  { key: "recent", label: "Recent", icon: "history", color: "#9C27B0" },
  { key: "top", label: "Top", icon: "chart-line", color: "#FF9800" },
  { key: "songs", label: "Songs", icon: "music", color: "#2196F3" },
  { key: "albums", label: "Albums", icon: "album", color: "#4CAF50" },
  { key: "artists", label: "Artists", icon: "account-group", color: "#00BCD4" },
  { key: "playlists", label: "Playlists", icon: "playlist-music", color: "#673AB7" },
  { key: "streaming", label: "Online", icon: "web", color: "#00BFA5" },
];

interface AlbumCardProps {
  album: DerivedAlbum;
  onPress: (album: DerivedAlbum) => void;
}

const AlbumCard = memo(function AlbumCard({ album, onPress }: AlbumCardProps) {
  const imageSource = useMemo(() => album.artwork ? { uri: album.artwork } : DEFAULT_ALBUM_ART, [album.artwork]);
  const handlePress = useCallback(() => onPress(album), [onPress, album]);
  
  return (
    <AnimatedCard
      style={styles.albumCard}
      borderRadius={FluentRadius.large}
      onPress={handlePress}
      accessibilityLabel={`${album.name} by ${album.artist}`}
    >
      <Image source={imageSource} style={styles.albumArtwork} />
      <FluentText variant="body1" numberOfLines={1} style={styles.albumName}>{album.name}</FluentText>
      <FluentText variant="caption1" color="tertiary" numberOfLines={1}>{album.artist}</FluentText>
    </AnimatedCard>
  );
});

interface ArtistCardProps {
  artist: DerivedArtist;
  onPress: (artist: DerivedArtist) => void;
}

const ArtistCard = memo(function ArtistCard({ artist, onPress }: ArtistCardProps) {
  const imageSource = useMemo(() => artist.artwork ? { uri: artist.artwork } : DEFAULT_ALBUM_ART, [artist.artwork]);
  const handlePress = useCallback(() => onPress(artist), [onPress, artist]);
  
  return (
    <AnimatedCard
      style={styles.artistCard}
      borderRadius={FluentRadius.large}
      onPress={handlePress}
      accessibilityLabel={`${artist.name}, ${artist.songCount} songs`}
    >
      <View style={styles.artistAvatarContainer}>
        <Image source={imageSource} style={styles.artistAvatar} />
      </View>
      <FluentText variant="body1" numberOfLines={1} style={styles.artistName}>{artist.name}</FluentText>
      <FluentText variant="caption1" color="tertiary" numberOfLines={1}>{artist.songCount} {artist.songCount === 1 ? 'song' : 'songs'}</FluentText>
    </AnimatedCard>
  );
});

function LibraryScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { playTapSound } = useUiSound();
  const { favorites, recentlyPlayed, mostPlayed, playSong, setQueue } = usePlayerContext();
  const { songs: deviceSongs, isLoading: isLoadingSongs, progress, usingMockData, hideSong } = useMediaLibraryContext();
  const { currentSong, isPlaying } = usePlayer();
  const [activeCategory, setActiveCategory] = useState<CategoryType>("songs");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("title_asc");
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [contextMenuSong, setContextMenuSong] = useState<PlayableSong | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const { showSuccess } = useToast();
  const [archiveFavorites, setArchiveFavorites] = useState<StoredArchiveTrack[]>([]);
  const [soundcloudFavorites, setSoundcloudFavorites] = useState<StoredSoundCloudTrack[]>([]);

  const loadPlaylists = useCallback(async () => {
    const data = await getPlaylists();
    setPlaylists(data);
  }, []);

  const loadArchiveFavorites = useCallback(async () => {
    const favorites = await ArchiveOrgService.getFavorites();
    setArchiveFavorites(favorites);
  }, []);

  const loadSoundCloudFavorites = useCallback(async () => {
    const favorites = await SoundCloudService.getFavorites();
    setSoundcloudFavorites(favorites);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlaylists();
      loadArchiveFavorites();
      loadSoundCloudFavorites();
    }, [loadPlaylists, loadArchiveFavorites, loadSoundCloudFavorites])
  );

  const allSongs = useMemo(() => {
    return deviceSongs;
  }, [deviceSongs]);

  const derivedAlbums = useMemo((): DerivedAlbum[] => {
    const albumMap = new Map<string, DerivedAlbum>();
    
    allSongs.forEach(song => {
      const albumName = song.album || 'Unknown Album';
      if (!albumMap.has(albumName)) {
        albumMap.set(albumName, {
          id: albumName.toLowerCase().replace(/\s+/g, '-'),
          name: albumName,
          artist: song.artist || 'Unknown Artist',
          artwork: song.artwork || `https://picsum.photos/seed/${encodeURIComponent(albumName)}/400/400`,
          songCount: 0,
          songs: [],
        });
      }
      const album = albumMap.get(albumName)!;
      album.songCount++;
      album.songs.push(song as DeviceSong);
    });
    
    return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSongs]);

  const derivedArtists = useMemo((): DerivedArtist[] => {
    const artistMap = new Map<string, DerivedArtist>();
    
    allSongs.forEach(song => {
      const artistName = song.artist || 'Unknown Artist';
      if (!artistMap.has(artistName)) {
        artistMap.set(artistName, {
          id: artistName.toLowerCase().replace(/\s+/g, '-'),
          name: artistName,
          artwork: song.artwork || `https://picsum.photos/seed/${encodeURIComponent(artistName)}/400/400`,
          songCount: 0,
          songs: [],
        });
      }
      const artist = artistMap.get(artistName)!;
      artist.songCount++;
      artist.songs.push(song as DeviceSong);
    });
    
    return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSongs]);

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    const filterSongs = (songs: Song[]) => {
      let result = [...songs];
      if (query) {
        result = result.filter(
          (song) =>
            song.title.toLowerCase().includes(query) ||
            song.artist.toLowerCase().includes(query) ||
            song.album.toLowerCase().includes(query)
        );
      }
      result.sort((a, b) => {
        switch (sortBy) {
          case "title_asc": return a.title.localeCompare(b.title);
          case "title_desc": return b.title.localeCompare(a.title);
          case "artist_asc": return a.artist.localeCompare(b.artist);
          case "duration_asc": return a.duration - b.duration;
          case "duration_desc": return b.duration - a.duration;
          default: return 0;
        }
      });
      return result;
    };

    const filterAlbums = (albums: DerivedAlbum[]) => {
      let result = [...albums];
      if (query) {
        result = result.filter(
          (album) =>
            album.name.toLowerCase().includes(query) ||
            album.artist.toLowerCase().includes(query)
        );
      }
      result.sort((a, b) => a.name.localeCompare(b.name));
      return result;
    };

    const filterArtists = (artists: DerivedArtist[]) => {
      let result = [...artists];
      if (query) {
        result = result.filter((artist) => artist.name.toLowerCase().includes(query));
      }
      result.sort((a, b) => a.name.localeCompare(b.name));
      return result;
    };

    const filterPlaylists = (pls: Playlist[]) => {
      let result = [...pls];
      if (query) {
        result = result.filter((pl) => pl.name.toLowerCase().includes(query));
      }
      result.sort((a, b) => a.name.localeCompare(b.name));
      return result;
    };

    const likedDeviceSongs = allSongs.filter(song => favorites.includes(song.id));
    const likedArchiveSongs: PlayableSong[] = archiveFavorites.map(stored => ({
      id: stored.id,
      title: stored.title,
      artist: stored.artist,
      album: stored.album || 'Online Music',
      duration: (stored.duration || 0) * 1000,
      audioUrl: ArchiveOrgService.getStreamUrl(stored),
      artwork: undefined,
      source: 'archive' as const,
    }));
    const likedSoundCloudSongs: PlayableSong[] = soundcloudFavorites.map(stored => ({
      id: stored.id,
      title: stored.title,
      artist: stored.artist,
      album: stored.album || 'SoundCloud',
      duration: stored.duration * 1000,
      audioUrl: `widget:${stored.id.replace('sc_', '')}`,
      artwork: stored.artwork_url || undefined,
      source: 'soundcloud' as const,
    }));
    const likedSongs = [...likedDeviceSongs, ...likedArchiveSongs, ...likedSoundCloudSongs];
    const recentSongs = recentlyPlayed
      .map(id => allSongs.find(s => s.id === id))
      .filter((s): s is DeviceSong => s !== undefined);
    const topSongs = mostPlayed
      .map(id => allSongs.find(s => s.id === id))
      .filter((s): s is DeviceSong => s !== undefined);

    return {
      liked: filterSongs(likedSongs),
      recent: recentSongs.filter(song => {
        if (!query) return true;
        return song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query);
      }),
      top: topSongs.filter(song => {
        if (!query) return true;
        return song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query);
      }),
      songs: filterSongs(allSongs),
      albums: filterAlbums(derivedAlbums),
      artists: filterArtists(derivedArtists),
      playlists: filterPlaylists(playlists),
    };
  }, [searchQuery, sortBy, playlists, favorites, recentlyPlayed, mostPlayed, allSongs, derivedAlbums, derivedArtists, archiveFavorites, soundcloudFavorites]);

  const categoryCounts = useMemo(() => ({
    liked: favorites.length + archiveFavorites.length + soundcloudFavorites.length,
    recent: recentlyPlayed.length,
    top: mostPlayed.length,
    songs: allSongs.length,
    albums: derivedAlbums.length,
    artists: derivedArtists.length,
    playlists: playlists.length,
    streaming: archiveFavorites.length + soundcloudFavorites.length,
  }), [favorites, recentlyPlayed, mostPlayed, allSongs, derivedAlbums, derivedArtists, playlists, archiveFavorites, soundcloudFavorites]);

  const handleCategoryChange = useCallback((category: CategoryType) => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (category === "streaming") {
      navigation.dispatch(CommonActions.navigate({ name: 'DiscoverTab' }));
      return;
    }
    setActiveCategory(category);
    setSearchQuery("");
    setShowSortOptions(false);
    setShowCategoryDropdown(false);
  }, [playTapSound, navigation]);

  const handleManagePlaylists = useCallback(() => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("PlaylistManagement");
  }, [playTapSound, navigation]);

  const handleSongPress = useCallback((song: PlayableSong, songList: PlayableSong[]) => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQueue(songList);
    playSong(song);
    navigation.dispatch(
      CommonActions.navigate({
        name: "ListenTab",
        params: {
          screen: "NowPlaying",
          params: { songId: song.id },
        },
      })
    );
  }, [playTapSound, setQueue, playSong, navigation]);

  const handlePlaylistPress = useCallback((playlist: Playlist) => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("PlaylistDetail", { playlistId: playlist.id, playlistName: playlist.name });
  }, [playTapSound, navigation]);

  const handleSortPress = useCallback((option: SortOption) => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortBy(option);
    setShowSortOptions(false);
  }, [playTapSound]);

  const handleSongContextMenu = useCallback((song: PlayableSong) => {
    setContextMenuSong(song);
    setShowContextMenu(true);
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setShowContextMenu(false);
    setContextMenuSong(null);
  }, []);

  const handleContextMenuSuccess = useCallback((message: string) => {
    showSuccess(message);
    loadPlaylists();
  }, [loadPlaylists, showSuccess]);

  const categoryOptions: CategoryOption[] = useMemo(() => 
    categories.map(cat => ({
      key: cat.key,
      label: cat.label,
      icon: cat.icon,
      color: cat.color,
      count: categoryCounts[cat.key],
    })),
    [categoryCounts]
  );

  const handleCategorySelect = useCallback((key: string) => {
    handleCategoryChange(key as CategoryType);
  }, [handleCategoryChange]);

  const renderPlaylistAddButton = () => (
    activeCategory === "playlists" ? (
      <Pressable style={[styles.addButton, { backgroundColor: colors.colorBrandBackground }]} onPress={handleManagePlaylists}>
        <MaterialCommunityIcons name="plus" size={FluentIconSize.regular} color="#FFFFFF" />
      </Pressable>
    ) : null
  );

  const renderSongItem = ({ item: song, songs }: { item: PlayableSong; songs: PlayableSong[] }) => {
    return (
      <SongCard
        song={song}
        onPress={() => handleSongPress(song, songs)}
        onContextMenu={handleSongContextMenu}
        isPlaying={currentSong?.id === song.id && isPlaying}
      />
    );
  };

  const renderEmptyState = (icon: keyof typeof MaterialCommunityIcons.glyphMap, message: string) => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name={icon} size={64} color={colors.colorNeutralForeground3} />
      <FluentText variant="body1" color="tertiary" style={styles.emptyText}>{message}</FluentText>
    </View>
  );

  const renderSongsList = (songs: PlayableSong[], emptyIcon: keyof typeof MaterialCommunityIcons.glyphMap, emptyMessage: string) => {
    if (songs.length === 0) {
      return renderEmptyState(emptyIcon, emptyMessage);
    }
    return (
      <FlatList
        key="songs-list"
        data={songs}
        renderItem={({ item }) => renderSongItem({ item, songs })}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 80 + FluentSpacing.m }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  const handleAlbumPress = useCallback((album: DerivedAlbum) => {
    navigation.navigate("AlbumDetail", { album });
  }, [navigation]);

  const renderAlbumItem = useCallback(({ item: album }: { item: DerivedAlbum }) => (
    <AlbumCard album={album} onPress={handleAlbumPress} />
  ), [handleAlbumPress]);

  const renderAlbumsList = () => {
    if (filteredData.albums.length === 0) {
      return renderEmptyState("album", "No albums found");
    }
    return (
      <FlatList
        key="albums-grid"
        data={filteredData.albums}
        numColumns={2}
        renderItem={renderAlbumItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.gridContent, { paddingBottom: tabBarHeight + 80 + FluentSpacing.m }]}
        columnWrapperStyle={styles.albumRow}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  const handleArtistPress = useCallback((artist: DerivedArtist) => {
    navigation.navigate("ArtistDetail", { artist });
  }, [navigation]);

  const renderArtistItem = useCallback(({ item: artist }: { item: DerivedArtist }) => (
    <ArtistCard artist={artist} onPress={handleArtistPress} />
  ), [handleArtistPress]);

  const renderArtistsList = () => {
    if (filteredData.artists.length === 0) {
      return renderEmptyState("account-group", "No artists found");
    }
    return (
      <FlatList
        key="artists-grid"
        data={filteredData.artists}
        numColumns={2}
        renderItem={renderArtistItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.gridContent, { paddingBottom: tabBarHeight + 80 + FluentSpacing.m }]}
        columnWrapperStyle={styles.artistRow}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  const renderPlaylistsList = () => {
    if (filteredData.playlists.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="playlist-music" size={64} color={colors.colorNeutralForeground3} />
          <FluentText variant="body1" color="tertiary" style={styles.emptyText}>No playlists yet</FluentText>
          <Pressable style={[styles.createButton, { backgroundColor: colors.colorBrandBackground }]} onPress={handleManagePlaylists}>
            <MaterialCommunityIcons name="plus" size={FluentIconSize.regular} color="#FFFFFF" />
            <FluentText variant="body2" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s }}>Create Playlist</FluentText>
          </Pressable>
        </View>
      );
    }
    return (
      <FlatList
        key="playlists-list"
        data={filteredData.playlists}
        renderItem={({ item: playlist }) => (
          <FluentListItem
            icon="playlist-music"
            title={playlist.name}
            subtitle={`${playlist.songIds.length} songs`}
            onPress={() => handlePlaylistPress(playlist)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 80 + FluentSpacing.m }]}
        ItemSeparatorComponent={() => <View style={{ height: FluentSpacing.s }} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  const handleRemoveArchiveFavorite = useCallback(async (trackId: string) => {
    await ArchiveOrgService.removeFromFavorites(trackId);
    loadArchiveFavorites();
    showSuccess("Removed from favorites");
  }, [loadArchiveFavorites, showSuccess]);

  const handlePlayArchiveTrack = useCallback((track: StoredArchiveTrack) => {
    const playableTrack = ArchiveOrgService.storedToPlayable(track);
    const playableSong: PlayableSong = {
      id: playableTrack.id,
      title: playableTrack.title,
      artist: playableTrack.artist,
      album: playableTrack.album || 'Online Music',
      duration: playableTrack.duration || 0,
      artwork: '',
      audioUrl: playableTrack.stream_url,
    };
    playSong(playableSong);
    navigation.dispatch(
      CommonActions.navigate({
        name: "ListenTab",
        params: {
          screen: "NowPlaying",
          params: { songId: playableSong.id },
        },
      })
    );
  }, [playSong, navigation]);

  const renderArchiveList = () => {
    return (
      <View style={[styles.listContent, { flex: 1 }]}>
        <Pressable
          style={[styles.archiveSearchButton, { backgroundColor: colors.colorBrandBackground }]}
          onPress={() => navigation.dispatch(CommonActions.navigate({ name: 'DiscoverTab' }))}
        >
          <MaterialCommunityIcons name="magnify" size={FluentIconSize.regular} color="#FFFFFF" />
          <FluentText variant="body2" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s }}>
            Search Online Music
          </FluentText>
        </Pressable>

        {archiveFavorites.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="web" size={64} color={colors.colorNeutralForeground3} />
            <FluentText variant="body1" color="tertiary" style={styles.emptyText}>
              No saved online music
            </FluentText>
            <FluentText variant="caption1" color="tertiary" style={styles.emptyText}>
              Search for free, legal music above
            </FluentText>
          </View>
        ) : (
          <FlatList
            data={archiveFavorites}
            renderItem={({ item }) => (
              <View style={[styles.archiveTrackItem, { backgroundColor: colors.colorNeutralBackground2 }]}>
                <Pressable
                  style={[styles.archivePlayButton, { backgroundColor: colors.colorBrandBackground }]}
                  onPress={() => handlePlayArchiveTrack(item)}
                >
                  <MaterialCommunityIcons name="play" size={20} color="#FFFFFF" />
                </Pressable>
                <View style={styles.archiveTrackInfo}>
                  <FluentText variant="body2" numberOfLines={1}>{item.title}</FluentText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="web" size={12} color={colors.colorNeutralForeground3} />
                    <FluentText variant="caption1" color="tertiary" numberOfLines={1}>
                      {item.artist} • {ArchiveOrgService.formatBitrate(item.bitrate)}
                    </FluentText>
                  </View>
                </View>
                <Pressable
                  style={styles.archiveRemoveButton}
                  onPress={() => handleRemoveArchiveFavorite(item.id)}
                >
                  <MaterialCommunityIcons name="close" size={20} color={colors.colorNeutralForeground3} />
                </Pressable>
              </View>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 80 + FluentSpacing.m }}
            ItemSeparatorComponent={() => <View style={{ height: FluentSpacing.s }} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (activeCategory === "songs" && isLoadingSongs) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
          <FluentText variant="body1" color="tertiary" style={{ marginTop: FluentSpacing.m }}>Loading your music...</FluentText>
          {typeof progress.total === 'number' && progress.total > 0 && (
            <FluentText variant="caption1" color="tertiary">{progress.loaded || 0} of {progress.total} songs</FluentText>
          )}
        </View>
      );
    }

    switch (activeCategory) {
      case "liked":
        return renderSongsList(filteredData.liked, "heart-outline", "No liked songs yet. Tap the heart icon on any song to add it here.");
      case "recent":
        return renderSongsList(filteredData.recent, "history", "No recently played songs. Start listening to see your history here.");
      case "top":
        return renderSongsList(filteredData.top, "chart-line", "No play history yet. Keep listening to see your most played songs here.");
      case "songs":
        return renderSongsList(filteredData.songs, "music-off", usingMockData ? "Using sample music. Grant media access to play your own music." : "No songs found.");
      case "albums":
        return renderAlbumsList();
      case "artists":
        return renderArtistsList();
      case "playlists":
        return renderPlaylistsList();
      case "streaming":
        return renderArchiveList();
      default:
        return null;
    }
  };

  const header = (
    <FluentTopBar
      title="Library"
      categoryOptions={categoryOptions}
      activeCategory={activeCategory}
      onCategoryChange={handleCategorySelect}
      showCategoryDropdown={showCategoryDropdown}
      onCategoryDropdownToggle={() => {
        setShowCategoryDropdown(!showCategoryDropdown);
        setShowSortOptions(false);
      }}
      showSearch
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={`Search ${categories.find(c => c.key === activeCategory)?.label || ''}...`}
      showSort
      sortBy={sortBy}
      onSortChange={handleSortPress}
      showSortOverlay={showSortOptions}
      onSortOverlayToggle={() => {
        setShowSortOptions(!showSortOptions);
        setShowCategoryDropdown(false);
      }}
      rightAction={renderPlaylistAddButton()}
    />
  );

  return (
    <FluentScreenLayout
      header={header}
      backgroundColor="neutral1"
      hasBottomNavigation={true}
      avoidKeyboard={true}
    >
      <View style={styles.contentArea}>
        {renderContent()}
      </View>

      <SongContextMenu
        visible={showContextMenu}
        song={contextMenuSong}
        onClose={handleContextMenuClose}
        onSuccess={handleContextMenuSuccess}
        onHideSong={hideSong}
        showHideOption={activeCategory === "songs"}
      />

    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: FluentSpacing.l,
    paddingTop: FluentSpacing.l,
  },
  gridContent: {
    padding: FluentSpacing.l,
    paddingTop: FluentSpacing.l,
  },
  albumRow: {
    gap: FluentSpacing.m,
    marginBottom: FluentSpacing.m,
  },
  albumCard: {
    flex: 1,
    padding: FluentSpacing.s,
  },
  albumArtwork: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: FluentRadius.medium,
    marginBottom: FluentSpacing.s,
  },
  albumName: {
    fontWeight: "600",
  },
  artistRow: {
    gap: FluentSpacing.m,
    marginBottom: FluentSpacing.m,
  },
  artistCard: {
    flex: 1,
    padding: FluentSpacing.s,
    alignItems: "center",
  },
  artistAvatarContainer: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: FluentSpacing.s,
  },
  artistAvatar: {
    width: "80%",
    aspectRatio: 1,
    borderRadius: FluentRadius.circular,
  },
  artistName: {
    fontWeight: "600",
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: FluentSpacing.l,
  },
  emptyText: {
    textAlign: "center",
    marginTop: FluentSpacing.m,
    marginBottom: FluentSpacing.l,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.circular,
  },
  addButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.fab,
    alignItems: "center",
    justifyContent: "center",
  },
  archiveSearchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    marginBottom: FluentSpacing.m,
  },
  archiveTrackItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    gap: FluentSpacing.m,
  },
  archivePlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  archiveTrackInfo: {
    flex: 1,
    gap: 2,
  },
  archiveRemoveButton: {
    padding: FluentSpacing.xs,
  },
});

export default memo(LibraryScreen);
