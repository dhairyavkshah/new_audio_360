import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, FlatList, Image } from "react-native";
import { useRoute, RouteProp, useNavigation, CommonActions } from "@react-navigation/native";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { SongCard } from "@/components/SongCard";
import { EmptyState } from "@/components/EmptyState";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
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
    if (album.songs && album.songs.length > 0) {
      return album.songs.map((s: any) => ({
        id: s.id,
        title: s.title,
        artist: s.artist || 'Unknown Artist',
        album: s.album || 'Unknown Album',
        duration: s.duration,
        artwork: s.artwork,
        uri: s.uri || '',
      }));
    }
    
    const allSongs: PlayableSong[] = deviceSongs.map((s) => ({
        id: s.id,
        title: s.title || s.filename.replace(/\.[^/.]+$/, ""),
        artist: s.artist || "Unknown Artist",
        album: s.album || "Unknown Album",
        duration: s.duration,
        artwork: s.artwork || "https://placehold.co/300x300/1a1a2e/ffffff?text=🎵",
        uri: s.uri,
      }));

    return allSongs.filter((song) => 
      song.album.toLowerCase() === album.name.toLowerCase() ||
      song.artist.toLowerCase() === album.artist.toLowerCase()
    );
  }, [deviceSongs, isOnboardingComplete, album]);

  const navigation = useNavigation();

  const handlePlaySong = useCallback((song: PlayableSong) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQueue(albumSongs);
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
  }, [albumSongs, setQueue, playSong, navigation]);

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
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
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
