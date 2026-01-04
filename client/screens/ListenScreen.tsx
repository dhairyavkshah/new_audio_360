import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { usePlayer } from "@/hooks/usePlayer";
import { Fluent2 } from "@/constants/fluent2";
import { FluentText, FluentSearchBar } from "@/components/fluent2";
import { SongCard } from "@/components/SongCard";
import { SongContextMenu } from "@/components/SongContextMenu";
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
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useFluent2Theme();
  const { playTapSound } = useUiSound();
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

  const renderStickyHeader = () => (
    <View style={[styles.stickyHeader, { backgroundColor: colors.background, top: headerHeight }]}>
      <View style={styles.searchSortRow}>
        <View style={{ flex: 1 }}>
          <FluentSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
          />
        </View>
        <Pressable
          style={[styles.sortButton, { backgroundColor: colors.surfaceSecondary }]}
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
      </View>
      <FluentText variant="caption1" style={{ color: colors.textSecondary, marginTop: Fluent2.spacing.xxs }}>
        {filteredAndSortedSongs.length} {filteredAndSortedSongs.length === 1 ? "song" : "songs"}
      </FluentText>
    </View>
  );

  const renderSortOverlay = () => (
    showSortOptions ? (
      <>
        <Pressable 
          style={styles.sortOverlayBackdrop} 
          onPress={() => setShowSortOptions(false)} 
        />
        <View style={[styles.sortOptionsOverlay, { backgroundColor: colors.surfacePrimary, top: headerHeight + 70 }]}>
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
                  { marginLeft: Fluent2.spacing.s },
                  sortBy === option.key && { color: colors.brandPrimary, fontWeight: "600" },
                ]}
              >
                {option.label}
              </FluentText>
              {sortBy === option.key ? (
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color={colors.brandPrimary}
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
      <MaterialCommunityIcons name="music-note-off" size={48} color={colors.textSecondary} />
      <FluentText variant="body1" style={{ color: colors.textSecondary, marginTop: Fluent2.spacing.m, textAlign: "center" }}>
        No songs found matching "{searchQuery}"
      </FluentText>
    </View>
  );

  const STICKY_HEADER_HEIGHT = 80;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderStickyHeader()}
      <FlatList
        data={filteredAndSortedSongs}
        renderItem={renderSong}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerHeight + STICKY_HEADER_HEIGHT + Fluent2.spacing.s, paddingBottom: tabBarHeight + (currentSong ? 80 : 0) + Fluent2.spacing.xl },
        ]}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />
      {renderSortOverlay()}

      <SongContextMenu
        visible={showContextMenu}
        song={contextMenuSong}
        onClose={handleContextMenuClose}
        onSuccess={handleContextMenuSuccess}
      />

      {successMessage ? (
        <View style={[styles.successToast, { backgroundColor: colors.statusSuccess }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
          <FluentText variant="caption1" style={{ color: "#FFFFFF", marginLeft: Fluent2.spacing.s, flex: 1 }}>
            {successMessage}
          </FluentText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Fluent2.spacing.m,
  },
  stickyHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Fluent2.spacing.m,
    paddingVertical: Fluent2.spacing.s,
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
    paddingVertical: Fluent2.spacing.s,
    borderRadius: Fluent2.radius.medium,
    minHeight: 40,
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
    borderRadius: Fluent2.radius.medium,
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Fluent2.spacing.xxxl,
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
    borderRadius: Fluent2.radius.medium,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
