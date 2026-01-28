import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from "react";
import { View, StyleSheet, FlatList, Platform, ActivityIndicator, SectionList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { FluentTopBar, SortOption } from "@/components/FluentTopBar";
import { SongCard } from "@/components/SongCard";
import { SongContextMenu } from "@/components/SongContextMenu";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { usePlayer } from "@/hooks/usePlayer";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentIconSize, getShadowStyle } from "@/constants/fluent2";
import { Song, StreamSong, isStreamSong } from "@/lib/data";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";
import { PlayableSong } from "@/contexts/PlayerContext";
import { searchInternetMusic, StreamSongResult } from "@/services/InternetMusicService";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

function ListenScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useThemeContext();
  const { currentSong, isPlaying, playSong, setQueue } = usePlayer();
  const { songs: deviceSongs } = useMediaLibraryContext();

  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("title_asc");
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [contextMenuSong, setContextMenuSong] = useState<PlayableSong | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [streamResults, setStreamResults] = useState<StreamSong[]>([]);
  const [isSearchingStream, setIsSearchingStream] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allSongs: PlayableSong[] = useMemo(() => {
    return deviceSongs;
  }, [deviceSongs]);

  const filteredAndSortedSongs = useMemo(() => {
    let result = [...allSongs];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (song) =>
          song.title.toLowerCase().includes(query) ||
          song.artist.toLowerCase().includes(query) ||
          song.album.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "title_desc":
          return b.title.localeCompare(a.title);
        case "artist_asc":
          return a.artist.localeCompare(b.artist);
        case "duration_asc":
          return a.duration - b.duration;
        case "duration_desc":
          return b.duration - a.duration;
        default:
          return 0;
      }
    });

    return result;
  }, [allSongs, searchQuery, sortBy]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedQuery = searchQuery.trim();
    
    if (trimmedQuery.length < 3) {
      setStreamResults([]);
      setStreamError(null);
      setIsSearchingStream(false);
      return;
    }

    setIsSearchingStream(true);
    setStreamError(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchInternetMusic(trimmedQuery);
        const streamSongs: StreamSong[] = results.map((result: StreamSongResult) => ({
          id: result.id,
          title: result.title,
          artist: result.artist,
          album: result.album,
          duration: result.duration,
          artwork: result.artwork,
          source: 'stream' as const,
          streamUrl: result.streamUrl,
          bitrate: result.bitrate,
          licenseType: result.licenseType,
          identifier: result.identifier,
        }));
        setStreamResults(streamSongs);
        setStreamError(null);
      } catch (error) {
        console.error('[ListenScreen] Stream search error:', error);
        setStreamError('Unable to search online. Please try again.');
        setStreamResults([]);
      } finally {
        setIsSearchingStream(false);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const handleSongPress = useCallback((song: PlayableSong) => {
    if (isStreamSong(song)) {
      playSong(song);
      navigation.navigate("NowPlaying", { songId: song.id });
    } else {
      setQueue(filteredAndSortedSongs);
      playSong(song);
      navigation.navigate("NowPlaying", { songId: song.id });
    }
  }, [filteredAndSortedSongs, setQueue, playSong, navigation]);

  const handleSortChange = useCallback((option: SortOption) => {
    setSortBy(option);
    setShowSortOptions(false);
  }, []);

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
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const showSections = searchQuery.trim().length >= 3;

  const sections = useMemo(() => {
    if (!showSections) return [];
    
    const sectionsData: Array<{ title: string; data: PlayableSong[]; isStream?: boolean }> = [];
    
    if (filteredAndSortedSongs.length > 0) {
      sectionsData.push({
        title: 'From Device',
        data: filteredAndSortedSongs,
        isStream: false,
      });
    }
    
    if (streamResults.length > 0 || isSearchingStream) {
      sectionsData.push({
        title: 'From Internet',
        data: streamResults,
        isStream: true,
      });
    }
    
    return sectionsData;
  }, [showSections, filteredAndSortedSongs, streamResults, isSearchingStream]);

  const renderSong = useCallback(({ item }: { item: PlayableSong }) => (
    <SongCard
      song={item}
      onPress={() => handleSongPress(item)}
      onContextMenu={handleSongContextMenu}
      isPlaying={currentSong?.id === item.id && isPlaying}
      showStreamIndicator={isStreamSong(item)}
    />
  ), [handleSongPress, handleSongContextMenu, currentSong?.id, isPlaying]);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string; isStream?: boolean } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.colorNeutralBackground1 }]}>
      <MaterialCommunityIcons 
        name={section.isStream ? "web" : "folder-music"} 
        size={FluentIconSize.small} 
        color={colors.colorNeutralForeground2} 
      />
      <FluentText variant="caption1Strong" color="secondary" style={{ marginLeft: FluentSpacing.s }}>
        {section.title}
      </FluentText>
      {section.isStream && isSearchingStream && (
        <ActivityIndicator size="small" color={colors.colorBrandForeground1} style={{ marginLeft: FluentSpacing.s }} />
      )}
    </View>
  ), [colors, isSearchingStream]);

  const renderSectionFooter = useCallback(({ section }: { section: { title: string; data: PlayableSong[]; isStream?: boolean } }) => {
    if (section.isStream && streamError) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={FluentIconSize.small} color={colors.colorPaletteRedForeground1} />
          <FluentText variant="caption1" color="secondary" style={{ marginLeft: FluentSpacing.xs }}>
            {streamError}
          </FluentText>
        </View>
      );
    }
    if (section.isStream && section.data.length === 0 && !isSearchingStream && searchQuery.trim().length >= 3) {
      return (
        <View style={styles.emptySection}>
          <FluentText variant="caption1" color="tertiary">
            No public domain audio found
          </FluentText>
        </View>
      );
    }
    return null;
  }, [colors, streamError, isSearchingStream, searchQuery]);

  const renderEmptyList = useCallback(() => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="music-note-off" size={FluentIconSize.xxlarge} color={colors.colorNeutralForeground2} />
      <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.l, textAlign: "center" }}>
        {searchQuery.trim() ? `No songs found matching "${searchQuery}"` : "Your music library is empty"}
      </FluentText>
    </View>
  ), [colors.colorNeutralForeground2, searchQuery]);

  const SONG_ITEM_HEIGHT = 72;

  const getItemLayout = useCallback(
    (data: ArrayLike<Song> | null | undefined, index: number) => ({
      length: SONG_ITEM_HEIGHT,
      offset: SONG_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <FluentScreenLayout
      header={
        <FluentTopBar
          title="New Audio 360"
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search songs..."
          showSort
          sortBy={sortBy}
          onSortChange={handleSortChange}
          showSortOverlay={showSortOptions}
          onSortOverlayToggle={() => setShowSortOptions(!showSortOptions)}
        />
      }
      contentPadding="l"
      avoidKeyboard
    >
      {showSections ? (
        <SectionList
          sections={sections}
          renderItem={renderSong}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={renderSectionFooter}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + (currentSong ? 80 : 0) + FluentSpacing.xl },
          ]}
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <FlatList
          data={filteredAndSortedSongs}
          renderItem={renderSong}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + (currentSong ? 80 : 0) + FluentSpacing.xl },
          ]}
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          getItemLayout={getItemLayout}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <SongContextMenu
        visible={showContextMenu}
        song={contextMenuSong}
        onClose={handleContextMenuClose}
        onSuccess={handleContextMenuSuccess}
      />

      {successMessage ? (
        <View style={[styles.successToast, { backgroundColor: colors.colorPaletteGreenForeground1 }, getShadowStyle('shadow4', isDark)]}>
          <MaterialCommunityIcons name="check-circle" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
          <FluentText variant="caption1" style={{ color: colors.colorNeutralForegroundOnBrand, marginLeft: FluentSpacing.s, flex: 1 }}>
            {successMessage}
          </FluentText>
        </View>
      ) : null}
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: FluentSpacing.l,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: FluentSpacing.xxxl,
  },
  successToast: {
    position: "absolute",
    bottom: FluentSpacing.xxxxxxl + FluentSpacing.xxxl,
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.l,
    borderRadius: FluentRadius.large,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.xs,
    marginBottom: FluentSpacing.xs,
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: FluentSpacing.l,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: FluentSpacing.m,
  },
});

export default memo(ListenScreen);
