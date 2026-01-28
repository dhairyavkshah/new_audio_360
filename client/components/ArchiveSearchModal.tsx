import React, { useState, useCallback } from "react";
import { View, StyleSheet, Modal, TextInput, FlatList, Pressable, ActivityIndicator, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { FluentSpacing, FluentRadius } from "@/constants/fluent2";
import ArchiveOrgService, { ArchiveOrgTrack, AudioQuality } from "@/services/ArchiveOrgService";

interface ArchiveSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onTrackAdded?: () => void;
}

const QUALITY_OPTIONS: { label: string; value: AudioQuality }[] = [
  { label: 'All', value: 'all' },
  { label: '128k', value: '128' },
  { label: '192k', value: '192' },
  { label: '256k', value: '256' },
  { label: '320k', value: '320' },
];

export function ArchiveSearchModal({ visible, onClose, onTrackAdded }: ArchiveSearchModalProps) {
  const { theme } = useThemeContext();
  const { showSuccess, showError } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<ArchiveOrgTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<AudioQuality>('all');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const result = await ArchiveOrgService.searchMusic(searchQuery, selectedQuality, 10);
      setTracks(result.tracks);
    } catch (error) {
      showError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedQuality, showError]);

  const playPreview = async (track: ArchiveOrgTrack) => {
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
      showError("Failed to play preview");
    }
  };

  const addToLibrary = async (track: ArchiveOrgTrack) => {
    setAddingIds(prev => new Set(prev).add(track.id));
    try {
      await ArchiveOrgService.addToFavorites(track);
      showSuccess(`Added "${track.title}" to library`);
      onTrackAdded?.();
    } catch (error) {
      showError("Failed to add song");
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  };

  const handleClose = useCallback(async () => {
    if (sound) {
      await sound.unloadAsync();
    }
    setCurrentlyPlaying(null);
    setIsPlaying(false);
    setTracks([]);
    setSearchQuery("");
    onClose();
  }, [sound, onClose]);

  const renderTrack = ({ item }: { item: ArchiveOrgTrack }) => {
    const isCurrentTrack = currentlyPlaying === item.id;
    const isTrackPlaying = isCurrentTrack && isPlaying;
    const isAdding = addingIds.has(item.id);

    return (
      <View style={[styles.trackCard, { backgroundColor: theme.cardBackground }]}>
        <Pressable
          style={[styles.playButton, { backgroundColor: theme.primary }]}
          onPress={() => playPreview(item)}
        >
          <MaterialCommunityIcons
            name={isTrackPlaying ? "pause" : "play"}
            size={20}
            color="#FFFFFF"
          />
        </Pressable>
        
        <View style={styles.trackInfo}>
          <FluentText variant="body2" numberOfLines={1}>
            {item.title}
          </FluentText>
          <FluentText variant="caption1" color="secondary" numberOfLines={1}>
            {item.artist}
          </FluentText>
          <View style={styles.trackMeta}>
            <MaterialCommunityIcons name="web" size={12} color={theme.textTertiary} />
            <FluentText variant="caption2" color="tertiary" style={styles.metaText}>
              {ArchiveOrgService.formatBitrate(item.bitrate)} • {ArchiveOrgService.formatDuration(item.duration || 0)}
            </FluentText>
          </View>
        </View>

        <Pressable
          style={[styles.addButton, { backgroundColor: theme.primary + '20' }]}
          onPress={() => addToLibrary(item)}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <MaterialCommunityIcons name="plus" size={20} color={theme.primary} />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <FluentText variant="title2">Internet Archive</FluentText>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        <FluentText variant="caption1" color="secondary" style={styles.subtitle}>
          Search free, legal music from archive.org
        </FluentText>

        <View style={styles.searchRow}>
          <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search songs or artists..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <Pressable
            style={[styles.searchButton, { backgroundColor: theme.primary }]}
            onPress={handleSearch}
          >
            <MaterialCommunityIcons name="magnify" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.qualityRow}>
          {QUALITY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.qualityChip,
                { backgroundColor: selectedQuality === option.value ? theme.primary : theme.cardBackground },
              ]}
              onPress={() => setSelectedQuality(option.value)}
            >
              <FluentText
                variant="caption1"
                style={{ color: selectedQuality === option.value ? '#FFFFFF' : theme.text }}
              >
                {option.label}
              </FluentText>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <FluentText variant="body2" color="secondary" style={styles.loadingText}>
              Searching...
            </FluentText>
          </View>
        ) : tracks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="music-box-outline" size={48} color={theme.textTertiary} />
            <FluentText variant="body2" color="secondary" style={styles.emptyText}>
              {searchQuery ? "No results found" : "Search for music above"}
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

        <View style={[styles.footer, { borderTopColor: theme.cardBorder }]}>
          <MaterialCommunityIcons name="creative-commons" size={16} color={theme.textTertiary} />
          <FluentText variant="caption2" color="tertiary" style={styles.footerText}>
            All content is Creative Commons or Public Domain
          </FluentText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: FluentSpacing.m,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: FluentSpacing.xs,
  },
  closeButton: {
    padding: FluentSpacing.xs,
  },
  subtitle: {
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
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: FluentRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityRow: {
    flexDirection: 'row',
    gap: FluentSpacing.xs,
    marginBottom: FluentSpacing.m,
  },
  qualityChip: {
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentRadius.circular,
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
    marginTop: FluentSpacing.s,
  },
  listContent: {
    paddingBottom: FluentSpacing.l,
  },
  separator: {
    height: FluentSpacing.s,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    gap: FluentSpacing.m,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    marginLeft: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: FluentSpacing.m,
    borderTopWidth: 1,
    gap: FluentSpacing.xs,
  },
  footerText: {
    marginLeft: FluentSpacing.xs,
  },
});
