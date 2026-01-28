import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, TextInput, Pressable, ActivityIndicator, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { FluentText, FluentScreenLayout } from "@/components/fluent";
import { AnimatedCard } from "@/components/AnimatedCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentRadius } from "@/constants/fluent2";
import ArchiveOrgService, { ArchiveOrgTrack, AudioQuality } from "@/services/ArchiveOrgService";

const QUALITY_OPTIONS: { label: string; value: AudioQuality }[] = [
  { label: 'All', value: 'all' },
  { label: '128 kbps', value: '128' },
  { label: '192 kbps', value: '192' },
  { label: '256 kbps', value: '256' },
  { label: '320 kbps', value: '320' },
];

export default function ArchiveOrgScreen() {
  const { theme, isDark } = useThemeContext();
  const [tracks, setTracks] = useState<ArchiveOrgTrack[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<AudioQuality>('all');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showQualityPicker, setShowQualityPicker] = useState(false);

  const loadTracks = useCallback(async (query: string = '', quality: AudioQuality = selectedQuality) => {
    try {
      setLoading(true);
      setError(null);
      const result = await ArchiveOrgService.searchMusic(query, quality, 1, 50);
      setTracks(result.tracks);
    } catch (err) {
      setError("Failed to load music. Check your connection.");
      console.error("Load tracks error:", err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [selectedQuality]);

  useEffect(() => {
    loadTracks();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setSearching(true);
      loadTracks(searchQuery, selectedQuality);
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchQuery, selectedQuality]);

  const playTrack = async (track: ArchiveOrgTrack) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      if (currentlyPlaying === track.id && isPlaying) {
        setIsPlaying(false);
        setCurrentlyPlaying(null);
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.stream_url },
        { shouldPlay: true }
      );

      setSound(newSound);
      setCurrentlyPlaying(track.id);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setCurrentlyPlaying(null);
        }
      });
    } catch (err) {
      console.error("Play error:", err);
      setError("Failed to play track. Try another one.");
    }
  };

  const pauseTrack = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const renderQualityPicker = () => (
    <View style={[styles.qualityPicker, { backgroundColor: theme.cardBackground }]}>
      {QUALITY_OPTIONS.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.qualityOption,
            selectedQuality === option.value && { backgroundColor: theme.primary + '20' },
          ]}
          onPress={() => {
            setSelectedQuality(option.value);
            setShowQualityPicker(false);
          }}
        >
          <FluentText
            variant="body2"
            color={selectedQuality === option.value ? 'brand' : 'primary'}
          >
            {option.label}
          </FluentText>
          {selectedQuality === option.value && (
            <MaterialCommunityIcons
              name="check"
              size={18}
              color={theme.primary}
            />
          )}
        </Pressable>
      ))}
    </View>
  );

  const renderTrack = ({ item }: { item: ArchiveOrgTrack }) => {
    const isCurrentTrack = currentlyPlaying === item.id;
    const isTrackPlaying = isCurrentTrack && isPlaying;

    return (
      <AnimatedCard
        style={[
          styles.trackCard,
          { backgroundColor: theme.cardBackground },
          isCurrentTrack && { borderColor: theme.primary, borderWidth: 1 },
        ]}
        onPress={() => isTrackPlaying ? pauseTrack() : playTrack(item)}
      >
        <View style={styles.trackContent}>
          <View style={[styles.playButton, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons
              name={isTrackPlaying ? "pause" : "play"}
              size={24}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.trackInfo}>
            <FluentText variant="body1" numberOfLines={1}>
              {item.title}
            </FluentText>
            <FluentText variant="body2" color="secondary" numberOfLines={1}>
              {item.artist}
            </FluentText>
            <View style={styles.trackMeta}>
              <FluentText variant="caption1" color="tertiary">
                {ArchiveOrgService.formatBitrate(item.bitrate)}
              </FluentText>
              <FluentText variant="caption1" color="tertiary" style={styles.metaSeparator}>
                •
              </FluentText>
              <FluentText variant="caption1" color="tertiary">
                {ArchiveOrgService.formatDuration(item.duration || 0)}
              </FluentText>
              {item.fileSize > 0 && (
                <>
                  <FluentText variant="caption1" color="tertiary" style={styles.metaSeparator}>
                    •
                  </FluentText>
                  <FluentText variant="caption1" color="tertiary">
                    {ArchiveOrgService.formatFileSize(item.fileSize)}
                  </FluentText>
                </>
              )}
            </View>
          </View>
          {item.licenseUrl && (
            <MaterialCommunityIcons
              name="creative-commons"
              size={20}
              color={theme.textTertiary}
              style={styles.licenseIcon}
            />
          )}
        </View>
      </AnimatedCard>
    );
  };

  return (
    <FluentScreenLayout hasBottomNavigation>
      <View style={styles.container}>
        <View style={styles.header}>
          <FluentText variant="title2">Internet Archive</FluentText>
          <FluentText variant="body2" color="secondary">
            Free, legal music from archive.org
          </FluentText>
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={theme.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search music..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={theme.textSecondary}
                />
              </Pressable>
            )}
          </View>

          <Pressable
            style={[styles.qualityButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => setShowQualityPicker(!showQualityPicker)}
          >
            <MaterialCommunityIcons
              name="tune-variant"
              size={20}
              color={theme.textSecondary}
            />
            <FluentText variant="caption1" style={styles.qualityLabel}>
              {selectedQuality === 'all' ? 'All' : `${selectedQuality}k`}
            </FluentText>
          </Pressable>
        </View>

        {showQualityPicker && renderQualityPicker()}

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.error + '20' }]}>
            <MaterialCommunityIcons name="alert-circle" size={20} color={theme.error} />
            <FluentText variant="body2" style={{ color: theme.error, marginLeft: 8 }}>
              {error}
            </FluentText>
          </View>
        )}

        {(loading || searching) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <FluentText variant="body2" color="secondary" style={styles.loadingText}>
              {searching ? 'Searching...' : 'Loading music...'}
            </FluentText>
          </View>
        ) : tracks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="music-off"
              size={48}
              color={theme.textTertiary}
            />
            <FluentText variant="body1" color="secondary" style={styles.emptyText}>
              No tracks found
            </FluentText>
            <FluentText variant="body2" color="tertiary">
              Try a different search or quality filter
            </FluentText>
          </View>
        ) : (
          <FlatList
            data={tracks}
            renderItem={renderTrack}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: FluentSpacing.m,
  },
  header: {
    marginBottom: FluentSpacing.m,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.s,
    marginBottom: FluentSpacing.m,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentRadius.medium,
    gap: FluentSpacing.s,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? FluentSpacing.xs : 0,
  },
  qualityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s + 4,
    borderRadius: FluentRadius.medium,
    gap: FluentSpacing.xs,
  },
  qualityLabel: {
    minWidth: 28,
    textAlign: 'center',
  },
  qualityPicker: {
    position: 'absolute',
    top: 140,
    right: FluentSpacing.m,
    zIndex: 100,
    borderRadius: FluentRadius.medium,
    padding: FluentSpacing.xs,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentRadius.small,
    minWidth: 120,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    marginBottom: FluentSpacing.m,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: FluentSpacing.m,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: FluentSpacing.s,
  },
  emptyText: {
    marginTop: FluentSpacing.m,
  },
  listContent: {
    paddingBottom: FluentSpacing.xxl,
  },
  separator: {
    height: FluentSpacing.s,
  },
  trackCard: {
    borderRadius: FluentRadius.medium,
    overflow: 'hidden',
  },
  trackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    gap: FluentSpacing.m,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaSeparator: {
    marginHorizontal: FluentSpacing.xs,
  },
  licenseIcon: {
    marginLeft: FluentSpacing.s,
  },
});
