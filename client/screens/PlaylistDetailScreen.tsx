import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, Alert, Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useFocusEffect, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { PlayableSong } from "@/contexts/PlayerContext";
import { usePlayer } from "@/hooks/usePlayer";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { mockSongs, Song } from "@/lib/data";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";
import { Playlist, getPlaylists, removeSongFromPlaylist, reorderPlaylistSongs } from "@/lib/storage";

export default function PlaylistDetailScreen() {
  const route = useRoute<RouteProp<LibraryStackParamList, "PlaylistDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeContext();
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

  const songs = useMemo((): PlayableSong[] => {
    if (!playlist) return [];
    return playlist.songIds
      .map(id => {
        const mockSong = mockSongs.find(s => s.id === id);
        if (mockSong) return mockSong as PlayableSong;
        const deviceSong = deviceSongs.find(s => s.id === id);
        return deviceSong || null;
      })
      .filter((s): s is PlayableSong => s !== null);
  }, [playlist, deviceSongs]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const totalDuration = useMemo(() => {
    const total = songs.reduce((acc, s) => acc + s.duration, 0);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
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
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: headerHeight }]}>
          <MaterialCommunityIcons name="playlist-music" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            Playlist not found
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: theme.surfaceVariant }]}>
          <View style={[styles.coverArt, { backgroundColor: theme.primary + "30" }]}>
            <MaterialCommunityIcons name="playlist-music" size={56} color={theme.primary} />
          </View>
          <ThemedText type="h2" style={styles.playlistTitle}>
            {playlist.name}
          </ThemedText>
          {playlist.description ? (
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              {playlist.description}
            </ThemedText>
          ) : null}
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            {songs.length} songs · {totalDuration}
          </ThemedText>

          <View style={styles.actionButtons}>
            <Pressable
              style={[styles.playButton, { backgroundColor: theme.primary }]}
              onPress={handlePlayPlaylist}
            >
              <MaterialCommunityIcons name="play" size={22} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.xs }}>
                Play All
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.shuffleButton, { backgroundColor: theme.surfaceContainer }]}
              onPress={handleShufflePlay}
            >
              <MaterialCommunityIcons name="shuffle" size={20} color={theme.text} />
            </Pressable>
            <Pressable
              style={[styles.shuffleButton, { backgroundColor: isEditMode ? theme.primary : theme.surfaceContainer }]}
              onPress={handleToggleEditMode}
            >
              <MaterialCommunityIcons 
                name={isEditMode ? "check" : "playlist-edit"} 
                size={20} 
                color={isEditMode ? "#FFFFFF" : theme.text} 
              />
            </Pressable>
          </View>
        </View>

        {songs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="music-off" size={40} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              No songs in this playlist
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
              Add songs by long-pressing on any song in the Library
            </ThemedText>
          </View>
        ) : (
          <View style={styles.songsList}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Songs
            </ThemedText>
            {songs.map((song, index) => (
              <Pressable
                key={song.id}
                style={[styles.songItem, { backgroundColor: theme.backgroundDefault }]}
                onPress={() => handleSongPress(song)}
              >
                {isEditMode ? (
                  <View style={styles.reorderControls}>
                    <Pressable
                      style={[styles.reorderButton, { opacity: index === 0 ? 0.3 : 1 }]}
                      onPress={() => handleMoveSong(song.id, "up")}
                      disabled={index === 0}
                    >
                      <MaterialCommunityIcons name="chevron-up" size={22} color={theme.text} />
                    </Pressable>
                    <Pressable
                      style={[styles.reorderButton, { opacity: index === songs.length - 1 ? 0.3 : 1 }]}
                      onPress={() => handleMoveSong(song.id, "down")}
                      disabled={index === songs.length - 1}
                    >
                      <MaterialCommunityIcons name="chevron-down" size={22} color={theme.text} />
                    </Pressable>
                  </View>
                ) : (
                  <ThemedText type="caption" style={[styles.songIndex, { color: theme.textSecondary }]}>
                    {index + 1}
                  </ThemedText>
                )}
                <Image source={{ uri: song.artwork }} style={styles.songArtwork} />
                <View style={styles.songInfo}>
                  <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "500" }}>
                    {song.title}
                  </ThemedText>
                  <ThemedText type="caption" numberOfLines={1} style={{ color: theme.textSecondary }}>
                    {song.artist}
                  </ThemedText>
                </View>
                {isEditMode ? null : (
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginRight: Spacing.sm }}>
                    {formatDuration(song.duration)}
                  </ThemedText>
                )}
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemoveSong(song.id, song.title)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons name="minus-circle-outline" size={20} color={theme.error} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {successMessage ? (
        <View style={[styles.successToast, { backgroundColor: theme.success, bottom: insets.bottom + Spacing.lg }]}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: Spacing.md,
  },
  header: {
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  coverArt: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  playlistTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    minHeight: 44,
  },
  shuffleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  songsList: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    minHeight: 56,
  },
  songIndex: {
    width: 24,
    textAlign: "center",
  },
  songArtwork: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  songInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  reorderControls: {
    flexDirection: "column",
    alignItems: "center",
    width: 32,
    marginRight: Spacing.xs,
  },
  reorderButton: {
    padding: 2,
  },
  successToast: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    elevation: 4,
  },
});
