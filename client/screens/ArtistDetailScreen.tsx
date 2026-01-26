import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, FlatList, Image } from "react-native";

// Default album art for songs without artwork
const DEFAULT_ALBUM_ART = require("@/assets/images/default_album_art.png");
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

type ArtistDetailRouteProp = RouteProp<LibraryStackParamList, "ArtistDetail">;

export default function ArtistDetailScreen() {
  const route = useRoute<ArtistDetailRouteProp>();
  const { artist } = route.params;
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { playSong, currentSong, setQueue } = usePlayerContext();
  const { songs: deviceSongs, isOnboardingComplete } = useMediaLibraryContext();
  const tabBarHeight = useSafeTabBarHeight();

  const artistSongs: PlayableSong[] = useMemo(() => {
    if (artist.songs && artist.songs.length > 0) {
      return artist.songs.map((s: any) => ({
        id: s.id,
        title: s.title,
        artist: s.artist || 'Unknown Artist',
        album: s.album || 'Unknown Album',
        duration: s.duration,
        artwork: s.artwork,
        uri: s.uri || '',
        filename: s.filename || `${s.title}.mp3`,
        modificationTime: s.modificationTime || Date.now(),
        isFromDevice: s.isFromDevice !== undefined ? s.isFromDevice : true,
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
        filename: s.filename,
        modificationTime: s.modificationTime,
        isFromDevice: s.isFromDevice,
      }));

    return allSongs.filter((song) => 
      song.artist.toLowerCase() === artist.name.toLowerCase()
    );
  }, [deviceSongs, isOnboardingComplete, artist]);

  const navigation = useNavigation();

  const handlePlaySong = useCallback((song: PlayableSong) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQueue(artistSongs);
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
  }, [artistSongs, setQueue, playSong, navigation]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Image source={artist.artwork ? { uri: artist.artwork } : DEFAULT_ALBUM_ART} style={styles.artwork} />
      <View style={styles.headerInfo}>
        <FluentText variant="title2" style={styles.artistName}>
          {artist.name}
        </FluentText>
        <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
          {artistSongs.length} {artistSongs.length === 1 ? "song" : "songs"}
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
        data={artistSongs}
        renderItem={renderSong}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="music-off"
            title="No songs found"
            description="This artist doesn't have any songs yet."
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
    borderRadius: 60,
  },
  headerInfo: {
    flex: 1,
    marginLeft: FluentSpacing.l,
    justifyContent: "center",
  },
  artistName: {
    fontWeight: "700",
    marginBottom: FluentSpacing.xs,
  },
});
