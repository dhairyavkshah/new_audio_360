import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, Image, Platform, ActivityIndicator, FlatList } from "react-native";
import { useNavigation, useFocusEffect, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentText, FluentScreenLayout } from "@/components/fluent";
import { FluentTopBar, SortOption, CategoryOption } from "@/components/FluentTopBar";
import { SongContextMenu } from "@/components/SongContextMenu";
import { SongCard } from "@/components/SongCard";
import { AnimatedCard } from "@/components/AnimatedCard";
import { usePlayer } from "@/hooks/usePlayer";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { mockSongs, mockAlbums, mockArtists, Song } from "@/lib/data";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";
import { Playlist, getPlaylists } from "@/lib/storage";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";

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


export default function LibraryScreen() {
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setShowCategoryDropdown(false);
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
        <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
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
            borderRadius={FluentRadius.large}
            onPress={() => navigation.navigate("AlbumDetail", { album })}
            accessibilityLabel={`${album.name} by ${album.artist}`}
          >
            <Image source={{ uri: album.artwork }} style={styles.albumArtwork} />
            <FluentText variant="body1" numberOfLines={1} style={styles.albumName}>{album.name}</FluentText>
            <FluentText variant="caption1" color="tertiary" numberOfLines={1}>{album.artist}</FluentText>
          </AnimatedCard>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.gridContent, { paddingBottom: tabBarHeight + 80 + FluentSpacing.m }]}
        columnWrapperStyle={styles.albumRow}
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
            style={[styles.artistItem, { backgroundColor: colors.colorNeutralBackground2 }]}
            onPress={() => navigation.navigate("ArtistDetail" as any, { artist })}
          >
            <Image source={{ uri: artist.artwork }} style={styles.artistArtwork} />
            <View style={styles.artistInfo}>
              <FluentText variant="body1">{artist.name}</FluentText>
              <FluentText variant="caption1" color="tertiary">{artist.songCount} songs</FluentText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.colorNeutralForeground3} />
          </Pressable>
        )}
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

  const renderPlaylistsList = () => {
    if (filteredData.playlists.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="playlist-music" size={64} color={colors.colorNeutralForeground3} />
          <FluentText variant="body1" color="tertiary" style={styles.emptyText}>No playlists yet</FluentText>
          <Pressable style={[styles.createButton, { backgroundColor: colors.colorBrandBackground }]} onPress={handleManagePlaylists}>
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
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
          <Pressable
            style={[styles.playlistItem, { backgroundColor: colors.colorNeutralBackground2 }]}
            onPress={() => handlePlaylistPress(playlist)}
          >
            <View style={[styles.playlistIcon, { backgroundColor: colors.colorNeutralBackground3 }]}>
              <MaterialCommunityIcons name="playlist-music" size={24} color={colors.colorBrandForeground1} />
            </View>
            <View style={styles.playlistInfo}>
              <FluentText variant="body1">{playlist.name}</FluentText>
              <FluentText variant="caption1" color="tertiary">{playlist.songIds.length} songs</FluentText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.colorNeutralForeground3} />
          </Pressable>
        )}
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

      {successMessage ? (
        <View style={[styles.successToast, { backgroundColor: colors.colorBrandBackground, bottom: tabBarHeight + FluentSpacing.l }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
          <FluentText variant="body2" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s, flex: 1 }}>{successMessage}</FluentText>
        </View>
      ) : null}
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
  artistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.large,
    gap: FluentSpacing.m,
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
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.large,
    gap: FluentSpacing.m,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.medium,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  successToast: {
    position: "absolute",
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.large,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
});
