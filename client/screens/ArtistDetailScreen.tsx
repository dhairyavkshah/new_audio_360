import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, FlatList, Image, ImageBackground, Pressable } from "react-native";
import { useRoute, RouteProp, useNavigation, CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentScreenLayout, FluentText, FluentButton } from "@/components/fluent";
import { SongCard } from "@/components/SongCard";
import { EmptyState } from "@/components/EmptyState";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext, PlayableSong } from "@/contexts/PlayerContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { 
  FluentSpacing, 
  FluentLightColors, 
  FluentDarkColors,
  FluentTouchTarget,
  FluentIconSize,
  getShadowStyle,
} from "@/constants/fluent2";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";

type ArtistDetailRouteProp = RouteProp<LibraryStackParamList, "ArtistDetail">;

const HERO_HEIGHT = 280;
const ARTWORK_SIZE = 120;
const BLUR_RADIUS = 50;

export default function ArtistDetailScreen() {
  const route = useRoute<ArtistDetailRouteProp>();
  const { artist } = route.params;
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { playSong, currentSong, setQueue } = usePlayerContext();
  const { songs: deviceSongs, isOnboardingComplete } = useMediaLibraryContext();
  const tabBarHeight = useSafeTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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

  const albumCount = useMemo(() => {
    const albums = new Set(artistSongs.map(song => song.album));
    return albums.size;
  }, [artistSongs]);

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

  const handlePlayAll = useCallback(() => {
    if (artistSongs.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setQueue(artistSongs);
      playSong(artistSongs[0]);
      navigation.dispatch(
        CommonActions.navigate({
          name: "ListenTab",
          params: {
            screen: "NowPlaying",
            params: { songId: artistSongs[0].id },
          },
        })
      );
    }
  }, [artistSongs, setQueue, playSong, navigation]);

  const handleShuffle = useCallback(() => {
    if (artistSongs.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const shuffled = [...artistSongs].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      playSong(shuffled[0]);
      navigation.dispatch(
        CommonActions.navigate({
          name: "ListenTab",
          params: {
            screen: "NowPlaying",
            params: { songId: shuffled[0].id },
          },
        })
      );
    }
  }, [artistSongs, setQueue, playSong, navigation]);

  const handleGoBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  const renderHeader = () => (
    <View>
      <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
        <ImageBackground
          source={{ uri: artist.artwork }}
          style={styles.backdrop}
          blurRadius={BLUR_RADIUS}
        >
          <View style={[styles.backdropOverlay, { opacity: 0.85 }]}>
            <LinearGradient
              colors={['transparent', colors.colorNeutralBackground1]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </View>
        </ImageBackground>

        <Pressable
          onPress={handleGoBack}
          style={[
            styles.backButton,
            { 
              top: insets.top + FluentSpacing.l,
              backgroundColor: `${colors.colorNeutralBackground1}80`,
            }
          ]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons 
            name="chevron-left" 
            size={FluentIconSize.medium} 
            color={colors.colorNeutralForeground1} 
          />
        </Pressable>

        <View style={styles.heroContent}>
          <Image 
            source={{ uri: artist.artwork }} 
            style={[
              styles.artwork,
              getShadowStyle('shadow8', isDark),
            ]} 
          />
          <View style={styles.textInfo}>
            <FluentText variant="title2" style={styles.title}>
              {artist.name}
            </FluentText>
            <FluentText variant="body2" color="secondary" style={styles.subtitle}>
              {albumCount} {albumCount === 1 ? "album" : "albums"} • {artistSongs.length} {artistSongs.length === 1 ? "song" : "songs"}
            </FluentText>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <FluentButton
          variant="primary"
          size="large"
          iconBefore={<MaterialCommunityIcons name="play" />}
          onPress={handlePlayAll}
          style={styles.actionButton}
        >
          Play All
        </FluentButton>
        <FluentButton
          variant="outline"
          size="large"
          iconBefore={<MaterialCommunityIcons name="shuffle" />}
          onPress={handleShuffle}
          style={styles.actionButton}
        >
          Shuffle
        </FluentButton>
      </View>

      <View style={styles.sectionHeader}>
        <FluentText variant="subtitle2" style={styles.sectionTitle}>
          Songs
        </FluentText>
      </View>
    </View>
  );

  const renderSong = ({ item }: { item: PlayableSong }) => (
    <View style={styles.songItem}>
      <SongCard
        song={item}
        onPress={() => handlePlaySong(item)}
        isPlaying={currentSong?.id === item.id}
      />
    </View>
  );

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true} edges={[]}>
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
    flexGrow: 1,
  },
  heroContainer: {
    width: '100%',
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    left: FluentSpacing.l,
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: FluentSpacing.xxxl,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: ARTWORK_SIZE / 2,
  },
  textInfo: {
    marginTop: FluentSpacing.l,
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.xl,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: FluentSpacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: FluentSpacing.l,
    paddingVertical: FluentSpacing.l,
    paddingHorizontal: FluentSpacing.xl,
  },
  actionButton: {
    flex: 1,
    maxWidth: 160,
  },
  sectionHeader: {
    paddingHorizontal: FluentSpacing.xl,
    paddingTop: FluentSpacing.l,
    paddingBottom: FluentSpacing.s,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  songItem: {
    paddingHorizontal: FluentSpacing.xl,
  },
});
