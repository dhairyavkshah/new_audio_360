import React, { useState, useCallback, useMemo, memo } from "react";
import { View, StyleSheet, Pressable, Image, Platform, ActivityIndicator, FlatList, TextInput, ScrollView } from "react-native";
import { useNavigation, useFocusEffect, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluentText } from "@/components/fluent";
import { SortOption, SORT_OPTIONS } from "@/components/FluentTopBar";
import { SongContextMenu } from "@/components/SongContextMenu";
import { SongCard } from "@/components/SongCard";
import { usePlayer } from "@/hooks/usePlayer";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { useMediaLibraryContext, DeviceSong } from "@/contexts/MediaLibraryContext";
import { 
  FluentSpacing, 
  FluentRadius, 
  FluentLightColors, 
  FluentDarkColors, 
  FluentTouchTarget, 
  FluentIconSize, 
  FluentLayoutSize,
  FluentTypography,
  getShadowStyle 
} from "@/constants/fluent2";
import { Song } from "@/lib/data";
import { Album } from "@/navigation/LibraryStackNavigator";

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

type CategoryType = "songs" | "albums" | "artists" | "playlists";

interface CategoryConfig {
  key: CategoryType;
  label: string;
}

const categories: CategoryConfig[] = [
  { key: "songs", label: "Songs" },
  { key: "albums", label: "Albums" },
  { key: "artists", label: "Artists" },
  { key: "playlists", label: "Playlists" },
];

const CHIP_HEIGHT = FluentLayoutSize.chipHeight;
const CHIP_RADIUS = CHIP_HEIGHT / 2;
const CHIP_HORIZONTAL_PADDING = FluentSpacing.m;
const CHIP_GAP = FluentSpacing.s;
const SEARCH_BAR_HEIGHT = FluentLayoutSize.inputFieldHeight + 4;
const HORIZONTAL_MARGIN = FluentSpacing.xl;
const ALBUM_GRID_GAP = FluentSpacing.m;

interface AlbumCardProps {
  album: DerivedAlbum;
  onPress: (album: DerivedAlbum) => void;
}

const AlbumCard = memo(function AlbumCard({ album, onPress }: AlbumCardProps) {
  const imageSource = useMemo(() => ({ uri: album.artwork }), [album.artwork]);
  const handlePress = useCallback(() => onPress(album), [onPress, album]);
  
  return (
    <Pressable
      style={styles.albumCard}
      onPress={handlePress}
      accessibilityLabel={`${album.name} by ${album.artist}`}
    >
      <Image source={imageSource} style={styles.albumArtwork} />
      <FluentText variant="body2" numberOfLines={1} style={styles.albumName}>{album.name}</FluentText>
      <FluentText variant="caption1" color="tertiary" numberOfLines={1}>{album.artist}</FluentText>
    </Pressable>
  );
});

interface ArtistCardProps {
  artist: DerivedArtist;
  onPress: (artist: DerivedArtist) => void;
}

const ArtistCard = memo(function ArtistCard({ artist, onPress }: ArtistCardProps) {
  const imageSource = useMemo(() => ({ uri: artist.artwork }), [artist.artwork]);
  const handlePress = useCallback(() => onPress(artist), [onPress, artist]);
  
  return (
    <Pressable
      style={styles.artistCard}
      onPress={handlePress}
      accessibilityLabel={`${artist.name}, ${artist.songCount} songs`}
    >
      <View style={styles.artistAvatarContainer}>
        <Image source={imageSource} style={styles.artistAvatar} />
      </View>
      <FluentText variant="body2" numberOfLines={1} style={styles.artistName}>{artist.name}</FluentText>
      <FluentText variant="caption1" color="tertiary" numberOfLines={1}>{artist.songCount} {artist.songCount === 1 ? 'song' : 'songs'}</FluentText>
    </Pressable>
  );
});

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const FilterChip = memo(function FilterChip({ label, selected, onPress }: FilterChipProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  
  return (
    <Pressable
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? colors.colorBrandBackground : colors.colorNeutralBackground3,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <FluentText
        variant="body2"
        style={{
          color: selected ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground1,
        }}
      >
        {label}
      </FluentText>
    </Pressable>
  );
});

function LibraryScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { playTapSound } = useUiSound();
  const { playSong, setQueue } = usePlayerContext();
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

    return {
      songs: filterSongs(allSongs),
      albums: filterAlbums(derivedAlbums),
      artists: filterArtists(derivedArtists),
      playlists: filterPlaylists(playlists),
    };
  }, [searchQuery, sortBy, playlists, allSongs, derivedAlbums, derivedArtists]);

  const handleCategoryChange = useCallback((category: CategoryType) => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveCategory(category);
    setSearchQuery("");
    setShowSortOptions(false);
  }, [playTapSound]);

  const handleManagePlaylists = useCallback(() => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate("PlaylistManagement");
  }, [playTapSound, navigation]);

  const handleSongPress = useCallback((song: PlayableSong, songList: PlayableSong[]) => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate("PlaylistDetail", { playlistId: playlist.id, playlistName: playlist.name });
  }, [playTapSound, navigation]);

  const handleSortPress = useCallback((option: SortOption) => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSortBy(option);
    setShowSortOptions(false);
  }, [playTapSound]);

  const handleToggleSortOptions = useCallback(() => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowSortOptions(!showSortOptions);
  }, [playTapSound, showSortOptions]);

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

  const handleClearSearch = useCallback(() => {
    playTapSound();
    setSearchQuery("");
  }, [playTapSound]);

  const currentCount = useMemo(() => {
    switch (activeCategory) {
      case "songs": return filteredData.songs.length;
      case "albums": return filteredData.albums.length;
      case "artists": return filteredData.artists.length;
      case "playlists": return filteredData.playlists.length;
      default: return 0;
    }
  }, [activeCategory, filteredData]);

  const renderSongItem = useCallback(({ item: song, index }: { item: PlayableSong; index: number }) => {
    const songs = filteredData.songs;
    const isLastItem = index === songs.length - 1;
    return (
      <SongCard
        song={song}
        onPress={() => handleSongPress(song, songs)}
        onContextMenu={handleSongContextMenu}
        isPlaying={currentSong?.id === song.id && isPlaying}
        showDivider={!isLastItem}
      />
    );
  }, [filteredData.songs, handleSongPress, handleSongContextMenu, currentSong?.id, isPlaying]);

  const renderEmptyState = (icon: keyof typeof MaterialCommunityIcons.glyphMap, message: string) => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name={icon} size={64} color={colors.colorNeutralForeground3} />
      <FluentText variant="body1" color="tertiary" style={styles.emptyText}>{message}</FluentText>
    </View>
  );

  const renderSongsList = () => {
    const songs = filteredData.songs;
    if (songs.length === 0) {
      return renderEmptyState("music-off", usingMockData ? "Using sample music. Grant media access to play your own music." : "No songs found.");
    }
    return (
      <FlatList
        key="songs-list"
        data={songs}
        renderItem={renderSongItem}
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
        renderItem={({ item: playlist, index }) => (
          <Pressable
            style={styles.playlistItem}
            onPress={() => handlePlaylistPress(playlist)}
          >
            <View style={[styles.playlistIcon, { backgroundColor: colors.colorNeutralBackground3 }]}>
              <MaterialCommunityIcons name="playlist-music" size={24} color={colors.colorBrandForeground1} />
            </View>
            <View style={styles.playlistInfo}>
              <FluentText variant="body2">{playlist.name}</FluentText>
              <FluentText variant="caption1" color="tertiary">{playlist.songIds.length} songs</FluentText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.colorNeutralForeground3} />
            {index < filteredData.playlists.length - 1 && (
              <View 
                style={[
                  styles.playlistDivider, 
                  { backgroundColor: colors.colorNeutralStroke2 }
                ]} 
              />
            )}
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
      case "songs":
        return renderSongsList();
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

  const topPadding = insets.top + FluentSpacing.s;

  return (
    <View style={[styles.screen, { backgroundColor: colors.colorNeutralBackground1 }]}>
      <View style={[styles.headerContainer, { paddingTop: topPadding }]}>
        <View style={styles.titleRow}>
          <FluentText variant="title2" style={styles.title}>Library</FluentText>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.colorNeutralBackground3 }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={FluentIconSize.regular}
            color={colors.colorNeutralForeground3}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              FluentTypography.body2,
              { color: colors.colorNeutralForeground1 },
            ]}
            placeholder={`Search ${categories.find(c => c.key === activeCategory)?.label || ''}...`}
            placeholderTextColor={colors.colorNeutralForeground4}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={handleClearSearch}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Clear search"
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={FluentIconSize.regular}
                color={colors.colorNeutralForeground3}
              />
            </Pressable>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipContainer}
          style={styles.filterChipScroll}
        >
          {categories.map((category) => (
            <FilterChip
              key={category.key}
              label={category.label}
              selected={activeCategory === category.key}
              onPress={() => handleCategoryChange(category.key)}
            />
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <FluentText variant="caption1" color="tertiary">
            {currentCount} {activeCategory === "songs" ? (currentCount === 1 ? "song" : "songs") : 
              activeCategory === "albums" ? (currentCount === 1 ? "album" : "albums") :
              activeCategory === "artists" ? (currentCount === 1 ? "artist" : "artists") :
              (currentCount === 1 ? "playlist" : "playlists")}
          </FluentText>
          <View style={styles.sortActions}>
            {activeCategory === "playlists" && (
              <Pressable 
                style={[styles.addButton, { backgroundColor: colors.colorBrandBackground }]} 
                onPress={handleManagePlaylists}
              >
                <MaterialCommunityIcons name="plus" size={FluentIconSize.regular} color="#FFFFFF" />
              </Pressable>
            )}
            {activeCategory === "songs" && (
              <Pressable
                style={[styles.sortButton, { backgroundColor: colors.colorNeutralBackground3 }]}
                onPress={handleToggleSortOptions}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityLabel="Sort options"
              >
                <MaterialCommunityIcons
                  name={SORT_OPTIONS.find((o) => o.key === sortBy)?.icon || "sort"}
                  size={FluentIconSize.small}
                  color={colors.colorNeutralForeground1}
                />
                <MaterialCommunityIcons
                  name={showSortOptions ? "chevron-up" : "chevron-down"}
                  size={FluentIconSize.tiny}
                  color={colors.colorNeutralForeground3}
                  style={{ marginLeft: FluentSpacing.xxs }}
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {showSortOptions && (
        <>
          <Pressable
            style={styles.overlayBackdrop}
            onPress={handleToggleSortOptions}
          />
          <View
            style={[
              styles.sortOverlay,
              {
                backgroundColor: colors.colorNeutralBackground1,
                borderColor: colors.colorNeutralStroke2,
                top: topPadding + FluentLayoutSize.topBarHeight + SEARCH_BAR_HEIGHT + CHIP_HEIGHT + FluentLayoutSize.secondaryBarHeight + FluentSpacing.m * 3,
              },
            ]}
          >
            {SORT_OPTIONS.map((option) => {
              const isActive = sortBy === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[
                    styles.sortOption,
                    isActive && { backgroundColor: colors.colorNeutralBackground3 },
                  ]}
                  onPress={() => handleSortPress(option.key)}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={FluentIconSize.small}
                    color={isActive ? colors.colorBrandForeground1 : colors.colorNeutralForeground1}
                  />
                  <FluentText
                    variant="body2"
                    style={[
                      styles.sortOptionLabel,
                      { color: isActive ? colors.colorBrandForeground1 : colors.colorNeutralForeground1 },
                    ]}
                  >
                    {option.label}
                  </FluentText>
                  {isActive && (
                    <MaterialCommunityIcons
                      name="check"
                      size={FluentIconSize.small}
                      color={colors.colorBrandForeground1}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      )}

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
          <MaterialCommunityIcons name="check-circle" size={FluentIconSize.regular} color="#FFFFFF" />
          <FluentText variant="body2" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s, flex: 1 }}>{successMessage}</FluentText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerContainer: {
    zIndex: 100,
  },
  titleRow: {
    height: FluentLayoutSize.topBarHeight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: HORIZONTAL_MARGIN,
  },
  title: {
    flex: 1,
  },
  searchBar: {
    height: SEARCH_BAR_HEIGHT,
    marginHorizontal: HORIZONTAL_MARGIN,
    borderRadius: FluentRadius.large,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.m,
  },
  searchIcon: {
    marginRight: FluentSpacing.s,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
  },
  filterChipScroll: {
    maxHeight: CHIP_HEIGHT + FluentSpacing.m * 2,
  },
  filterChipContainer: {
    paddingHorizontal: HORIZONTAL_MARGIN,
    paddingVertical: FluentSpacing.m,
    gap: CHIP_GAP,
    flexDirection: "row",
  },
  filterChip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: CHIP_HORIZONTAL_PADDING,
    borderRadius: CHIP_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  sortRow: {
    height: FluentLayoutSize.secondaryBarHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: HORIZONTAL_MARGIN,
  },
  sortActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.s,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    height: 36,
    minWidth: 48,
  },
  addButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentRadius.circular,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 100,
  },
  sortOverlay: {
    position: "absolute",
    right: HORIZONTAL_MARGIN,
    width: 160,
    borderRadius: FluentRadius.large,
    borderWidth: 1,
    paddingVertical: FluentSpacing.xs,
    zIndex: 101,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.m,
    gap: FluentSpacing.s,
  },
  sortOptionLabel: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  listContent: {
    paddingTop: FluentSpacing.s,
  },
  gridContent: {
    paddingHorizontal: HORIZONTAL_MARGIN,
    paddingTop: FluentSpacing.s,
  },
  albumRow: {
    gap: ALBUM_GRID_GAP,
    marginBottom: ALBUM_GRID_GAP,
  },
  albumCard: {
    flex: 1,
  },
  albumArtwork: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: FluentRadius.large,
    marginBottom: FluentSpacing.s,
  },
  albumName: {
    fontWeight: "600",
  },
  artistRow: {
    gap: ALBUM_GRID_GAP,
    marginBottom: ALBUM_GRID_GAP,
  },
  artistCard: {
    flex: 1,
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
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    height: 72,
    paddingHorizontal: HORIZONTAL_MARGIN,
    gap: FluentSpacing.m,
    position: "relative",
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
    gap: FluentSpacing.xxs,
  },
  playlistDivider: {
    position: "absolute",
    bottom: 0,
    left: HORIZONTAL_MARGIN + 48 + FluentSpacing.m,
    right: 0,
    height: 1,
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
  successToast: {
    position: "absolute",
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.large,
    ...getShadowStyle('shadow4'),
  },
});

export default memo(LibraryScreen);
