import React, { useMemo } from "react";
import { View, StyleSheet, FlatList, Image } from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { SongCard } from "@/components/SongCard";
import { EmptyState } from "@/components/EmptyState";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { mockSongs } from "@/lib/data";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";

type AlbumDetailRouteProp = RouteProp<LibraryStackParamList, "AlbumDetail">;

export default function AlbumDetailScreen() {
  const route = useRoute<AlbumDetailRouteProp>();
  const { album } = route.params;
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
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
        <FluentText variant="title2" style={styles.albumTitle}>
          {album.name}
        </FluentText>
        <FluentText variant="body2" color="secondary">
          {album.artist}
        </FluentText>
        <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
          {albumSongs.length} {albumSongs.length === 1 ? "song" : "songs"}
        </FluentText>
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
    <FluentScreenLayout edges={[]} hasBottomNavigation={true} hideStatusBar>
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
          { paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: FluentSpacing.l,
    paddingTop: FluentSpacing.m,
  },
  header: {
    flexDirection: "row",
    marginBottom: FluentSpacing.xl,
  },
  artwork: {
    width: 120,
    height: 120,
    borderRadius: FluentControlRadius.card,
  },
  headerInfo: {
    flex: 1,
    marginLeft: FluentSpacing.l,
    justifyContent: "center",
  },
  albumTitle: {
    fontWeight: "700",
    marginBottom: FluentSpacing.xs,
  },
});
