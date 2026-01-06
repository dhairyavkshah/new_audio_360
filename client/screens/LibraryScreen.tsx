import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, TextInput, Platform, ActivityIndicator } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SongContextMenu } from "@/components/SongContextMenu";
import { AnimatedCard } from "@/components/AnimatedCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { useMediaLibraryContext, DeviceSong } from "@/contexts/MediaLibraryContext";
import { Spacing, BorderRadius, Layout, Typography, Fluent2Tokens } from "@/constants/theme";
import { mockSongs, mockAlbums, mockArtists, Song } from "@/lib/data";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";
import { Playlist, getPlaylists } from "@/lib/storage";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";

type NavigationProp = NativeStackNavigationProp<LibraryStackParamList>;

type CategoryType = "liked" | "recent" | "top" | "songs" | "albums" | "artists" | "playlists";

const categories: { key: CategoryType; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { key: "liked", label: "Liked Songs", icon: "heart" },
  { key: "recent", label: "Recently Played", icon: "history" },
  { key: "top", label: "Most Played", icon: "chart-line" },
  { key: "songs", label: "All Songs", icon: "music" },
  { key: "albums", label: "Albums", icon: "album" },
  { key: "artists", label: "Artists", icon: "account-group" },
  { key: "playlists", label: "Playlists", icon: "playlist-music" },
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
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const { favorites, recentlyPlayed, mostPlayed, playSong, setQueue } = usePlayerContext();
  const { songs: deviceSongs, isLoading: isLoadingSongs, progress, usingMockData, hideSong, refreshSongs, error: mediaError, hasPermission } = useMediaLibraryContext();
  const [activeCategory, setActiveCategory] = useState<CategoryType>("liked");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("title_asc");
  const [showSortOptions, setShowSortOptions] = useState(false);
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
    
    const allSongs = deviceSongs.length > 0 ? deviceSongs : mockSongs;

    const filterAlbums = (albums: typeof mockAlbums) => {
      let result = [...albums];
      if (query) {
        result = result.filter(
          (album) =>
            album.name.toLowerCase().includes(query) ||
            album.artist.toLowerCase().includes(query)
        );
      }
      result.sort((a, b) => {
        switch (sortBy) {
          case "title_asc": return a.name.localeCompare(b.name);
          case "title_desc": return b.name.localeCompare(a.name);
          case "artist_asc": return a.artist.localeCompare(b.artist);
          default: return a.name.localeCompare(b.name);
        }
      });
      return result;
    };

    const filterArtists = (artists: typeof mockArtists) => {
      let result = [...artists];
      if (query) {
        result = result.filter((artist) => artist.name.toLowerCase().includes(query));
      }
      result.sort((a, b) => {
        switch (sortBy) {
          case "title_asc": return a.name.localeCompare(b.name);
          case "title_desc": return b.name.localeCompare(a.name);
          default: return a.name.localeCompare(b.name);
        }
      });
      return result;
    };

    const filterPlaylists = (pls: Playlist[]) => {
      let result = [...pls];
      if (query) {
        result = result.filter((pl) => pl.name.toLowerCase().includes(query));
      }
      result.sort((a, b) => {
        switch (sortBy) {
          case "title_asc": return a.name.localeCompare(b.name);
          case "title_desc": return b.name.localeCompare(a.name);
          default: return a.name.localeCompare(b.name);
        }
      });
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
        return song.title.toLowerCase().includes(query) ||
          song.artist.toLowerCase().includes(query);
      }),
      top: topSongs.filter(song => {
        if (!query) return true;
        return song.title.toLowerCase().includes(query) ||
          song.artist.toLowerCase().includes(query);
      }),
      songs: filterSongs(allSongs),
      albums: filterAlbums(mockAlbums),
      artists: filterArtists(mockArtists),
      playlists: filterPlaylists(playlists),
    };
  }, [searchQuery, sortBy, playlists, favorites, recentlyPlayed, mostPlayed, deviceSongs]);

  const handleCategoryChange = (category: CategoryType) => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(category);
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
    navigation.navigate("NowPlaying" as any, { songId: song.id });
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

  const getItemCount = () => {
    switch (activeCategory) {
      case "liked": return filteredData.liked.length;
      case "recent": return filteredData.recent.length;
      case "top": return filteredData.top.length;
      case "songs": return filteredData.songs.length;
      case "albums": return filteredData.albums.length;
      case "artists": return filteredData.artists.length;
      case "playlists": return filteredData.playlists.length;
      default: return 0;
    }
  };

  const renderSongGrid = (songs: PlayableSong[], emptyMessage: string, emptyIcon: keyof typeof MaterialCommunityIcons.glyphMap) => {
    if (songs.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name={emptyIcon} size={64} color={theme.textSecondary} />
          <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
            {emptyMessage}
          </ThemedText>
        </View>
      );
    }
    return (
      <View style={styles.gridContainer}>
        {songs.map((song) => {
          const webContextProps = Platform.OS === "web" ? {
            onContextMenu: (e: any) => {
              e.preventDefault?.();
              e.stopPropagation?.();
              handleSongContextMenu(song);
            }
          } : {};
          return (
            <Pressable
              key={song.id}
              style={[styles.songItem, { backgroundColor: theme.backgroundDefault }]}
              onPress={() => handleSongPress(song, songs)}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                playTapSound();
                handleSongContextMenu(song);
              }}
              delayLongPress={400}
              {...webContextProps}
            >
              <Image source={{ uri: song.artwork }} style={styles.songArtwork} />
              <ThemedText type="small" numberOfLines={1} style={styles.songTitle}>
                {song.title}
              </ThemedText>
              <ThemedText type="caption" numberOfLines={1} style={{ color: theme.textSecondary }}>
                {song.artist}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderContent = () => {
    switch (activeCategory) {
      case "liked":
        return renderSongGrid(filteredData.liked, "No liked songs yet. Tap the heart icon on any song to add it here.", "heart-outline");
      case "recent":
        return renderSongGrid(filteredData.recent, "No recently played songs. Start listening to see your history here.", "history");
      case "top":
        return renderSongGrid(filteredData.top, "No play history yet. Keep listening to see your most played songs here.", "chart-line");
      case "songs":
        if (isLoadingSongs) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText type="body" style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading your music...
              </ThemedText>
              {typeof progress.total === 'number' && progress.total > 0 && (
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {progress.loaded || 0} of {progress.total} songs found
                </ThemedText>
              )}
            </View>
          );
        }
        if (mediaError) {
          return (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.textSecondary} />
              <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
                {mediaError}
              </ThemedText>
              <Pressable
                style={[styles.refreshButton, { backgroundColor: theme.primary }]}
                onPress={refreshSongs}
              >
                <ThemedText type="body" style={{ color: '#FFFFFF' }}>Try Again</ThemedText>
              </Pressable>
            </View>
          );
        }
        return renderSongGrid(filteredData.songs, usingMockData ? "Using sample music. Grant media access to play your own music." : "No songs found.", "music-off");
      case "albums":
        return (
          <View style={styles.albumsGrid}>
            {filteredData.albums.map((album) => (
              <AnimatedCard
                key={album.id}
                style={styles.albumItem}
                borderRadius={BorderRadius.lg}
                onPress={() => {
                  navigation.navigate("AlbumDetail", { album });
                }}
                accessibilityLabel={`${album.name} by ${album.artist}`}
              >
                <Image source={{ uri: album.artwork }} style={styles.albumArtwork} />
                <ThemedText type="small" numberOfLines={1} style={styles.albumName}>
                  {album.name}
                </ThemedText>
                <ThemedText type="caption" numberOfLines={1} style={{ color: theme.textSecondary }}>
                  {album.artist}
                </ThemedText>
              </AnimatedCard>
            ))}
          </View>
        );
      case "artists":
        return (
          <View style={styles.artistsList}>
            {filteredData.artists.map((artist) => (
              <AnimatedCard
                key={artist.id}
                style={styles.artistItem}
                borderRadius={BorderRadius.lg}
                onPress={() => {
                  navigation.navigate("ArtistDetail", { artist });
                }}
                accessibilityLabel={`${artist.name}, ${artist.songCount} songs`}
              >
                <Image source={{ uri: artist.artwork }} style={styles.artistArtwork} />
                <View style={styles.artistInfo}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {artist.name}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {artist.songCount} songs
                  </ThemedText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
              </AnimatedCard>
            ))}
          </View>
        );
      case "playlists":
        if (filteredData.playlists.length === 0 && playlists.length === 0) {
          return (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="playlist-music" size={48} color={theme.textSecondary} />
              <ThemedText type="body" style={[styles.emptyTitle, { color: theme.textSecondary }]}>
                No Playlists Yet
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                Create your first playlist to organize your favorite songs
              </ThemedText>
              <Pressable
                style={[styles.createButton, { backgroundColor: theme.primary }]}
                onPress={handleManagePlaylists}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Create Playlist
                </ThemedText>
              </Pressable>
            </View>
          );
        }
        return (
          <View style={styles.playlistsGrid}>
            {filteredData.playlists.map((playlist) => (
              <AnimatedCard
                key={playlist.id}
                style={styles.playlistItem}
                borderRadius={BorderRadius.lg}
                onPress={() => handlePlaylistPress(playlist)}
                accessibilityLabel={`${playlist.name}, ${playlist.songIds.length} songs`}
              >
                <View style={[styles.playlistCover, { backgroundColor: theme.primary + "20" }]}>
                  <MaterialCommunityIcons name="playlist-music" size={28} color={theme.primary} />
                </View>
                <ThemedText type="small" numberOfLines={1} style={styles.playlistName}>
                  {playlist.name}
                </ThemedText>
                <ThemedText type="caption" numberOfLines={1} style={{ color: theme.textSecondary }}>
                  {playlist.songIds.length} songs
                </ThemedText>
              </AnimatedCard>
            ))}
          </View>
        );
    }
  };

  const STICKY_HEADER_HEIGHT = 96;

  const renderStickyHeader = () => (
    <View style={[styles.stickyHeader, { backgroundColor: theme.backgroundDefault, top: headerHeight }]}>
      <View style={styles.searchSortRow}>
        <View style={[styles.searchContainer, { backgroundColor: theme.surfaceVariant }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={theme.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => {
                playTapSound();
                setSearchQuery("");
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="close-circle" size={16} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={[styles.sortButton, { backgroundColor: theme.surfaceVariant }]}
          onPress={() => {
            playTapSound();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSortOptions(!showSortOptions);
          }}
        >
          <MaterialCommunityIcons
            name={SORT_OPTIONS.find((o) => o.key === sortBy)?.icon as any || "sort"}
            size={16}
            color={theme.text}
          />
          <MaterialCommunityIcons
            name={showSortOptions ? "chevron-up" : "chevron-down"}
            size={14}
            color={theme.textSecondary}
            style={{ marginLeft: 2 }}
          />
        </Pressable>
        <Pressable
          style={[styles.iconButton, { backgroundColor: theme.surfaceVariant }]}
          onPress={handleManagePlaylists}
        >
          <MaterialCommunityIcons name="playlist-edit" size={18} color={theme.text} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesInHeader}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <Pressable
            key={category.key}
            onPress={() => handleCategoryChange(category.key)}
            style={[
              styles.categoryChip,
              {
                backgroundColor:
                  activeCategory === category.key ? theme.primary : theme.backgroundSecondary,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={category.icon}
              size={16}
              color={activeCategory === category.key ? "#FFFFFF" : theme.text}
            />
            <ThemedText
              type="small"
              style={{
                color: activeCategory === category.key ? "#FFFFFF" : theme.text,
                marginLeft: Spacing.xs,
                fontWeight: "500",
              }}
            >
              {category.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderSortOverlay = () => (
    showSortOptions ? (
      <>
        <Pressable 
          style={styles.sortOverlayBackdrop} 
          onPress={() => setShowSortOptions(false)} 
        />
        <View style={[styles.sortOptionsOverlay, { backgroundColor: theme.surface, top: headerHeight + 50 }]}>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={[
                styles.sortOption,
                sortBy === option.key && { backgroundColor: theme.surfaceVariant },
              ]}
              onPress={() => handleSortPress(option.key)}
            >
              <MaterialCommunityIcons
                name={option.icon as any}
                size={18}
                color={sortBy === option.key ? theme.primary : theme.text}
              />
              <ThemedText
                type="small"
                style={[
                  { marginLeft: Spacing.m },
                  sortBy === option.key && { color: theme.primary, fontWeight: "600" },
                ]}
              >
                {option.label}
              </ThemedText>
              {sortBy === option.key ? (
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color={theme.primary}
                  style={{ marginLeft: "auto" }}
                />
              ) : null}
            </Pressable>
          ))}
        </View>
      </>
    ) : null
  );

  return (
    <ThemedView style={styles.container}>
      {renderStickyHeader()}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + STICKY_HEADER_HEIGHT + Spacing.sm, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>{renderContent()}</View>
      </ScrollView>
      {renderSortOverlay()}
      
      <SongContextMenu
        visible={showContextMenu}
        song={contextMenuSong}
        onClose={handleContextMenuClose}
        onSuccess={handleContextMenuSuccess}
        onHideSong={hideSong}
        showHideOption={activeCategory === "songs"}
      />

      {successMessage ? (
        <View style={[styles.successToast, { backgroundColor: theme.success }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
          <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: Spacing.sm, flex: 1 }}>
            {successMessage}
          </ThemedText>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  stickyHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Layout.horizontalPadding,
    paddingTop: Spacing.m,
    paddingBottom: Spacing.m,
  },
  searchSortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.contentBlock,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.m,
    height: Layout.inputFieldHeight,
  },
  searchIcon: {
    marginRight: Spacing.iconGap,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    height: "100%",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: BorderRadius.button,
    height: Layout.buttonStandard,
  },
  iconButton: {
    width: Layout.touchTargetMin,
    height: Layout.touchTargetMin,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.button,
  },
  sortOverlayBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
  },
  sortOptionsOverlay: {
    position: "absolute",
    right: Layout.horizontalPadding,
    zIndex: 20,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    minWidth: 150,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  categoriesInHeader: {
    marginTop: Spacing.contentBlock,
  },
  categoriesContent: {
    gap: Spacing.iconGap,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.s,
    borderRadius: BorderRadius.full,
    height: Layout.buttonSmall,
  },
  contentContainer: {
    minHeight: 300,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  songItem: {
    width: "31%",
    padding: Spacing.size3,
    borderRadius: BorderRadius.lg,
  },
  songArtwork: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.size2,
  },
  songTitle: {
    fontWeight: "500",
    marginBottom: 2,
  },
  albumsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.lg,
  },
  albumItem: {
    width: "47%",
    padding: Spacing.size3,
    borderRadius: BorderRadius.lg,
  },
  albumArtwork: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.size2,
  },
  albumName: {
    fontWeight: "600",
    marginBottom: 2,
  },
  artistsList: {
    gap: Spacing.md,
  },
  artistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.size4,
    borderRadius: BorderRadius.lg,
    overflow: "visible",
  },
  artistArtwork: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  artistInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.md,
  },
  loadingText: {
    marginTop: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  refreshButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  playlistsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  playlistItem: {
    width: "47%",
    padding: Spacing.size3,
    borderRadius: BorderRadius.lg,
  },
  playlistCover: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.size2,
  },
  playlistName: {
    fontWeight: "600",
    marginBottom: 2,
  },
  successToast: {
    position: "absolute",
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
