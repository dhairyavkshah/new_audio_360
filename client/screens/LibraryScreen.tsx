import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, Image, TextInput, Platform, ActivityIndicator, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { SongContextMenu } from "@/components/SongContextMenu";
import { SongCard } from "@/components/SongCard";
import { AnimatedCard } from "@/components/AnimatedCard";
import { usePlayer } from "@/hooks/usePlayer";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { Spacing, BorderRadius, Layout, Typography, M3Shape, M3Elevation } from "@/constants/theme";
import { mockSongs, mockAlbums, mockArtists, Song } from "@/lib/data";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";
import { Playlist, getPlaylists } from "@/lib/storage";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";

type NavigationProp = NativeStackNavigationProp<LibraryStackParamList>;

type CategoryType = "liked" | "recent" | "top" | "songs" | "albums" | "artists" | "playlists";

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
];

type SortOption = "title_asc" | "title_desc" | "artist_asc" | "duration_asc" | "duration_desc";

const SORT_OPTIONS: { key: SortOption; label: string; icon: string }[] = [
  { key: "title_asc", label: "A-Z", icon: "sort-alphabetical-ascending" },
  { key: "title_desc", label: "Z-A", icon: "sort-alphabetical-descending" },
  { key: "artist_asc", label: "Artist", icon: "account-music" },
  { key: "duration_asc", label: "Shortest", icon: "sort-clock-ascending" },
  { key: "duration_desc", label: "Longest", icon: "sort-clock-descending" },
];

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const { favorites, recentlyPlayed, mostPlayed, playSong, setQueue } = usePlayerContext();
  const { songs: deviceSongs, isLoading: isLoadingSongs, progress, usingMockData, hideSong } = useMediaLibraryContext();
  const { currentSong, isPlaying } = usePlayer();
  const [activeCategory, setActiveCategory] = useState<CategoryType>("songs");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("title_asc");
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [contextMenuSong, setContextMenuSong] = useState<PlayableSong | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const loadPlaylists = useCallback(async () => {
    const data = await getPlaylists();
    setPlaylists(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlaylists();
    }, [loadPlaylists])
  );

  const allSongs = useMemo(() => {
    return deviceSongs.length > 0 ? deviceSongs : mockSongs;
  }, [deviceSongs]);

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

    const filterAlbums = (albums: typeof mockAlbums) => {
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

    const filterArtists = (artists: typeof mockArtists) => {
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

    const likedSongs = allSongs.filter(song => favorites.includes(song.id));
    const recentSongs = recentlyPlayed
      .map(id => allSongs.find(s => s.id === id))
      .filter((s): s is PlayableSong => s !== undefined);
    const topSongs = mostPlayed
      .map(id => allSongs.find(s => s.id === id))
      .filter((s): s is PlayableSong => s !== undefined);

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
      albums: filterAlbums(mockAlbums),
      artists: filterArtists(mockArtists),
      playlists: filterPlaylists(playlists),
    };
  }, [searchQuery, sortBy, playlists, favorites, recentlyPlayed, mostPlayed, allSongs]);

  const categoryCounts = useMemo(() => ({
    liked: favorites.length,
    recent: recentlyPlayed.length,
    top: mostPlayed.length,
    songs: allSongs.length,
    albums: mockAlbums.length,
    artists: mockArtists.length,
    playlists: playlists.length,
  }), [favorites, recentlyPlayed, mostPlayed, allSongs, playlists]);

  const handleCategoryChange = (category: CategoryType) => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(category);
    setSearchQuery("");
    setShowSortOptions(false);
  };

  const handleManagePlaylists = () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("PlaylistManagement");
  };

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

  const handlePlaylistPress = (playlist: Playlist) => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("PlaylistDetail", { playlistId: playlist.id, playlistName: playlist.name });
  };

  const handleSortPress = (option: SortOption) => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortBy(option);
    setShowSortOptions(false);
  };

  const handleSongContextMenu = useCallback((song: PlayableSong) => {
    setContextMenuSong(song);
    setShowContextMenu(true);
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setShowContextMenu(false);
    setContextMenuSong(null);
  }, []);

  const handleContextMenuSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    loadPlaylists();
    setTimeout(() => setSuccessMessage(null), 3000);
  }, [loadPlaylists]);

  const activeConfig = categories.find(c => c.key === activeCategory) || categories[0];

  const handleCategorySelect = (key: CategoryType) => {
    handleCategoryChange(key);
    setShowCategoryDropdown(false);
  };

  const bottomPadding = Layout.bottomNavHeight + Layout.miniPlayerHeight + Layout.miniPlayerGapFromNav + Spacing.xl + insets.bottom;

  const renderCategoryDropdown = () => (
    <Pressable
      style={[styles.categoryDropdown, { backgroundColor: theme.surfaceContainerHigh, borderColor: theme.outlineVariant }]}
      onPress={() => {
        playTapSound();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowCategoryDropdown(!showCategoryDropdown);
      }}
    >
      <MaterialCommunityIcons name={activeConfig.icon} size={20} color={activeConfig.color} />
      <ThemedText type="body1" style={{ marginLeft: Spacing.s, flex: 1 }}>{activeConfig.label}</ThemedText>
      <ThemedText type="caption1" style={{ color: theme.onSurfaceVariant, marginRight: Spacing.s }}>{categoryCounts[activeCategory]}</ThemedText>
      <MaterialCommunityIcons name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={20} color={theme.onSurfaceVariant} />
    </Pressable>
  );

  const renderCategoryOverlay = () => (
    showCategoryDropdown ? (
      <>
        <Pressable style={styles.dropdownBackdrop} onPress={() => setShowCategoryDropdown(false)} />
        <View style={[styles.categoryOptionsOverlay, { backgroundColor: theme.surfaceContainerHigh, top: insets.top + Layout.topBarHeight + Spacing.xs }]}>
          {categories.map((category) => (
            <Pressable
              key={category.key}
              style={[styles.categoryOption, activeCategory === category.key && { backgroundColor: theme.primaryContainer }]}
              onPress={() => handleCategorySelect(category.key)}
            >
              <MaterialCommunityIcons name={category.icon} size={20} color={category.color} />
              <ThemedText type="body1" style={{ marginLeft: Spacing.m, flex: 1 }}>{category.label}</ThemedText>
              <ThemedText type="caption1" style={{ color: theme.onSurfaceVariant }}>{categoryCounts[category.key]}</ThemedText>
              {activeCategory === category.key ? <MaterialCommunityIcons name="check" size={16} color={theme.primary} style={{ marginLeft: Spacing.s }} /> : null}
            </Pressable>
          ))}
        </View>
      </>
    ) : null
  );

  const renderSearchBar = () => (
    <View style={[styles.searchRow, { backgroundColor: theme.surfaceContainer, borderBottomColor: theme.outlineVariant }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.surfaceContainerHigh }]}>
        <MaterialCommunityIcons name="magnify" size={18} color={theme.onSurfaceVariant} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.onSurface }]}
          placeholder={`Search ${categories.find(c => c.key === activeCategory)?.label || ''}...`}
          placeholderTextColor={theme.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close-circle" size={16} color={theme.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        style={[styles.sortButton, { backgroundColor: theme.surfaceContainerHigh }]}
        onPress={() => {
          playTapSound();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowSortOptions(!showSortOptions);
        }}
      >
        <MaterialCommunityIcons name={SORT_OPTIONS.find((o) => o.key === sortBy)?.icon as any || "sort"} size={16} color={theme.onSurface} />
        <MaterialCommunityIcons name={showSortOptions ? "chevron-up" : "chevron-down"} size={14} color={theme.onSurfaceVariant} style={{ marginLeft: 2 }} />
      </Pressable>
      {activeCategory === "playlists" ? (
        <Pressable style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={handleManagePlaylists}>
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
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
      <MaterialCommunityIcons name={icon} size={64} color={theme.onSurfaceVariant} />
      <ThemedText type="body1" style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>{message}</ThemedText>
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
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.m }} />}
      />
    );
  };

  const renderAlbumsList = () => {
    if (filteredData.albums.length === 0) {
      return renderEmptyState("album", "No albums found");
    }
    return (
      <FlatList
        key="albums-grid"
        data={filteredData.albums}
        numColumns={2}
        renderItem={({ item: album }) => (
          <AnimatedCard
            style={styles.albumCard}
            borderRadius={BorderRadius.medium}
            onPress={() => navigation.navigate("AlbumDetail", { album })}
            accessibilityLabel={`${album.name} by ${album.artist}`}
          >
            <Image source={{ uri: album.artwork }} style={styles.albumArtwork} />
            <ThemedText type="body1" numberOfLines={1} style={styles.albumName}>{album.name}</ThemedText>
            <ThemedText type="caption1" numberOfLines={1} style={{ color: theme.onSurfaceVariant }}>{album.artist}</ThemedText>
          </AnimatedCard>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.gridContent, { paddingBottom: bottomPadding }]}
        columnWrapperStyle={styles.albumRow}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
      />
    );
  };

  const renderArtistsList = () => {
    if (filteredData.artists.length === 0) {
      return renderEmptyState("account-group", "No artists found");
    }
    return (
      <FlatList
        key="artists-list"
        data={filteredData.artists}
        renderItem={({ item: artist }) => (
          <Pressable
            style={[styles.artistItem, { backgroundColor: theme.surfaceContainerLow }]}
            onPress={() => navigation.navigate("ArtistDetail" as any, { artist })}
          >
            <Image source={{ uri: artist.artwork }} style={styles.artistArtwork} />
            <View style={styles.artistInfo}>
              <ThemedText type="body1">{artist.name}</ThemedText>
              <ThemedText type="caption1" style={{ color: theme.onSurfaceVariant }}>{artist.songCount} songs</ThemedText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.onSurfaceVariant} />
          </Pressable>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.m }} />}
      />
    );
  };

  const renderPlaylistsList = () => {
    if (filteredData.playlists.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="playlist-music" size={64} color={theme.onSurfaceVariant} />
          <ThemedText type="body1" style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>No playlists yet</ThemedText>
          <Pressable style={[styles.createButton, { backgroundColor: theme.primary }]} onPress={handleManagePlaylists}>
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <ThemedText type="body1" style={{ color: "#FFFFFF", marginLeft: Spacing.s }}>Create Playlist</ThemedText>
          </Pressable>
        </View>
      );
    }
    return (
      <FlatList
        key="playlists-list"
        data={filteredData.playlists}
        renderItem={({ item: playlist }) => (
          <Pressable
            style={[styles.playlistItem, { backgroundColor: theme.surfaceContainerLow }]}
            onPress={() => handlePlaylistPress(playlist)}
          >
            <View style={[styles.playlistIcon, { backgroundColor: theme.primaryContainer }]}>
              <MaterialCommunityIcons name="playlist-music" size={24} color={theme.primary} />
            </View>
            <View style={styles.playlistInfo}>
              <ThemedText type="body1">{playlist.name}</ThemedText>
              <ThemedText type="caption1" style={{ color: theme.onSurfaceVariant }}>{playlist.songIds.length} songs</ThemedText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.onSurfaceVariant} />
          </Pressable>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.m }} />}
      />
    );
  };

  const renderContent = () => {
    if (activeCategory === "songs" && isLoadingSongs) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="body1" style={{ color: theme.onSurfaceVariant, marginTop: Spacing.m }}>Loading your music...</ThemedText>
          {typeof progress.total === 'number' && progress.total > 0 && (
            <ThemedText type="caption1" style={{ color: theme.onSurfaceVariant }}>{progress.loaded || 0} of {progress.total} songs</ThemedText>
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
      default:
        return null;
    }
  };

  const renderSortOverlay = () => (
    showSortOptions ? (
      <>
        <Pressable style={styles.sortOverlayBackdrop} onPress={() => setShowSortOptions(false)} />
        <View style={[styles.sortOptionsOverlay, { backgroundColor: theme.surfaceContainerHigh }]}>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={[styles.sortOption, sortBy === option.key && { backgroundColor: theme.primaryContainer }]}
              onPress={() => handleSortPress(option.key)}
            >
              <MaterialCommunityIcons name={option.icon as any} size={18} color={sortBy === option.key ? theme.primary : theme.onSurface} />
              <ThemedText type="body1" style={[{ marginLeft: Spacing.m }, sortBy === option.key && { color: theme.primary }]}>{option.label}</ThemedText>
              {sortBy === option.key ? <MaterialCommunityIcons name="check" size={16} color={theme.primary} style={{ marginLeft: "auto" }} /> : null}
            </Pressable>
          ))}
        </View>
      </>
    ) : null
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.headerRow, { paddingTop: insets.top + Spacing.m, backgroundColor: theme.surfaceContainer, borderBottomColor: theme.outlineVariant }]}>
        <ThemedText type="title4" style={styles.headerTitle}>Library</ThemedText>
        {renderCategoryDropdown()}
      </View>

      {renderSearchBar()}

      <View style={[styles.contentArea, { flex: 1 }]}>
        {renderContent()}
      </View>

      {renderSortOverlay()}
      {renderCategoryOverlay()}

      <SongContextMenu
        visible={showContextMenu}
        song={contextMenuSong}
        onClose={handleContextMenuClose}
        onSuccess={handleContextMenuSuccess}
        onHideSong={hideSong}
        showHideOption={activeCategory === "songs"}
      />

      {successMessage ? (
        <View style={[styles.successToast, { backgroundColor: theme.primary, bottom: bottomPadding - Spacing.xl + Spacing.l }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
          <ThemedText type="body1" style={{ color: "#FFFFFF", marginLeft: Spacing.s, flex: 1 }}>{successMessage}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.m,
    borderBottomWidth: 1,
    gap: Spacing.m,
  },
  headerTitle: {
    fontWeight: "600",
  },
  categoryDropdown: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    minHeight: 48,
  },
  dropdownBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  categoryOptionsOverlay: {
    position: "absolute",
    left: Spacing.l,
    right: Spacing.l,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.xs,
    zIndex: 101,
    ...M3Elevation.level2,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.medium,
    marginHorizontal: Spacing.xs,
    minHeight: 48,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.s,
    gap: Spacing.s,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.circular,
    paddingHorizontal: Spacing.m,
    height: 40,
  },
  searchIcon: {
    marginRight: Spacing.s,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body1.fontSize,
    height: "100%",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: BorderRadius.circular,
    height: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  contentArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.m,
  },
  gridContent: {
    padding: Spacing.l,
  },
  songListItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.m,
    borderRadius: BorderRadius.medium,
    gap: Spacing.m,
    minHeight: 48,
  },
  songListArtwork: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.small,
  },
  songListInfo: {
    flex: 1,
  },
  albumRow: {
    gap: Spacing.m,
    marginBottom: Spacing.m,
  },
  albumCard: {
    flex: 1,
    padding: Spacing.s,
  },
  albumArtwork: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.small,
    marginBottom: Spacing.s,
  },
  albumName: {
    fontWeight: "600",
  },
  artistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.m,
    borderRadius: BorderRadius.medium,
    gap: Spacing.m,
    minHeight: 48,
  },
  artistArtwork: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  artistInfo: {
    flex: 1,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.m,
    borderRadius: BorderRadius.medium,
    gap: Spacing.m,
    minHeight: 48,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.small,
    alignItems: "center",
    justifyContent: "center",
  },
  playlistInfo: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.l,
  },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.m,
    marginBottom: Spacing.l,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.circular,
    minHeight: 48,
  },
  sortOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
  },
  sortOptionsOverlay: {
    position: "absolute",
    top: 200,
    right: Spacing.l,
    zIndex: 20,
    borderRadius: BorderRadius.medium,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: M3Elevation.level3.elevation,
      },
      default: {},
    }),
    minWidth: 160,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    minHeight: 48,
  },
  successToast: {
    position: "absolute",
    left: Spacing.l,
    right: Spacing.l,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.medium,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: M3Elevation.level2.elevation,
      },
      default: {},
    }),
  },
});
