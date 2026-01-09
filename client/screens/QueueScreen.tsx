import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { Spacing, BorderRadius, Layout, FluentSpacing, SafeAreaSpacing } from "@/constants/theme";
import { Song } from "@/lib/data";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

export default function QueueScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const { queue, currentSong, playSong, removeFromQueue } = usePlayerContext();
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const handleSongPress = useCallback((song: Song) => {
    if (selectionMode) {
      setSelectedSongs(prev => 
        prev.includes(song.id) 
          ? prev.filter(id => id !== song.id)
          : [...prev, song.id]
      );
    } else {
      playTapSound();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playSong(song);
      navigation.navigate("NowPlaying", { songId: song.id });
    }
  }, [selectionMode, playSong, navigation, playTapSound]);

  const handleLongPress = useCallback((song: Song) => {
    if (!selectionMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playTapSound();
      setSelectionMode(true);
      setSelectedSongs([song.id]);
    }
  }, [selectionMode, playTapSound]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedSongs([]);
  }, []);

  const handleRemoveSelected = useCallback(() => {
    if (selectedSongs.length > 0) {
      playTapSound();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      removeFromQueue(selectedSongs);
      exitSelectionMode();
    }
  }, [selectedSongs, removeFromQueue, exitSelectionMode, playTapSound]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentIndex = currentSong ? queue.findIndex(s => s.id === currentSong.id) : -1;
  const upNext = currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue;

  const QUEUE_ITEM_HEIGHT = 72;

  const getItemLayout = useCallback(
    (data: ArrayLike<Song> | null | undefined, index: number) => ({
      length: QUEUE_ITEM_HEIGHT,
      offset: QUEUE_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderSong = ({ item, index }: { item: Song; index: number }) => {
    const isCurrentSong = currentSong?.id === item.id;
    const isSelected = selectedSongs.includes(item.id);

    return (
      <Pressable
        style={[
          styles.songItem,
          { backgroundColor: isSelected ? theme.primary + "20" : theme.backgroundDefault },
          isCurrentSong && styles.currentSong,
        ]}
        onPress={() => handleSongPress(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
      >
        <View style={styles.songIndex}>
          {selectionMode ? (
            <MaterialCommunityIcons
              name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
              size={24}
              color={isSelected ? theme.primary : theme.textSecondary}
            />
          ) : (
            <ThemedText type="caption1" style={{ color: theme.textSecondary }}>
              {index + 1}
            </ThemedText>
          )}
        </View>
        <Image source={{ uri: item.artwork }} style={styles.artwork} />
        <View style={styles.songInfo}>
          <ThemedText 
            type="body1" 
            numberOfLines={1} 
            style={[styles.songTitle, isCurrentSong && { color: theme.primary }]}
          >
            {item.title}
          </ThemedText>
          <ThemedText type="caption1" numberOfLines={1} style={{ color: theme.textSecondary }}>
            {item.artist}
          </ThemedText>
        </View>
        <ThemedText type="caption1" style={{ color: theme.textSecondary }}>
          {formatDuration(item.duration)}
        </ThemedText>
        {isCurrentSong ? (
          <View style={[styles.playingBadge, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="volume-high" size={12} color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {currentSong ? (
        <>
          <ThemedText type="title3" style={styles.sectionTitle}>Now Playing</ThemedText>
          <Pressable
            style={[styles.currentSongCard, { backgroundColor: theme.surfaceVariant }]}
            onPress={() => {
              playTapSound();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("NowPlaying", { songId: currentSong.id });
            }}
          >
            <Image source={{ uri: currentSong.artwork }} style={styles.currentArtwork} />
            <View style={styles.currentInfo}>
              <ThemedText type="body1" numberOfLines={1} style={{ fontWeight: "600" }}>
                {currentSong.title}
              </ThemedText>
              <ThemedText type="caption1" style={{ color: theme.textSecondary }}>
                {currentSong.artist}
              </ThemedText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />
          </Pressable>
        </>
      ) : null}
      
      <View style={styles.upNextHeader}>
        <ThemedText type="title3" style={styles.sectionTitle}>
          Up Next ({upNext.length} songs)
        </ThemedText>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="playlist-music" size={64} color={theme.textSecondary} />
      <ThemedText type="body1" style={[styles.emptyText, { color: theme.textSecondary }]}>
        Your queue is empty
      </ThemedText>
      <ThemedText type="caption1" style={[styles.emptySubtext, { color: theme.textSecondary }]}>
        Play a song to start building your queue
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {selectionMode ? (
        <View style={[styles.selectionHeader, { backgroundColor: theme.surfaceVariant, paddingTop: Math.max(insets.top, SafeAreaSpacing.top) }]}>
          <Pressable 
            style={styles.selectionButton}
            onPress={exitSelectionMode}
          >
            <MaterialCommunityIcons name="close" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="body1" style={{ fontWeight: "600" }}>
            {selectedSongs.length} selected
          </ThemedText>
          <View style={styles.selectionActions}>
            <Pressable 
              style={styles.selectionButton}
              onPress={handleRemoveSelected}
            >
              <MaterialCommunityIcons name="delete-outline" size={24} color={theme.error || "#FF4D67"} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <FlatList
        data={upNext}
        renderItem={renderSong}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={currentSong ? undefined : renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, SafeAreaSpacing.bottom) + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        getItemLayout={getItemLayout}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Layout.horizontalPadding,
    paddingTop: FluentSpacing.l,
  },
  headerSection: {
    marginBottom: FluentSpacing.xl,
  },
  sectionTitle: {
    marginBottom: FluentSpacing.l,
    fontWeight: "600",
  },
  currentSongCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.l,
    borderRadius: BorderRadius.large,
    marginBottom: FluentSpacing.xl,
    minHeight: Layout.touchTargetMin,
  },
  currentArtwork: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.medium,
  },
  currentInfo: {
    flex: 1,
    marginLeft: FluentSpacing.l,
  },
  upNextHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: BorderRadius.medium,
    marginBottom: FluentSpacing.xs,
    minHeight: Layout.touchTargetMin,
  },
  currentSong: {
    borderLeftWidth: 3,
  },
  songIndex: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.small,
    marginLeft: FluentSpacing.xs,
  },
  songInfo: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  songTitle: {
    fontWeight: "500",
  },
  playingBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: FluentSpacing.m,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: FluentSpacing.xxxl,
  },
  emptyText: {
    marginTop: FluentSpacing.xl,
  },
  emptySubtext: {
    marginTop: FluentSpacing.xs,
    textAlign: "center",
  },
  selectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.horizontalPadding,
    paddingVertical: FluentSpacing.m,
  },
  selectionButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  selectionActions: {
    flexDirection: "row",
  },
});
