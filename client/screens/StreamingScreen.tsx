import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, TextInput, Pressable, ActivityIndicator, Platform, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { FluentText, FluentScreenLayout } from "@/components/fluent";
import { AnimatedCard } from "@/components/AnimatedCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentRadius } from "@/constants/fluent2";
import StreamingService, { StreamingSong } from "@/services/StreamingService";

export default function StreamingScreen() {
  const { theme, isDark } = useThemeContext();
  const [songs, setSongs] = useState<StreamingSong[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const loadSongs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await StreamingService.getSongs(1, 50);
      setSongs(result.songs);
    } catch (err) {
      setError("Failed to load songs. Check your connection.");
      console.error("Load songs error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchSongs = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadSongs();
      return;
    }

    try {
      setSearching(true);
      setError(null);
      const results = await StreamingService.search(query);
      setSongs(results);
    } catch (err) {
      setError("Search failed. Try again.");
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }, [loadSongs]);

  useEffect(() => {
    loadSongs();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery) {
        searchSongs(searchQuery);
      } else {
        loadSongs();
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const playSong = async (song: StreamingSong) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      if (currentlyPlaying === song.id && isPlaying) {
        setIsPlaying(false);
        setCurrentlyPlaying(null);
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.stream_url },
        { shouldPlay: true }
      );

      setSound(newSound);
      setCurrentlyPlaying(song.id);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setCurrentlyPlaying(null);
        }
      });
    } catch (err) {
      console.error("Playback error:", err);
      setError("Failed to play song");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderSongItem = ({ item }: { item: StreamingSong }) => {
    const isCurrentSong = currentlyPlaying === item.id;
    
    return (
      <AnimatedCard
        style={[
          styles.songCard,
          { backgroundColor: theme.cardBackground },
          isCurrentSong && { borderColor: theme.primary, borderWidth: 2 }
        ]}
        borderRadius={FluentRadius.medium}
        onPress={() => playSong(item)}
      >
        <View style={styles.songInfo}>
          {item.artwork_url ? (
            <Image 
              source={{ uri: item.artwork_url }} 
              style={styles.artwork}
            />
          ) : (
            <View style={[styles.artworkPlaceholder, { backgroundColor: theme.primary }]}>
              <MaterialCommunityIcons name="music" size={24} color="#fff" />
            </View>
          )}
          <View style={styles.songDetails}>
            <FluentText variant="body1" numberOfLines={1} style={styles.songTitle}>
              {item.title}
            </FluentText>
            <FluentText variant="caption1" color="secondary" numberOfLines={1}>
              {item.artist} {item.album ? `• ${item.album}` : ""}
            </FluentText>
            <View style={styles.songMeta}>
              <FluentText variant="caption2" color="tertiary">
                {formatDuration(item.duration)}
              </FluentText>
              {item.genre && (
                <View style={[styles.genreBadge, { backgroundColor: theme.primary + "20" }]}>
                  <FluentText variant="caption2" style={{ color: theme.primary }}>
                    {item.genre}
                  </FluentText>
                </View>
              )}
              <View style={[styles.streamBadge, { backgroundColor: "#4CAF50" }]}>
                <MaterialCommunityIcons name="cloud" size={10} color="#fff" />
                <FluentText variant="caption2" style={{ color: "#fff", marginLeft: 2 }}>
                  Stream
                </FluentText>
              </View>
            </View>
          </View>
        </View>
        <Pressable
          style={[styles.playButton, { backgroundColor: theme.primary }]}
          onPress={() => playSong(item)}
        >
          <MaterialCommunityIcons
            name={isCurrentSong && isPlaying ? "pause" : "play"}
            size={24}
            color="#fff"
          />
        </Pressable>
      </AnimatedCard>
    );
  };

  return (
    <FluentScreenLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <FluentText variant="title1" style={styles.title}>
            Online Music
          </FluentText>
          <FluentText variant="body2" color="secondary">
            Stream from cloud catalog
          </FluentText>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search songs, artists..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <MaterialCommunityIcons name="close-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: "#FF5252" + "20" }]}>
            <MaterialCommunityIcons name="alert-circle" size={18} color="#FF5252" />
            <FluentText variant="body2" style={{ color: "#FF5252", marginLeft: 8 }}>
              {error}
            </FluentText>
            <Pressable onPress={loadSongs} style={styles.retryButton}>
              <FluentText variant="body2" style={{ color: theme.primary }}>
                Retry
              </FluentText>
            </Pressable>
          </View>
        )}

        {(loading || searching) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <FluentText variant="body2" color="secondary" style={{ marginTop: 12 }}>
              {searching ? "Searching..." : "Loading songs..."}
            </FluentText>
          </View>
        ) : songs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="music-off" size={48} color={theme.textSecondary} />
            <FluentText variant="body1" color="secondary" style={{ marginTop: 12 }}>
              {searchQuery ? "No songs found" : "No songs available"}
            </FluentText>
          </View>
        ) : (
          <FlatList
            data={songs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderSongItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={[styles.footer, { backgroundColor: theme.cardBackground }]}>
          <FluentText variant="caption1" color="tertiary">
            {songs.length} songs available • Streaming from cloud
          </FluentText>
        </View>
      </View>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: FluentSpacing.m,
    paddingTop: FluentSpacing.l,
    paddingBottom: FluentSpacing.s,
  },
  title: {
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: FluentSpacing.m,
    marginVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentRadius.medium,
    gap: FluentSpacing.s,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === "web" ? 8 : 4,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: FluentSpacing.m,
    marginVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentRadius.small,
  },
  retryButton: {
    marginLeft: "auto",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: FluentSpacing.m,
    paddingBottom: 100,
  },
  songCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: FluentSpacing.m,
    marginBottom: FluentSpacing.s,
  },
  songInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  artworkPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.small,
    justifyContent: "center",
    alignItems: "center",
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.small,
  },
  songDetails: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  songTitle: {
    fontWeight: "600",
  },
  songMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  genreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  streamBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: FluentSpacing.m,
    alignItems: "center",
  },
});
