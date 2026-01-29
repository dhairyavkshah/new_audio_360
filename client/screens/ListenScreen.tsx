import React, { useState, useMemo, useCallback, memo } from "react";
import { View, StyleSheet, FlatList, Platform } from "react-native";
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
import { useNavigationContext } from "@/contexts/NavigationContext";
import { usePlayer } from "@/hooks/usePlayer";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentIconSize, getShadowStyle } from "@/constants/fluent2";
import { Song } from "@/lib/data";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";
import { PlayableSong } from "@/contexts/PlayerContext";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

function ListenScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useThemeContext();
  const { currentSong, isPlaying, playSong, setQueue } = usePlayer();
  const { songs: deviceSongs } = useMediaLibraryContext();
  const { setNowPlayingSource } = useNavigationContext();

  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("title_asc");
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [contextMenuSong, setContextMenuSong] = useState<PlayableSong | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleSongPress = useCallback((song: PlayableSong) => {
    setQueue(filteredAndSortedSongs);
    playSong(song);
    setNowPlayingSource({ tab: 'ListenTab' });
    navigation.navigate("NowPlaying", { songId: song.id });
  }, [filteredAndSortedSongs, setQueue, playSong, navigation, setNowPlayingSource]);

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

  const renderSong = useCallback(({ item }: { item: Song }) => (
    <SongCard
      song={item}
      onPress={() => handleSongPress(item)}
      onContextMenu={handleSongContextMenu}
      isPlaying={currentSong?.id === item.id && isPlaying}
    />
  ), [handleSongPress, handleSongContextMenu, currentSong?.id, isPlaying]);

  const renderEmptyList = useCallback(() => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="music-note-off" size={FluentIconSize.xxlarge} color={colors.colorNeutralForeground2} />
      <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.l, textAlign: "center" }}>
        No songs found matching "{searchQuery}"
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
});

export default memo(ListenScreen);
