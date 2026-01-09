import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, FlatList, Platform, KeyboardAvoidingView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { FluentTopBar, SortOption } from "@/components/FluentTopBar";
import { SongCard } from "@/components/SongCard";
import { SongContextMenu } from "@/components/SongContextMenu";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { usePlayer } from "@/hooks/usePlayer";
import { Spacing, Layout, BorderRadius } from "@/constants/theme";
import { mockSongs, Song } from "@/lib/data";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";
import { PlayableSong } from "@/contexts/PlayerContext";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

export default function ListenScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useThemeContext();
  const { currentSong, isPlaying, playSong, setQueue } = usePlayer();
  const { songs: deviceSongs } = useMediaLibraryContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("title_asc");
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [contextMenuSong, setContextMenuSong] = useState<PlayableSong | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const allSongs: PlayableSong[] = useMemo(() => {
    return deviceSongs.length > 0 ? deviceSongs : mockSongs;
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

  const handleSongPress = (song: PlayableSong) => {
    setQueue(filteredAndSortedSongs);
    playSong(song);
    navigation.navigate("NowPlaying", { songId: song.id });
  };

  const handleSortChange = (option: SortOption) => {
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
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const renderSong = ({ item }: { item: Song }) => (
    <SongCard
      song={item}
      onPress={() => handleSongPress(item)}
      onContextMenu={handleSongContextMenu}
      isPlaying={currentSong?.id === item.id && isPlaying}
    />
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="music-note-off" size={48} color={theme.textSecondary} />
      <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.l, textAlign: "center" }}>
        No songs found matching "{searchQuery}"
      </ThemedText>
    </View>
  );

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
    <ThemedView style={styles.container}>
      <FluentTopBar
        title="Listen"
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={filteredAndSortedSongs}
          renderItem={renderSong}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + (currentSong ? 80 : 0) + Spacing.xl },
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
      </KeyboardAvoidingView>

      <SongContextMenu
        visible={showContextMenu}
        song={contextMenuSong}
        onClose={handleContextMenuClose}
        onSuccess={handleContextMenuSuccess}
      />

      {successMessage ? (
        <View style={[styles.successToast, { backgroundColor: theme.success }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
          <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: Spacing.s, flex: 1 }}>
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
  listContent: {
    paddingHorizontal: Layout.horizontalPadding,
    paddingTop: Spacing.m,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxxl,
  },
  successToast: {
    position: "absolute",
    bottom: 100,
    left: Layout.horizontalPadding,
    right: Layout.horizontalPadding,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.l,
    borderRadius: BorderRadius.card,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
