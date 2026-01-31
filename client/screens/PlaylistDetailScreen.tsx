import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, Alert, Platform } from "react-native";

// Default album art for songs without artwork
const DEFAULT_ALBUM_ART = require("@/assets/images/default_album_art.png");
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useFocusEffect, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { PlayableSong } from "@/contexts/PlayerContext";
import { usePlayer } from "@/hooks/usePlayer";
import { useMediaLibraryContext, DeviceSong } from "@/contexts/MediaLibraryContext";
import { FluentSpacing, FluentControlRadius, FluentRadius, FluentLightColors, FluentDarkColors, FluentTypography } from "@/constants/fluent2";
import { Layout } from "@/constants/theme";
import { Song } from "@/lib/data";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";
import { Playlist, getPlaylists, removeSongFromPlaylist, reorderPlaylistSongs } from "@/lib/storage";

export default function PlaylistDetailScreen() {
  const route = useRoute<RouteProp<LibraryStackParamList, "PlaylistDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { playTapSound } = useUiSound();
  const { playSong, setQueue, shuffle, toggleShuffle } = usePlayer();
  const { songs: deviceSongs } = useMediaLibraryContext();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const loadPlaylist = useCallback(async () => {
    const playlists = await getPlaylists();
    const found = playlists.find(p => p.id === route.params.playlistId);
    setPlaylist(found || null);
  }, [route.params.playlistId]);

  useFocusEffect(
    useCallback(() => {
      loadPlaylist();
    }, [loadPlaylist])
  );

  const songs = useMemo((): DeviceSong[] => {
    if (!playlist) return [];
    return playlist.songIds
      .map(id => deviceSongs.find(s => s.id === id))
      .filter((s): s is DeviceSong => s !== undefined);
  }, [playlist, deviceSongs]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const totalDuration = useMemo(() => {
    const totalMs = songs.reduce((acc, s) => acc + s.duration, 0);
    const totalSeconds = Math.floor(totalMs / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hrs > 0) return `${hrs} hr ${mins} min`;
    return `${mins} min`;
  }, [songs]);

  const handlePlayPlaylist = () => {
    if (songs.length === 0) return;
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (shuffle) toggleShuffle();
    setQueue(songs);
    playSong(songs[0]);
    navigation.getParent()?.navigate("ListenTab", { screen: "NowPlaying", params: { songId: songs[0].id } });
  };

  const handleShufflePlay = () => {
    if (songs.length === 0) return;
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!shuffle) toggleShuffle();
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    playSong(shuffled[0]);
    navigation.getParent()?.navigate("ListenTab", { screen: "NowPlaying", params: { songId: shuffled[0].id } });
  };

  const handleRemoveSong = async (songId: string, songTitle: string) => {
    if (!playlist) return;
    
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`Remove "${songTitle}" from this playlist?`);
      if (confirmed) {
        await removeSongFromPlaylist(playlist.id, songId);
        await loadPlaylist();
        setSuccessMessage(`Removed "${songTitle}" from playlist`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } else {
      Alert.alert(
        "Remove Song",
        `Remove "${songTitle}" from this playlist?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              await removeSongFromPlaylist(playlist.id, songId);
              await loadPlaylist();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setSuccessMessage(`Removed "${songTitle}" from playlist`);
              setTimeout(() => setSuccessMessage(null), 3000);
            },
          },
        ]
      );
    }
  };

  const handleSongPress = (song: PlayableSong) => {
    if (isEditMode) return;
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQueue(songs);
    playSong(song);
    navigation.getParent()?.navigate("ListenTab", { screen: "NowPlaying", params: { songId: song.id } });
  };

  const handleToggleEditMode = () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditMode(!isEditMode);
  };

  const handleMoveSong = async (songId: string, direction: "up" | "down") => {
    if (!playlist) return;
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const currentIndex = playlist.songIds.indexOf(songId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= playlist.songIds.length) return;
    
    const newSongIds = [...playlist.songIds];
    [newSongIds[currentIndex], newSongIds[newIndex]] = [newSongIds[newIndex], newSongIds[currentIndex]];
    
    await reorderPlaylistSongs(playlist.id, newSongIds);
    await loadPlaylist();
  };

  if (!playlist) {
    return (
      <FluentScreenLayout hasBottomNavigation={false} isNestedScreen={true}>
        <View style={[styles.loadingContainer, { paddingTop: headerHeight }]}>
          <MaterialCommunityIcons name="playlist-music" size={64} color={colors.colorNeutralForeground2} />
          <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.l }}>
            Playlist not found
          </FluentText>
        </View>
      </FluentScreenLayout>
    );
  }

  return (
    <FluentScreenLayout hasBottomNavigation={false} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight, paddingBottom: insets.bottom + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: colors.colorNeutralBackground3 }]}>
          <View style={[styles.coverArt, { backgroundColor: colors.colorBrandBackground + "30" }]}>
            <MaterialCommunityIcons name="playlist-music" size={40} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title2" style={styles.playlistTitle}>
            {playlist.name}
          </FluentText>
          {playlist.description ? (
            <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
              {playlist.description}
            </FluentText>
          ) : null}
          <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.s }}>
            {songs.length} songs · {totalDuration}
          </FluentText>

          <View style={styles.actionButtons}>
            <Pressable
              style={[styles.playButton, { backgroundColor: colors.colorBrandBackground }]}
              onPress={handlePlayPlaylist}
            >
              <MaterialCommunityIcons name="play" size={22} color="#FFFFFF" />
              <FluentText variant="body1Strong" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.xs }}>
                Play All
              </FluentText>
            </Pressable>
            <Pressable
              style={[styles.shuffleButton, { backgroundColor: colors.colorNeutralBackground4 }]}
              onPress={handleShufflePlay}
            >
              <MaterialCommunityIcons name="shuffle" size={20} color={colors.colorNeutralForeground1} />
            </Pressable>
            <Pressable
              style={[styles.shuffleButton, { backgroundColor: isEditMode ? colors.colorBrandBackground : colors.colorNeutralBackground4 }]}
              onPress={handleToggleEditMode}
            >
              <MaterialCommunityIcons 
                name={isEditMode ? "check" : "playlist-edit"} 
                size={20} 
                color={isEditMode ? "#FFFFFF" : colors.colorNeutralForeground1} 
              />
            </Pressable>
          </View>
        </View>

        {songs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="music-off" size={40} color={colors.colorNeutralForeground2} />
            <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.l }}>
              No songs in this playlist
            </FluentText>
            <FluentText variant="caption1" color="secondary" style={{ textAlign: "center", marginTop: FluentSpacing.xs }}>
              Add songs by long-pressing on any song in the Library
            </FluentText>
          </View>
        ) : (
          <View style={styles.songsList}>
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Songs
            </FluentText>
            {songs.map((song, index) => (
              <Pressable
                key={song.id}
                style={[styles.songItem, { backgroundColor: colors.colorNeutralBackground1 }]}
                onPress={() => handleSongPress(song)}
              >
                {isEditMode ? (
                  <View style={styles.reorderControls}>
                    <Pressable
                      style={[styles.reorderButton, { opacity: index === 0 ? 0.3 : 1 }]}
                      onPress={() => handleMoveSong(song.id, "up")}
                      disabled={index === 0}
                    >
                      <MaterialCommunityIcons name="chevron-up" size={22} color={colors.colorNeutralForeground1} />
                    </Pressable>
                    <Pressable
                      style={[styles.reorderButton, { opacity: index === songs.length - 1 ? 0.3 : 1 }]}
                      onPress={() => handleMoveSong(song.id, "down")}
                      disabled={index === songs.length - 1}
                    >
                      <MaterialCommunityIcons name="chevron-down" size={22} color={colors.colorNeutralForeground1} />
                    </Pressable>
                  </View>
                ) : (
                  <FluentText variant="caption1" color="secondary" style={styles.songIndex}>
                    {index + 1}
                  </FluentText>
                )}
                <Image source={song.artwork ? { uri: song.artwork } : DEFAULT_ALBUM_ART} style={styles.songArtwork} />
                <View style={styles.songInfo}>
                  <FluentText variant="body1Strong" numberOfLines={1}>
                    {song.title}
                  </FluentText>
                  <FluentText variant="caption1" color="secondary" numberOfLines={1}>
                    {song.artist}
                  </FluentText>
                </View>
                {isEditMode ? null : (
                  <FluentText variant="caption1" color="secondary" style={{ marginRight: FluentSpacing.s }}>
                    {formatDuration(song.duration)}
                  </FluentText>
                )}
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemoveSong(song.id, song.title)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons name="minus-circle-outline" size={20} color={colors.colorPaletteRedForeground1} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {successMessage ? (
        <View style={[styles.successToast, { backgroundColor: colors.colorPaletteGreenForeground1, bottom: insets.bottom + FluentSpacing.l }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
          <FluentText variant="body1" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s, flex: 1 }}>
            {successMessage}
          </FluentText>
        </View>
      ) : null}
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: FluentSpacing.l,
  },
  header: {
    alignItems: "center",
    padding: FluentSpacing.m,
    paddingTop: FluentSpacing.s,
    borderRadius: FluentControlRadius.card,
    marginBottom: FluentSpacing.m,
  },
  coverArt: {
    width: 80,
    height: 80,
    borderRadius: FluentControlRadius.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.s,
  },
  playlistTitle: {
    fontSize: FluentTypography.title1.fontSize,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: FluentSpacing.m,
    gap: FluentSpacing.m,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.xl,
    borderRadius: FluentRadius.circular,
    minHeight: Layout.buttonStandard,
  },
  shuffleButton: {
    width: 48,
    height: 48,
    borderRadius: FluentControlRadius.fab,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xxl,
  },
  songsList: {
    gap: FluentSpacing.xs,
  },
  sectionTitle: {
    marginBottom: FluentSpacing.m,
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    minHeight: Layout.listItemStandard,
  },
  songIndex: {
    width: 24,
    textAlign: "center",
  },
  songArtwork: {
    width: 48,
    height: 48,
    borderRadius: FluentControlRadius.chip,
    marginLeft: FluentSpacing.m,
  },
  songInfo: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  removeButton: {
    padding: FluentSpacing.xs,
  },
  reorderControls: {
    flexDirection: "column",
    alignItems: "center",
    width: 32,
    marginRight: FluentSpacing.xs,
  },
  reorderButton: {
    padding: 2,
  },
  successToast: {
    position: "absolute",
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
    elevation: 4,
  },
});
