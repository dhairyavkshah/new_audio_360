import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { useMediaLibraryContext, DeviceSong } from "@/contexts/MediaLibraryContext";
import { Fluent2 } from "@/constants/fluent2";
import { FluentText, FluentSearchBar, FluentChip, FluentButton } from "@/components/fluent2";
import { SongContextMenu } from "@/components/SongContextMenu";
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
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { colors, spacing, radius } = useFluent2Theme();
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

  const HEADER_HEIGHT = insets.top + 56;
  const STICKY_HEADER_HEIGHT = 100;

  const renderSongGrid = (songs: PlayableSong[], emptyMessage: string, emptyIcon: keyof typeof MaterialCommunityIcons.glyphMap) => {
    if (songs.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name={emptyIcon} size={64} color={colors.textSecondary} />
          <FluentText variant="body1" style={[styles.emptyText, { color: colors.textSecondary }]}>
            {emptyMessage}
          </FluentText>
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
              style={[styles.songItem, { backgroundColor: colors.surfacePrimary, borderRadius: radius.medium }]}
              onPress={() => handleSongPress(song, songs)}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                playTapSound();
                handleSongContextMenu(song);
              }}
              delayLongPress={400}
              {...webContextProps}
            >
              <Image source={{ uri: song.artwork }} style={[styles.songArtwork, { borderRadius: radius.small }]} />
              <FluentText variant="caption1" numberOfLines={1} style={styles.songTitle}>
                {song.title}
              </FluentText>
              <FluentText variant="caption2" numberOfLines={1} style={{ color: colors.textSecondary }}>
                {song.artist}
              </FluentText>
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
              <ActivityIndicator size="large" color={colors.brandPrimary} />
              <FluentText variant="body1" style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading your music...
              </FluentText>
              {typeof progress.total === 'number' && progress.total > 0 && (
                <FluentText variant="caption1" style={{ color: colors.textSecondary }}>
                  {progress.loaded || 0} of {progress.total} songs found
                </FluentText>
              )}
            </View>
          );
        }
        if (mediaError) {
          return (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textSecondary} />
              <FluentText variant="body1" style={[styles.emptyText, { color: colors.textSecondary }]}>
                {mediaError}
              </FluentText>
              <FluentButton variant="primary" onPress={refreshSongs} style={{ marginTop: spacing.m }}>
                Try Again
              </FluentButton>
            </View>
          );
        }
        return renderSongGrid(filteredData.songs, usingMockData ? "Using sample music. Grant media access to play your own music." : "No songs found.", "music-off");
      case "albums":
        return (
          <View style={styles.albumsGrid}>
            {filteredData.albums.map((album) => (
              <Pressable
                key={album.id}
                style={styles.albumItem}
                onPress={() => {
                  playTapSound();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Image source={{ uri: album.artwork }} style={[styles.albumArtwork, { borderRadius: radius.medium }]} />
                <FluentText variant="caption1" numberOfLines={1} style={styles.albumName}>
                  {album.name}
                </FluentText>
                <FluentText variant="caption2" numberOfLines={1} style={{ color: colors.textSecondary }}>
                  {album.artist}
                </FluentText>
              </Pressable>
            ))}
          </View>
        );
      case "artists":
        return (
          <View style={styles.artistsList}>
            {filteredData.artists.map((artist) => (
              <Pressable
                key={artist.id}
                style={[styles.artistItem, { backgroundColor: colors.surfacePrimary, borderRadius: radius.medium }]}
                onPress={() => {
                  playTapSound();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Image source={{ uri: artist.artwork }} style={styles.artistArtwork} />
                <View style={styles.artistInfo}>
                  <FluentText variant="body1" style={{ fontWeight: "600" }}>
                    {artist.name}
                  </FluentText>
                  <FluentText variant="caption1" style={{ color: colors.textSecondary }}>
                    {artist.songCount} songs
                  </FluentText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        );
      case "playlists":
        if (filteredData.playlists.length === 0 && playlists.length === 0) {
          return (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="playlist-music" size={48} color={colors.textSecondary} />
              <FluentText variant="subtitle1" style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                No Playlists Yet
              </FluentText>
              <FluentText variant="caption1" style={{ color: colors.textSecondary, textAlign: "center" }}>
                Create your first playlist to organize your favorite songs
              </FluentText>
              <FluentButton variant="primary" onPress={handleManagePlaylists} style={{ marginTop: spacing.m }}>
                Create Playlist
              </FluentButton>
            </View>
          );
        }
        return (
          <View style={styles.playlistsGrid}>
            {filteredData.playlists.map((playlist) => (
              <Pressable
                key={playlist.id}
                style={[styles.playlistItem, { backgroundColor: colors.surfacePrimary, borderRadius: radius.medium }]}
                onPress={() => handlePlaylistPress(playlist)}
              >
                <View style={[styles.playlistCover, { backgroundColor: colors.brandPrimary + "20", borderRadius: radius.medium }]}>
                  <MaterialCommunityIcons name="playlist-music" size={28} color={colors.brandPrimary} />
                </View>
                <FluentText variant="caption1" numberOfLines={1} style={styles.playlistName}>
                  {playlist.name}
                </FluentText>
                <FluentText variant="caption2" numberOfLines={1} style={{ color: colors.textSecondary }}>
                  {playlist.songIds.length} songs
                </FluentText>
              </Pressable>
            ))}
          </View>
        );
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.headerContent, { paddingHorizontal: spacing.m }]}>
        <FluentText variant="title1">Library</FluentText>
      </View>
    </View>
  );

  const renderStickyHeader = () => (
    <View style={[styles.stickyHeader, { backgroundColor: colors.background, top: HEADER_HEIGHT, paddingHorizontal: spacing.m }]}>
      <View style={styles.searchSortRow}>
        <View style={{ flex: 1 }}>
          <FluentSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
          />
        </View>
        <Pressable
          style={[styles.sortButton, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.medium }]}
          onPress={() => {
            playTapSound();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSortOptions(!showSortOptions);
          }}
        >
          <MaterialCommunityIcons
            name={SORT_OPTIONS.find((o) => o.key === sortBy)?.icon as any || "sort"}
            size={16}
            color={colors.textPrimary}
          />
          <MaterialCommunityIcons
            name={showSortOptions ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.textSecondary}
            style={{ marginLeft: 2 }}
          />
        </Pressable>
        <Pressable
          style={[styles.iconButton, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.medium }]}
          onPress={handleManagePlaylists}
        >
          <MaterialCommunityIcons name="playlist-edit" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesInHeader}
        contentContainerStyle={[styles.categoriesContent, { gap: spacing.xs }]}
      >
        {categories.map((category) => (
          <FluentChip
            key={category.key}
            label={category.label}
            selected={activeCategory === category.key}
            onPress={() => handleCategoryChange(category.key)}
            icon={
              <MaterialCommunityIcons
                name={category.icon}
                size={16}
                color={activeCategory === category.key ? colors.textOnAccent : colors.textPrimary}
              />
            }
          />
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
        <View style={[styles.sortOptionsOverlay, { backgroundColor: colors.surfacePrimary, top: HEADER_HEIGHT + 50, borderRadius: radius.medium }]}>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={[
                styles.sortOption,
                sortBy === option.key && { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={() => handleSortPress(option.key)}
            >
              <MaterialCommunityIcons
                name={option.icon as any}
                size={18}
                color={sortBy === option.key ? colors.brandPrimary : colors.textPrimary}
              />
              <FluentText
                variant="caption1"
                style={[
                  { marginLeft: spacing.s },
                  sortBy === option.key && { color: colors.brandPrimary, fontWeight: "600" },
                ]}
              >
                {option.label}
              </FluentText>
              {sortBy === option.key && (
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color={colors.brandPrimary}
                  style={{ marginLeft: "auto" }}
                />
              )}
            </Pressable>
          ))}
        </View>
      </>
    ) : null
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderStickyHeader()}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { 
            paddingTop: HEADER_HEIGHT + STICKY_HEADER_HEIGHT + spacing.s, 
            paddingBottom: tabBarHeight + spacing.xl,
            paddingHorizontal: spacing.m,
          },
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

      {successMessage && (
        <View style={[styles.successToast, { backgroundColor: colors.statusSuccess, borderRadius: radius.medium }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
          <FluentText variant="caption1" style={{ color: "#FFFFFF", marginLeft: spacing.s, flex: 1 }}>
            {successMessage}
          </FluentText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
  },
  headerContent: {
    height: 56,
    justifyContent: "center",
  },
  content: {},
  stickyHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Fluent2.spacing.xxs,
    paddingBottom: Fluent2.spacing.s,
  },
  searchSortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Fluent2.spacing.s,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Fluent2.spacing.s,
    paddingVertical: Fluent2.spacing.xxs,
    minHeight: 40,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
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
    right: Fluent2.spacing.m,
    zIndex: 20,
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
    paddingHorizontal: Fluent2.spacing.m,
    paddingVertical: Fluent2.spacing.s,
  },
  categoriesInHeader: {
    marginTop: Fluent2.spacing.s,
  },
  categoriesContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Fluent2.spacing.s,
  },
  songItem: {
    width: "31%",
    padding: Fluent2.spacing.xs,
  },
  songArtwork: {
    width: "100%",
    aspectRatio: 1,
    marginBottom: Fluent2.spacing.xs,
  },
  songTitle: {
    fontWeight: "500",
  },
  albumsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Fluent2.spacing.s,
  },
  albumItem: {
    width: "31%",
  },
  albumArtwork: {
    width: "100%",
    aspectRatio: 1,
    marginBottom: Fluent2.spacing.xs,
  },
  albumName: {
    fontWeight: "500",
  },
  artistsList: {
    gap: Fluent2.spacing.xs,
  },
  artistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Fluent2.spacing.s,
  },
  artistArtwork: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  artistInfo: {
    flex: 1,
    marginLeft: Fluent2.spacing.m,
  },
  playlistsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Fluent2.spacing.s,
  },
  playlistItem: {
    width: "31%",
    padding: Fluent2.spacing.s,
    alignItems: "center",
  },
  playlistCover: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Fluent2.spacing.xs,
  },
  playlistName: {
    fontWeight: "500",
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Fluent2.spacing.xxxl,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Fluent2.spacing.xxxl,
  },
  emptyTitle: {
    marginTop: Fluent2.spacing.m,
    marginBottom: Fluent2.spacing.xs,
    fontWeight: "600",
  },
  emptyText: {
    marginTop: Fluent2.spacing.m,
    textAlign: "center",
    paddingHorizontal: Fluent2.spacing.xl,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Fluent2.spacing.xxxl,
  },
  loadingText: {
    marginTop: Fluent2.spacing.m,
  },
  successToast: {
    position: "absolute",
    bottom: 100,
    left: Fluent2.spacing.m,
    right: Fluent2.spacing.m,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Fluent2.spacing.m,
    paddingVertical: Fluent2.spacing.m,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
