import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator, Platform, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useToast } from "@/contexts/ToastContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import ArchiveOrgService, { ArchiveOrgTrack, AudioQuality } from "@/services/ArchiveOrgService";

const CONSENT_STORAGE_KEY = '@discover_consent_accepted';

const QUALITY_OPTIONS: { label: string; value: AudioQuality }[] = [
  { label: 'All', value: 'all' },
  { label: '128k', value: '128' },
  { label: '192k', value: '192' },
  { label: '256k', value: '256' },
  { label: '320k', value: '320' },
];

export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, isDark } = useThemeContext();
  const { playSong } = usePlayerContext();
  const { showSuccess, showError } = useToast();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<ArchiveOrgTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<AudioQuality>('all');
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [showConsentModal, setShowConsentModal] = useState(true);

  useEffect(() => {
    const checkConsent = async () => {
      try {
        const consentAccepted = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
        if (consentAccepted === 'true') {
          setShowConsentModal(false);
        }
      } catch (error) {
        console.error('[ArchiveScreen] Error checking consent:', error);
      }
    };
    checkConsent();
  }, []);

  const handleAcceptConsent = async () => {
    try {
      await AsyncStorage.setItem(CONSENT_STORAGE_KEY, 'true');
      setShowConsentModal(false);
    } catch (error) {
      console.error('[ArchiveScreen] Error saving consent:', error);
      setShowConsentModal(false);
    }
  };

  const handleDeclineConsent = () => {
    setShowConsentModal(false);
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ListenTab',
      })
    );
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const result = await ArchiveOrgService.searchMusic(searchQuery, selectedQuality, 10);
      setTracks(result.tracks);
      if (result.tracks.length === 0) {
        showError("No results found. Try different keywords.");
      }
    } catch (error) {
      console.error('[ArchiveScreen] Search error:', error);
      showError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedQuality, showError]);

  const playTrack = useCallback((track: ArchiveOrgTrack) => {
    const playableSong = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || 'Online Music',
      duration: (track.duration || 0) * 1000,
      audioUrl: track.stream_url,
      artwork: undefined,
    };
    
    playSong(playableSong);
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ListenTab',
        params: {
          screen: 'NowPlaying',
          params: { songId: playableSong.id },
        },
      })
    );
  }, [playSong, navigation]);

  const addToLibrary = async (track: ArchiveOrgTrack) => {
    setAddingIds(prev => new Set(prev).add(track.id));
    try {
      await ArchiveOrgService.addToFavorites(track);
      showSuccess(`Added "${track.title}" to favorites`);
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

  const renderTrack = ({ item }: { item: ArchiveOrgTrack }) => {
    const isAdding = addingIds.has(item.id);

    return (
      <Pressable 
        style={[styles.trackCard, { backgroundColor: colors.colorNeutralBackground2 }]}
        onPress={() => playTrack(item)}
      >
        <View style={[styles.playIcon, { backgroundColor: theme.primary }]}>
          <MaterialCommunityIcons name="play" size={20} color="#FFFFFF" />
        </View>
        
        <View style={styles.trackInfo}>
          <FluentText variant="body1" numberOfLines={1} style={{ fontWeight: '600' }}>
            {item.title}
          </FluentText>
          <FluentText variant="body2" color="secondary" numberOfLines={1}>
            {item.artist}
          </FluentText>
          <View style={styles.trackMeta}>
            <View style={[styles.webBadge, { backgroundColor: theme.primary + '20' }]}>
              <MaterialCommunityIcons name="web" size={10} color={theme.primary} />
              <FluentText variant="caption2" style={{ color: theme.primary, marginLeft: 2 }}>
                Web
              </FluentText>
            </View>
            <FluentText variant="caption1" color="tertiary">
              {ArchiveOrgService.formatBitrate(item.bitrate)} • {ArchiveOrgService.formatDuration(item.duration || 0)}
            </FluentText>
          </View>
        </View>

        <Pressable
          style={[styles.addButton, { backgroundColor: theme.primary + '15' }]}
          onPress={(e) => {
            e.stopPropagation();
            addToLibrary(item);
          }}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <MaterialCommunityIcons name="heart-plus-outline" size={22} color={theme.primary} />
          )}
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.colorNeutralBackground1 }]}>
      <Modal
        visible={showConsentModal}
        transparent
        animationType="fade"
        onRequestClose={handleDeclineConsent}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.colorNeutralBackground1 }]}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="compass" size={48} color={theme.primary} />
              <FluentText variant="title2" style={styles.modalTitle}>
                Open Music Discovery
              </FluentText>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <FluentText variant="body2" color="secondary" style={styles.modalText}>
                This feature allows you to discover and play music from publicly available Creative Commons and Public Domain sources. By proceeding, you acknowledge that:
              </FluentText>
              
              <View style={styles.bulletPoint}>
                <FluentText variant="body2" color="secondary">•</FluentText>
                <FluentText variant="body2" color="secondary" style={styles.bulletText}>
                  All content is freely and legally available for personal listening
                </FluentText>
              </View>
              
              <View style={styles.bulletPoint}>
                <FluentText variant="body2" color="secondary">•</FluentText>
                <FluentText variant="body2" color="secondary" style={styles.bulletText}>
                  We respect the rights of content creators and only access authorized sources
                </FluentText>
              </View>
              
              <View style={styles.bulletPoint}>
                <FluentText variant="body2" color="secondary">•</FluentText>
                <FluentText variant="body2" color="secondary" style={styles.bulletText}>
                  No unauthorized or copyrighted content is accessed through this service
                </FluentText>
              </View>
              
              <FluentText variant="body2" color="tertiary" style={styles.modalDisclaimer}>
                We do not encourage or support any form of unauthorized music streaming. This service is provided for educational and personal enjoyment purposes.
              </FluentText>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.declineButton, { borderColor: colors.colorNeutralStroke1 }]}
                onPress={handleDeclineConsent}
              >
                <FluentText variant="body2" color="secondary">
                  No Thanks
                </FluentText>
              </Pressable>
              
              <Pressable
                style={[styles.modalButton, styles.acceptButton, { backgroundColor: theme.primary }]}
                onPress={handleAcceptConsent}
              >
                <FluentText variant="body2" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  I Understand
                </FluentText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.searchSection}>
        <FluentText variant="caption1" color="secondary" style={styles.subtitle}>
          Discover free music from public domain and Creative Commons sources
        </FluentText>

        <View style={styles.searchRow}>
          <View style={[styles.searchContainer, { backgroundColor: colors.colorNeutralBackground2 }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search songs or artists..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus={!showConsentModal}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <MaterialCommunityIcons name="close-circle" size={18} color={theme.textSecondary} />
              </Pressable>
            )}
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
                { 
                  backgroundColor: selectedQuality === option.value 
                    ? theme.primary 
                    : colors.colorNeutralBackground2 
                },
              ]}
              onPress={() => setSelectedQuality(option.value)}
            >
              <FluentText
                variant="caption1"
                style={{ 
                  color: selectedQuality === option.value ? '#FFFFFF' : theme.text,
                  fontWeight: selectedQuality === option.value ? '600' : '400',
                }}
              >
                {option.label}
              </FluentText>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <FluentText variant="body2" color="secondary" style={styles.statusText}>
            Searching...
          </FluentText>
        </View>
      ) : tracks.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="compass-outline" size={64} color={theme.textTertiary} />
          <FluentText variant="subtitle1" color="secondary" style={styles.statusText}>
            {searchQuery ? "No results found" : "Discover free music"}
          </FluentText>
          <FluentText variant="caption1" color="tertiary" style={styles.hintText}>
            Search for artist names, song titles, or genres from public domain sources
          </FluentText>
        </View>
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderTrack}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <View style={[styles.footer, { borderTopColor: colors.colorNeutralStroke2, paddingBottom: insets.bottom + FluentSpacing.s }]}>
        <MaterialCommunityIcons name="creative-commons" size={14} color={theme.textTertiary} />
        <FluentText variant="caption2" color="tertiary">
          All content is Creative Commons or Public Domain
        </FluentText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: FluentSpacing.l,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: FluentRadius.large,
    padding: FluentSpacing.l,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: FluentSpacing.m,
  },
  modalTitle: {
    marginTop: FluentSpacing.m,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalBody: {
    marginBottom: FluentSpacing.l,
  },
  modalText: {
    marginBottom: FluentSpacing.m,
    lineHeight: 22,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: FluentSpacing.s,
    paddingLeft: FluentSpacing.s,
  },
  bulletText: {
    flex: 1,
    marginLeft: FluentSpacing.s,
    lineHeight: 22,
  },
  modalDisclaimer: {
    marginTop: FluentSpacing.m,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: FluentSpacing.m,
  },
  modalButton: {
    flex: 1,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    borderWidth: 1,
  },
  acceptButton: {},
  searchSection: {
    padding: FluentSpacing.m,
    gap: FluentSpacing.s,
  },
  subtitle: {
    marginBottom: FluentSpacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.s,
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
    width: 48,
    height: 48,
    borderRadius: FluentRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityRow: {
    flexDirection: 'row',
    gap: FluentSpacing.xs,
    marginTop: FluentSpacing.xs,
  },
  qualityChip: {
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentRadius.circular,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.xl,
  },
  statusText: {
    marginTop: FluentSpacing.m,
    textAlign: 'center',
  },
  hintText: {
    marginTop: FluentSpacing.xs,
    textAlign: 'center',
  },
  listContent: {
    padding: FluentSpacing.m,
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
  playIcon: {
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
    gap: FluentSpacing.s,
    marginTop: 4,
  },
  webBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    borderTopWidth: 1,
    gap: FluentSpacing.xs,
  },
});
