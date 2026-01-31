import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, Platform } from "react-native";

// Default album art for songs without artwork
const DEFAULT_ALBUM_ART = require("@/assets/images/default_album_art.png");
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { FluentSpacing, FluentPadding, FluentControlRadius, FluentLightColors, FluentDarkColors, FluentIconSize, FluentTouchTarget } from "@/constants/fluent2";
import { Song } from "@/lib/data";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

export default function QueueScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
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

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
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
          { backgroundColor: isSelected ? colors.colorNeutralBackground1Pressed : colors.colorNeutralBackground2 },
          isCurrentSong && [styles.currentSong, { borderColor: colors.colorBrandStroke1 }],
        ]}
        onPress={() => handleSongPress(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
      >
        <View style={styles.dragHandle}>
          <MaterialCommunityIcons
            name="drag-horizontal-variant"
            size={FluentIconSize.regular}
            color={colors.colorNeutralForeground3}
          />
        </View>
        <View style={styles.songIndex}>
          {selectionMode ? (
            <MaterialCommunityIcons
              name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
              size={FluentIconSize.medium}
              color={isSelected ? colors.colorBrandForeground1 : colors.colorNeutralForeground2}
            />
          ) : (
            <FluentText variant="caption1" color="secondary">
              {index + 1}
            </FluentText>
          )}
        </View>
        <Image source={item.artwork ? { uri: item.artwork } : DEFAULT_ALBUM_ART} style={styles.artwork} />
        <View style={styles.songInfo}>
          <FluentText 
            variant="body1Strong" 
            numberOfLines={1} 
            style={isCurrentSong ? { color: colors.colorBrandForeground1 } : undefined}
          >
            {item.title}
          </FluentText>
          <FluentText variant="caption1" color="secondary" numberOfLines={1}>
            {item.artist}
          </FluentText>
        </View>
        <FluentText variant="caption1" color="tertiary">
          {formatDuration(item.duration)}
        </FluentText>
        {isCurrentSong ? (
          <View style={[styles.playingBadge, { backgroundColor: colors.colorBrandBackground }]}>
            <MaterialCommunityIcons name="volume-high" size={FluentIconSize.tiny} color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {currentSong ? (
        <>
          <FluentText variant="title3" style={styles.sectionTitle}>Now Playing</FluentText>
          <Pressable
            style={[styles.currentSongCard, { backgroundColor: colors.colorNeutralBackground3 }]}
            onPress={() => {
              playTapSound();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("NowPlaying", { songId: currentSong.id });
            }}
          >
            <Image source={currentSong.artwork ? { uri: currentSong.artwork } : DEFAULT_ALBUM_ART} style={styles.currentArtwork} />
            <View style={styles.currentInfo}>
              <FluentText variant="body1Strong" numberOfLines={1}>
                {currentSong.title}
              </FluentText>
              <FluentText variant="caption1" color="secondary">
                {currentSong.artist}
              </FluentText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.colorNeutralForeground2} />
          </Pressable>
        </>
      ) : null}
      
      <View style={styles.upNextHeader}>
        <FluentText variant="title3" style={styles.sectionTitle}>
          Up Next ({upNext.length} songs)
        </FluentText>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="playlist-music" size={64} color={colors.colorNeutralForeground2} />
      <FluentText variant="body1" color="secondary" style={styles.emptyText}>
        Your queue is empty
      </FluentText>
      <FluentText variant="caption1" color="secondary" style={styles.emptySubtext}>
        Play a song to start building your queue
      </FluentText>
    </View>
  );

  return (
    <FluentScreenLayout hasBottomNavigation={false} isNestedScreen={true}>
      {selectionMode ? (
        <View style={[styles.selectionHeader, { backgroundColor: colors.colorNeutralBackground3 }]}>
          <Pressable 
            style={styles.selectionButton}
            onPress={exitSelectionMode}
          >
            <MaterialCommunityIcons name="close" size={24} color={colors.colorNeutralForeground1} />
          </Pressable>
          <FluentText variant="body1Strong">
            {selectedSongs.length} selected
          </FluentText>
          <View style={styles.selectionActions}>
            <Pressable 
              style={styles.selectionButton}
              onPress={handleRemoveSelected}
            >
              <MaterialCommunityIcons name="delete-outline" size={24} color={colors.colorPaletteRedForeground1} />
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
          { paddingBottom: insets.bottom + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        getItemLayout={getItemLayout}
      />
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: FluentPadding.l,
    paddingTop: FluentSpacing.l,
  },
  headerSection: {
    marginBottom: FluentSpacing.xl,
  },
  sectionTitle: {
    marginBottom: FluentSpacing.l,
  },
  currentSongCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
    marginBottom: FluentSpacing.xl,
  },
  currentArtwork: {
    width: 56,
    height: 56,
    borderRadius: FluentControlRadius.card,
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
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    marginBottom: FluentSpacing.s,
    minHeight: 72,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  currentSong: {
    borderWidth: 1,
  },
  dragHandle: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: FluentSpacing.xs,
  },
  songIndex: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: FluentControlRadius.card,
    marginLeft: FluentSpacing.xs,
  },
  songInfo: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  playingBadge: {
    width: 32,
    height: 32,
    borderRadius: FluentControlRadius.avatar,
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
    paddingHorizontal: FluentPadding.l,
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
