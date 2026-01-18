import React, { useState, useMemo, useCallback, memo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { SongContextMenu } from "@/components/SongContextMenu";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { usePlayer } from "@/hooks/usePlayer";
import {
  FluentSpacing,
  FluentRadius,
  FluentLightColors,
  FluentDarkColors,
  FluentIconSize,
  FluentTypography,
  FluentLayoutSize,
  getShadowStyle,
} from "@/constants/fluent2";
import { ListenStackParamList } from "@/navigation/ListenStackNavigator";
import { PlayableSong } from "@/contexts/PlayerContext";

type NavigationProp = NativeStackNavigationProp<ListenStackParamList>;

const CARD_WIDTH = 140;
const CARD_HEIGHT = 180;
const ARTWORK_SIZE = 140;
const ARTWORK_RADIUS = 8;
const CARD_GAP = FluentSpacing.m;
const QUICK_ACCESS_CARD_HEIGHT = 64;
const CONTENT_PADDING = FluentSpacing.xl;
const SECTION_GAP = FluentSpacing.xxl;

interface QuickAccessItem {
  id: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  onPress: () => void;
}

function ListenScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useThemeContext();
  const { currentSong, isPlaying, playSong, setQueue } = usePlayer();
  const { songs: deviceSongs } = useMediaLibraryContext();
  const screenWidth = Dimensions.get("window").width;

  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const [searchVisible, setSearchVisible] = useState(false);
  const [contextMenuSong, setContextMenuSong] = useState<PlayableSong | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const recentlyPlayed: PlayableSong[] = useMemo(() => {
    return deviceSongs.slice(0, 10);
  }, [deviceSongs]);

  const mostPlayed: PlayableSong[] = useMemo(() => {
    return [...deviceSongs].reverse().slice(0, 10);
  }, [deviceSongs]);

  const quickAccessItems: QuickAccessItem[] = useMemo(() => [
    {
      id: "shuffle",
      title: "Shuffle All",
      icon: "shuffle-variant",
      color: colors.colorBrandForeground1,
      onPress: () => {
        if (deviceSongs.length > 0) {
          const shuffled = [...deviceSongs].sort(() => Math.random() - 0.5);
          setQueue(shuffled);
          playSong(shuffled[0]);
          navigation.navigate("NowPlaying", { songId: shuffled[0].id });
        }
      },
    },
    {
      id: "favorites",
      title: "Favorites",
      icon: "heart",
      color: colors.colorPaletteRedForeground1,
      onPress: () => navigation.navigate("NowPlaying" as any),
    },
    {
      id: "recent",
      title: "Recently Added",
      icon: "clock-outline",
      color: colors.colorPaletteGreenForeground1,
      onPress: () => {},
    },
    {
      id: "downloads",
      title: "Downloads",
      icon: "download",
      color: colors.colorPaletteYellowForeground1,
      onPress: () => {},
    },
  ], [colors, deviceSongs, setQueue, playSong, navigation]);

  const handleSongPress = useCallback((song: PlayableSong, songList: PlayableSong[]) => {
    setQueue(songList);
    playSong(song);
    navigation.navigate("NowPlaying", { songId: song.id });
  }, [setQueue, playSong, navigation]);

  const handleSongContextMenu = useCallback((song: PlayableSong) => {
    setContextMenuSong(song);
    setShowContextMenu(true);
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setShowContextMenu(false);
    setContextMenuSong(null);
  }, []);

  const handleContextMenuSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const handleSearchPress = useCallback(() => {
    setSearchVisible(!searchVisible);
  }, [searchVisible]);

  const renderSectionHeader = useCallback((title: string, onSeeAll?: () => void) => (
    <View style={styles.sectionHeader}>
      <FluentText
        variant="subtitle2"
        style={{ color: colors.colorNeutralForeground1 }}
      >
        {title}
      </FluentText>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <FluentText
            variant="body2"
            style={{ color: colors.colorBrandForeground1 }}
          >
            See All
          </FluentText>
        </Pressable>
      )}
    </View>
  ), [colors]);

  const renderHorizontalCard = useCallback((song: PlayableSong, songList: PlayableSong[]) => (
    <Pressable
      key={song.id}
      style={({ pressed }) => [
        styles.horizontalCard,
        getShadowStyle("shadow2", isDark),
        { opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={() => handleSongPress(song, songList)}
      onLongPress={() => handleSongContextMenu(song)}
    >
      <View style={[styles.artworkContainer, { backgroundColor: colors.colorNeutralBackground3 }]}>
        {song.artwork ? (
          <Image
            source={{ uri: song.artwork }}
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder, { backgroundColor: colors.colorNeutralBackground4 }]}>
            <MaterialCommunityIcons
              name="music"
              size={FluentIconSize.xlarge}
              color={colors.colorNeutralForeground3}
            />
          </View>
        )}
        {currentSong?.id === song.id && isPlaying && (
          <View style={[styles.playingIndicator, { backgroundColor: colors.colorBrandBackground }]}>
            <MaterialCommunityIcons
              name="music-note"
              size={FluentIconSize.small}
              color={colors.colorNeutralForegroundOnBrand}
            />
          </View>
        )}
      </View>
      <View style={styles.cardTextContainer}>
        <FluentText
          variant="body2"
          numberOfLines={1}
          style={{ color: colors.colorNeutralForeground1 }}
        >
          {song.title}
        </FluentText>
        <FluentText
          variant="caption1"
          numberOfLines={1}
          style={{ color: colors.colorNeutralForeground2 }}
        >
          {song.artist}
        </FluentText>
      </View>
    </Pressable>
  ), [colors, isDark, currentSong?.id, isPlaying, handleSongPress, handleSongContextMenu]);

  const renderQuickAccessCard = useCallback((item: QuickAccessItem) => (
    <Pressable
      key={item.id}
      style={({ pressed }) => [
        styles.quickAccessCard,
        { backgroundColor: colors.colorNeutralBackground2 },
        getShadowStyle("shadow2", isDark),
        { opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={item.onPress}
    >
      <View style={[styles.quickAccessIcon, { backgroundColor: item.color + "20" }]}>
        <MaterialCommunityIcons
          name={item.icon}
          size={FluentIconSize.large}
          color={item.color}
        />
      </View>
      <FluentText
        variant="body2"
        numberOfLines={1}
        style={{ color: colors.colorNeutralForeground1, flex: 1 }}
      >
        {item.title}
      </FluentText>
    </Pressable>
  ), [colors, isDark]);

  const renderHorizontalSection = useCallback((songs: PlayableSong[]) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalScrollContent}
      decelerationRate="fast"
      snapToInterval={CARD_WIDTH + CARD_GAP}
    >
      {songs.map((song) => renderHorizontalCard(song, songs))}
    </ScrollView>
  ), [renderHorizontalCard]);

  const quickAccessGridWidth = (screenWidth - CONTENT_PADDING * 2 - CARD_GAP) / 2;

  const bottomPadding = tabBarHeight + FluentLayoutSize.miniPlayerHeight + FluentSpacing.xl + insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.colorNeutralBackground1 }]}>
      <View style={[styles.topBar, { paddingTop: insets.top, backgroundColor: colors.colorNeutralBackground1 }]}>
        <FluentText
          variant="title2"
          style={{ color: colors.colorNeutralForeground1 }}
        >
          Listen
        </FluentText>
        <Pressable
          onPress={handleSearchPress}
          hitSlop={8}
          style={({ pressed }) => [
            styles.searchButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={FluentIconSize.medium}
            color={colors.colorNeutralForeground1}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          {renderSectionHeader("Recently Played", () => {})}
          {recentlyPlayed.length > 0 ? (
            renderHorizontalSection(recentlyPlayed)
          ) : (
            <View style={styles.emptySection}>
              <FluentText variant="body2" style={{ color: colors.colorNeutralForeground3 }}>
                No recently played songs
              </FluentText>
            </View>
          )}
        </View>

        <View style={styles.section}>
          {renderSectionHeader("Quick Access")}
          <View style={styles.quickAccessGrid}>
            {quickAccessItems.map((item) => (
              <View key={item.id} style={{ width: quickAccessGridWidth }}>
                {renderQuickAccessCard(item)}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          {renderSectionHeader("Most Played", () => {})}
          {mostPlayed.length > 0 ? (
            renderHorizontalSection(mostPlayed)
          ) : (
            <View style={styles.emptySection}>
              <FluentText variant="body2" style={{ color: colors.colorNeutralForeground3 }}>
                No most played songs yet
              </FluentText>
            </View>
          )}
        </View>
      </ScrollView>

      <SongContextMenu
        visible={showContextMenu}
        song={contextMenuSong}
        onClose={handleContextMenuClose}
        onSuccess={handleContextMenuSuccess}
      />

      {successMessage ? (
        <View style={[styles.successToast, { backgroundColor: colors.colorPaletteGreenForeground1 }, getShadowStyle("shadow4", isDark)]}>
          <MaterialCommunityIcons name="check-circle" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
          <FluentText variant="caption1" style={{ color: colors.colorNeutralForegroundOnBrand, marginLeft: FluentSpacing.s, flex: 1 }}>
            {successMessage}
          </FluentText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    height: FluentLayoutSize.topBarHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: CONTENT_PADDING,
  },
  searchButton: {
    padding: FluentSpacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: FluentSpacing.l,
  },
  section: {
    marginBottom: SECTION_GAP,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: CONTENT_PADDING,
    marginBottom: FluentSpacing.m,
  },
  horizontalScrollContent: {
    paddingHorizontal: CONTENT_PADDING,
    gap: CARD_GAP,
  },
  horizontalCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: FluentRadius.xLarge,
    overflow: "hidden",
  },
  artworkContainer: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: ARTWORK_RADIUS,
    overflow: "hidden",
  },
  artwork: {
    width: "100%",
    height: "100%",
    borderRadius: ARTWORK_RADIUS,
  },
  artworkPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  playingIndicator: {
    position: "absolute",
    bottom: FluentSpacing.xs,
    right: FluentSpacing.xs,
    width: 24,
    height: 24,
    borderRadius: FluentRadius.circular,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextContainer: {
    paddingTop: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.xxs,
  },
  quickAccessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: CONTENT_PADDING,
    gap: CARD_GAP,
  },
  quickAccessCard: {
    height: QUICK_ACCESS_CARD_HEIGHT,
    borderRadius: FluentRadius.xLarge,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    gap: FluentSpacing.m,
  },
  quickAccessIcon: {
    width: 28,
    height: 28,
    borderRadius: FluentRadius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySection: {
    paddingHorizontal: CONTENT_PADDING,
    paddingVertical: FluentSpacing.xxl,
    alignItems: "center",
  },
  successToast: {
    position: "absolute",
    bottom: FluentSpacing.xxxxxxl + FluentSpacing.xxxl,
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.l,
    borderRadius: FluentRadius.large,
  },
});

export default memo(ListenScreen);
