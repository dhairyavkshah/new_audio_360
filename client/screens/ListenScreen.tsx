import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, Platform, TextInput, ActivityIndicator, LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SongCard } from "@/components/SongCard";
import { SongContextMenu } from "@/components/SongContextMenu";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { usePlayer } from "@/hooks/usePlayer";
import { Spacing, BorderRadius, Layout, Typography, M3Shape, M3Elevation } from "@/constants/theme";
import { mockSongs, Song } from "@/lib/data";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";
import { PlayableSong } from "@/contexts/PlayerContext";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

type SortOption = "title_asc" | "title_desc" | "artist_asc" | "duration_asc" | "duration_desc";

const SORT_OPTIONS: { key: SortOption; label: string; icon: string }[] = [
  { key: "title_asc", label: "A-Z", icon: "sort-alphabetical-ascending" },
  { key: "title_desc", label: "Z-A", icon: "sort-alphabetical-descending" },
  { key: "artist_asc", label: "Artist", icon: "account-music" },
  { key: "duration_asc", label: "Shortest", icon: "timer-outline" },
  { key: "duration_desc", label: "Longest", icon: "timer" },
];

export default function ListenScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const { currentSong, isPlaying, playSong, setQueue, isLoading: isPlayerLoading, isBuffering } = usePlayer();
  const { songs: deviceSongs, isLoading: isLoadingSongs, progress, usingMockData } = useMediaLibraryContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("title_asc");
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [contextMenuSong, setContextMenuSong] = useState<PlayableSong | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(56);

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && Math.abs(height - headerHeight) > 2) {
      setHeaderHeight(height);
    }
  }, [headerHeight]);

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
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const renderHeader = () => (
    <View 
      style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.surfaceContainer, borderBottomColor: theme.outlineVariant }]}
      onLayout={handleHeaderLayout}
    >
      <View style={styles.headerRow}>
        <ThemedText type="titleLarge" style={styles.headerTitle}>New Audio 360</ThemedText>
        <View style={[styles.searchContainer, { backgroundColor: theme.surfaceContainerHigh }]}>
          <MaterialCommunityIcons name="magnify" size={16} color={theme.onSurfaceVariant} />
          <TextInput
            style={[styles.searchInput, { color: theme.onSurface }]}
            placeholder="Search..."
            placeholderTextColor={theme.onSurfaceVariant}
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close-circle" size={14} color={theme.onSurfaceVariant} />
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
          <MaterialCommunityIcons
            name={SORT_OPTIONS.find((o) => o.key === sortBy)?.icon as any || "sort"}
            size={16}
            color={theme.onSurface}
          />
          <MaterialCommunityIcons
            name={showSortOptions ? "chevron-up" : "chevron-down"}
            size={12}
            color={theme.onSurfaceVariant}
          />
        </Pressable>
      </View>
      <ThemedText type="labelSmall" style={{ color: theme.onSurfaceVariant, marginTop: Spacing.xs }}>
        {filteredAndSortedSongs.length} {filteredAndSortedSongs.length === 1 ? "song" : "songs"}
      </ThemedText>
    </View>
  );

  const renderSortOverlay = () => (
    showSortOptions ? (
      <>
        <Pressable 
          style={styles.sortOverlayBackdrop} 
          onPress={() => setShowSortOptions(false)} 
        />
        <View style={[styles.sortOptionsOverlay, { backgroundColor: theme.surfaceContainerHigh, top: insets.top + headerHeight - 10 }]}>
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

  const SONG_ITEM_HEIGHT = 68;

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
      {renderHeader()}
      <FlatList
        data={filteredAndSortedSongs}
        renderItem={renderSong}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: Spacing.s, paddingBottom: tabBarHeight + (currentSong ? 80 : 0) + Spacing.xl },
        ]}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        getItemLayout={getItemLayout}
      />
      {renderSortOverlay()}

      <SongContextMenu
        visible={showContextMenu}
        song={contextMenuSong}
        onClose={handleContextMenuClose}
        onSuccess={handleContextMenuSuccess}
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
  listContent: {
    paddingHorizontal: Layout.horizontalPadding,
  },
  header: {
    paddingHorizontal: Layout.horizontalPadding,
    paddingBottom: Spacing.s,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
  },
  headerTitle: {
    fontWeight: "600",
    marginRight: Spacing.xs,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: M3Shape.cornerFull,
    paddingHorizontal: Spacing.s,
    height: 36,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.s,
    borderRadius: M3Shape.cornerFull,
    height: 36,
    gap: 2,
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
    borderRadius: BorderRadius.card,
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
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
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
