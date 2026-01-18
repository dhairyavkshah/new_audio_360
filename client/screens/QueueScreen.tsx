import React, { useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import {
  FluentSpacing,
  FluentPadding,
  FluentRadius,
  FluentLightColors,
  FluentDarkColors,
  FluentLayoutSize,
  FluentTouchTarget,
  FluentIconSize,
  FluentBorderWidth,
} from "@/constants/fluent2";
import { Song } from "@/lib/data";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

export default function QueueScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { playTapSound } = useUiSound();
  const { queue, currentSong, playSong, removeFromQueue, clearQueue } = usePlayerContext();

  const handleSongPress = useCallback((song: Song) => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    playSong(song);
    navigation.navigate("NowPlaying", { songId: song.id });
  }, [playSong, navigation, playTapSound]);

  const handleRemoveSong = useCallback((songId: string) => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    removeFromQueue([songId]);
  }, [removeFromQueue, playTapSound]);

  const handleClearAll = useCallback(() => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    clearQueue();
  }, [clearQueue, playTapSound]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentIndex = currentSong ? queue.findIndex(s => s.id === currentSong.id) : -1;
  const upNext = currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue;

  const DRAG_HANDLE_WIDTH = FluentTouchTarget.minimum;

  const getItemLayout = useCallback(
    (_data: ArrayLike<Song> | null | undefined, index: number) => ({
      length: FluentLayoutSize.listItemRich,
      offset: FluentLayoutSize.listItemRich * index,
      index,
    }),
    []
  );

  const renderQueueItem = ({ item, index }: { item: Song; index: number }) => {
    return (
      <View>
        <Pressable
          style={styles.queueItem}
          onPress={() => handleSongPress(item)}
        >
          <View style={styles.dragHandle}>
            <MaterialCommunityIcons
              name="drag"
              size={FluentIconSize.medium}
              color={colors.colorNeutralForeground4}
            />
          </View>
          <Image
            source={{ uri: item.artwork }}
            style={styles.artwork}
          />
          <View style={styles.songInfo}>
            <FluentText variant="body2" numberOfLines={1}>
              {item.title}
            </FluentText>
            <FluentText variant="caption1" color="secondary" numberOfLines={1}>
              {item.artist}
            </FluentText>
          </View>
          <FluentText variant="caption1" color="secondary" style={styles.duration}>
            {formatDuration(item.duration)}
          </FluentText>
          <Pressable
            style={styles.removeButton}
            onPress={() => handleRemoveSong(item.id)}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="close"
              size={FluentIconSize.regular}
              color={colors.colorNeutralForeground3}
            />
          </Pressable>
        </Pressable>
        {index < upNext.length - 1 && (
          <View style={[styles.divider, { marginLeft: DRAG_HANDLE_WIDTH, backgroundColor: colors.colorNeutralStroke2 }]} />
        )}
      </View>
    );
  };

  const renderNowPlaying = () => {
    if (!currentSong) return null;

    return (
      <View style={styles.section}>
        <FluentText variant="caption1" color="secondary" style={styles.sectionHeader}>
          NOW PLAYING
        </FluentText>
        <View>
          <Pressable
            style={[
              styles.queueItem,
              styles.nowPlayingItem,
              { backgroundColor: colors.colorBrandBackground + "1A" },
            ]}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              navigation.navigate("NowPlaying", { songId: currentSong.id });
            }}
          >
            <View style={[styles.accentBar, { backgroundColor: colors.colorBrandBackground }]} />
            <View style={styles.dragHandle}>
              <MaterialCommunityIcons
                name="drag"
                size={FluentIconSize.medium}
                color={colors.colorNeutralForeground4}
              />
            </View>
            <Image
              source={{ uri: currentSong.artwork }}
              style={styles.artwork}
            />
            <View style={styles.songInfo}>
              <FluentText
                variant="body2"
                numberOfLines={1}
                style={{ color: colors.colorBrandForeground1 }}
              >
                {currentSong.title}
              </FluentText>
              <FluentText variant="caption1" color="secondary" numberOfLines={1}>
                {currentSong.artist}
              </FluentText>
            </View>
            <FluentText variant="caption1" color="secondary" style={styles.duration}>
              {formatDuration(currentSong.duration)}
            </FluentText>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {renderNowPlaying()}
      {upNext.length > 0 && (
        <FluentText variant="caption1" color="secondary" style={styles.sectionHeader}>
          UP NEXT
        </FluentText>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="playlist-music"
        size={FluentIconSize.xxlarge}
        color={colors.colorNeutralForeground4}
      />
      <FluentText variant="body2" color="secondary" style={styles.emptyText}>
        Your queue is empty
      </FluentText>
      <FluentText variant="caption1" color="secondary" style={styles.emptySubtext}>
        Add songs to start listening
      </FluentText>
    </View>
  );

  const renderTopBar = () => (
    <View style={[styles.topBar, { borderBottomColor: colors.colorNeutralStroke2 }]}>
      <FluentText variant="subtitle2">Queue</FluentText>
      {queue.length > 0 && (
        <Pressable
          style={styles.clearAllButton}
          onPress={handleClearAll}
        >
          <FluentText variant="body2" style={{ color: colors.colorPaletteRedForeground1 }}>
            Clear All
          </FluentText>
        </Pressable>
      )}
    </View>
  );

  return (
    <FluentScreenLayout hasBottomNavigation={false} isNestedScreen={true}>
      {renderTopBar()}
      <FlatList
        data={upNext}
        renderItem={renderQueueItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!currentSong ? renderEmpty : null}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + FluentLayoutSize.miniPlayerHeight + FluentLayoutSize.bottomNavHeight },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
        updateCellsBatchingPeriod={50}
        getItemLayout={getItemLayout}
      />
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: FluentLayoutSize.topBarHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: FluentPadding.l,
    borderBottomWidth: FluentBorderWidth.thin,
  },
  clearAllButton: {
    height: FluentTouchTarget.minimum,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.s,
  },
  listContent: {
    paddingTop: FluentSpacing.s,
  },
  section: {
    marginBottom: FluentSpacing.s,
  },
  sectionHeader: {
    paddingHorizontal: FluentPadding.l,
    marginBottom: FluentSpacing.s,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  queueItem: {
    height: FluentLayoutSize.listItemRich,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: FluentPadding.l,
  },
  nowPlayingItem: {
    position: "relative",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  dragHandle: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    justifyContent: "center",
    alignItems: "center",
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.medium,
    marginLeft: FluentSpacing.s,
  },
  songInfo: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    justifyContent: "center",
  },
  duration: {
    marginLeft: FluentSpacing.s,
  },
  removeButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: FluentSpacing.xs,
  },
  divider: {
    height: FluentBorderWidth.thin,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: FluentSpacing.xxxxxxl,
  },
  emptyText: {
    marginTop: FluentSpacing.l,
  },
  emptySubtext: {
    marginTop: FluentSpacing.xs,
    textAlign: "center",
  },
});
