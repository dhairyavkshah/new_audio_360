import React, { useMemo } from "react";
import { View, StyleSheet, FlatList, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { SongCard } from "@/components/SongCard";
import { EmptyState } from "@/components/EmptyState";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { Spacing, Layout, M3Shape } from "@/constants/theme";
import { mockSongs } from "@/lib/data";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";

type AlbumDetailRouteProp = RouteProp<LibraryStackParamList, "AlbumDetail">;

export default function AlbumDetailScreen() {
  const route = useRoute<AlbumDetailRouteProp>();
  const { album } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useThemeContext();
  const { playSong, currentSong, queue, setQueue } = usePlayerContext();
  const { songs: deviceSongs, isOnboardingComplete } = useMediaLibraryContext();
  const tabBarHeight = useSafeTabBarHeight();

  const albumSongs: PlayableSong[] = useMemo(() => {
    const allSongs: PlayableSong[] = isOnboardingComplete && deviceSongs.length > 0
      ? deviceSongs.map((s) => ({
          id: s.id,
          title: s.filename.replace(/\.[^/.]+$/, ""),
          artist: "Unknown Artist",
          album: "Unknown Album",
          duration: Math.floor((s.duration || 0) / 1000),
          artwork: "https://placehold.co/300x300/1a1a2e/ffffff?text=🎵",
          uri: s.uri,
        }))
      : mockSongs.map((s) => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          album: s.album,
          duration: s.duration,
          artwork: s.artwork,
          uri: "",
        }));

    return allSongs.filter((song) => 
      song.album.toLowerCase() === album.name.toLowerCase() ||
      song.artist.toLowerCase() === album.artist.toLowerCase()
    );
  }, [deviceSongs, isOnboardingComplete, album]);

  const handlePlaySong = (song: PlayableSong) => {
    setQueue(albumSongs);
    playSong(song);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Image source={{ uri: album.artwork }} style={styles.artwork} />
      <View style={styles.headerInfo}>
        <ThemedText type="h2" style={styles.albumTitle}>
          {album.name}
        </ThemedText>
        <ThemedText type="bodyLarge" style={{ color: theme.onSurfaceVariant }}>
          {album.artist}
        </ThemedText>
        <ThemedText type="bodySmall" style={{ color: theme.onSurfaceVariant, marginTop: Spacing.xs }}>
          {albumSongs.length} {albumSongs.length === 1 ? "song" : "songs"}
        </ThemedText>
      </View>
    </View>
  );

  const renderSong = ({ item }: { item: PlayableSong }) => (
    <SongCard
      song={item}
      onPress={() => handlePlaySong(item)}
      isPlaying={currentSong?.id === item.id}
      showFavoriteButton={true}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={albumSongs}
        renderItem={renderSong}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="music-off"
            title="No songs found"
            description="This album doesn't have any songs yet."
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.horizontalPadding,
    paddingTop: Spacing.m,
  },
  header: {
    flexDirection: "row",
    marginBottom: Spacing.xl,
  },
  artwork: {
    width: 120,
    height: 120,
    borderRadius: M3Shape.cornerMedium,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.l,
    justifyContent: "center",
  },
  albumTitle: {
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
});
