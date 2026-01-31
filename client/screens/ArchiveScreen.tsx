import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Platform, Modal, ScrollView, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FluentText, FluentScreenLayout } from "@/components/fluent";
import { FluentTopBar } from "@/components/FluentTopBar";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useToast } from "@/contexts/ToastContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentIconSize, FluentTouchTarget, FluentControlRadius } from "@/constants/fluent2";
import ArchiveOrgService, { ArchiveOrgTrack, AudioQuality } from "@/services/ArchiveOrgService";
import SoundCloudService, { SoundCloudTrack } from "@/services/SoundCloudService";

const CONSENT_STORAGE_KEY = '@discover_consent_accepted';

type UnifiedTrack = (ArchiveOrgTrack | SoundCloudTrack) & {
  source: 'archive.org' | 'soundcloud';
};

const QUALITY_OPTIONS: { label: string; value: AudioQuality }[] = [
  { label: 'All', value: 'all' },
  { label: '128k', value: '128' },
  { label: '192k', value: '192' },
  { label: '256k', value: '256' },
  { label: '320k', value: '320' },
];

export default function ArchiveScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useThemeContext();
  const { playSong } = usePlayerContext();
  const { showSuccess, showError } = useToast();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
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
      const [archiveResult, soundcloudResult] = await Promise.allSettled([
        ArchiveOrgService.searchMusic(searchQuery, selectedQuality, 10),
        SoundCloudService.searchTracks(searchQuery, 10),
      ]);

      const archiveTracks: UnifiedTrack[] = archiveResult.status === 'fulfilled' 
        ? archiveResult.value.tracks as UnifiedTrack[]
        : [];
      
      const soundcloudTracks: UnifiedTrack[] = soundcloudResult.status === 'fulfilled'
        ? soundcloudResult.value.tracks as UnifiedTrack[]
        : [];

      const combined = [...soundcloudTracks, ...archiveTracks];
      
      setTracks(combined);
      
      if (combined.length === 0) {
        showError("No results found. Try different keywords.");
      }

      if (archiveResult.status === 'rejected') {
        console.log('[ArchiveScreen] Archive search error:', archiveResult.reason);
      }
      if (soundcloudResult.status === 'rejected') {
        console.log('[ArchiveScreen] SoundCloud search error:', soundcloudResult.reason);
      }
    } catch (error) {
      console.error('[ArchiveScreen] Search error:', error);
      showError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedQuality, showError]);

  const playTrack = useCallback((track: UnifiedTrack) => {
    // For SoundCloud tracks from search results, the stream_url already contains
    // a fresh token since it was just fetched. For stored/cached SoundCloud tracks
    // (from favorites), use SoundCloudService.storedToPlayable() which retrieves
    // a fresh tokenized URL via getStreamUrl() to ensure playback doesn't fail due
    // to token expiry.
    const duration = track.source === 'soundcloud' 
      ? (track as SoundCloudTrack).duration * 1000 
      : ((track as ArchiveOrgTrack).duration || 0) * 1000;

    const artwork = track.source === 'soundcloud' 
      ? (track as SoundCloudTrack).artwork_url || undefined
      : undefined;

    const playableSong = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || 'Online Music',
      duration: duration,
      audioUrl: track.stream_url,
      artwork: artwork,
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

  const addToLibrary = async (track: UnifiedTrack) => {
    setAddingIds(prev => new Set(prev).add(track.id));
    try {
      if (track.source === 'soundcloud') {
        await SoundCloudService.addToFavorites(track as SoundCloudTrack);
      } else {
        await ArchiveOrgService.addToFavorites(track as ArchiveOrgTrack);
      }
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

  const formatDuration = (track: UnifiedTrack): string => {
    if (track.source === 'soundcloud') {
      return SoundCloudService.formatDurationFromSeconds((track as SoundCloudTrack).duration);
    }
    return ArchiveOrgService.formatDuration((track as ArchiveOrgTrack).duration || 0);
  };

  const formatMeta = (track: UnifiedTrack): string => {
    if (track.source === 'soundcloud') {
      const sc = track as SoundCloudTrack;
      return `${SoundCloudService.formatPlaybackCount(sc.playbackCount)} plays • ${formatDuration(track)}`;
    }
    const archive = track as ArchiveOrgTrack;
    return `${ArchiveOrgService.formatBitrate(archive.bitrate)} • ${formatDuration(track)}`;
  };

  const renderTrack = ({ item }: { item: UnifiedTrack }) => {
    const isAdding = addingIds.has(item.id);
    const isSoundCloud = item.source === 'soundcloud';
    const artwork = isSoundCloud ? (item as SoundCloudTrack).artwork_url : null;

    return (
      <Pressable 
        style={[styles.trackCard, { backgroundColor: colors.colorNeutralBackground2 }]}
        onPress={() => playTrack(item)}
      >
        {artwork ? (
          <Image 
            source={{ uri: artwork }} 
            style={styles.artworkImage}
          />
        ) : (
          <View style={[styles.playIcon, { backgroundColor: colors.colorBrandBackground }]}>
            <MaterialCommunityIcons name="play" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
          </View>
        )}
        
        <View style={styles.trackInfo}>
          <FluentText variant="body1" numberOfLines={1} style={{ fontWeight: '600' }}>
            {item.title}
          </FluentText>
          <FluentText variant="body2" color="secondary" numberOfLines={1}>
            {item.artist}
          </FluentText>
          <View style={styles.trackMeta}>
            <View style={[styles.webBadge, { backgroundColor: colors.colorBrandBackground + '20' }]}>
              <MaterialCommunityIcons name="web" size={FluentIconSize.tiny} color={colors.colorBrandForeground1} />
              <FluentText variant="caption2" style={{ color: colors.colorBrandForeground1, marginLeft: FluentSpacing.xxs }}>
                Web
              </FluentText>
            </View>
            <FluentText variant="caption1" color="tertiary">
              {formatMeta(item)}
            </FluentText>
          </View>
        </View>

        <Pressable
          style={[styles.addButton, { backgroundColor: colors.colorSubtleBackgroundHover }]}
          onPress={(e) => {
            e.stopPropagation();
            addToLibrary(item);
          }}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={colors.colorBrandForeground1} />
          ) : (
            <MaterialCommunityIcons name="heart-plus-outline" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
          )}
        </Pressable>
      </Pressable>
    );
  };

  const searchButton = (
    <Pressable
      style={[styles.searchButton, { backgroundColor: colors.colorBrandBackground }]}
      onPress={handleSearch}
    >
      <MaterialCommunityIcons name="magnify" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
    </Pressable>
  );

  const header = (
    <FluentTopBar
      title="Discover"
      showSearch
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search songs or artists..."
      rightAction={searchButton}
    />
  );

  return (
    <>
      <Modal
        visible={showConsentModal}
        transparent
        animationType="fade"
        onRequestClose={handleDeclineConsent}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.colorNeutralBackground1 }]}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="compass" size={FluentIconSize.xxlarge} color={colors.colorBrandForeground1} />
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
                style={[styles.modalButton, styles.acceptButton, { backgroundColor: colors.colorBrandBackground }]}
                onPress={handleAcceptConsent}
              >
                <FluentText variant="body2" style={{ color: colors.colorNeutralForegroundOnBrand, fontWeight: '600' }}>
                  I Understand
                </FluentText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FluentScreenLayout
        header={header}
        backgroundColor="neutral1"
        hasBottomNavigation={true}
        avoidKeyboard={true}
      >
        <View style={styles.qualityRow}>
          {QUALITY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.qualityChip,
                { 
                  backgroundColor: selectedQuality === option.value 
                    ? colors.colorBrandBackground 
                    : colors.colorNeutralBackground2 
                },
              ]}
              onPress={() => setSelectedQuality(option.value)}
            >
              <FluentText
                variant="caption1"
                style={{ 
                  color: selectedQuality === option.value ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground1,
                  fontWeight: selectedQuality === option.value ? '600' : '400',
                }}
              >
                {option.label}
              </FluentText>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
            <FluentText variant="body2" color="secondary" style={styles.statusText}>
              Searching...
            </FluentText>
          </View>
        ) : tracks.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="compass-outline" size={FluentIconSize.xxlarge} color={colors.colorNeutralForeground3} />
            <FluentText variant="subtitle1" color="secondary" style={styles.statusText}>
              {searchQuery ? "No results found" : "Discover free music"}
            </FluentText>
            <FluentText variant="caption1" color="tertiary" style={styles.hintText}>
              Search for artist names, song titles, or genres
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

        <View style={[styles.footer, { borderTopColor: colors.colorNeutralStroke2 }]}>
          <MaterialCommunityIcons name="music-note" size={FluentIconSize.tiny} color={colors.colorNeutralForeground3} />
          <FluentText variant="caption2" color="tertiary">
            Free music from public sources
          </FluentText>
        </View>
      </FluentScreenLayout>
    </>
  );
}

const styles = StyleSheet.create({
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
    minHeight: FluentTouchTarget.minimum,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    borderWidth: 1,
  },
  acceptButton: {},
  searchButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityRow: {
    flexDirection: 'row',
    gap: FluentSpacing.xs,
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
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
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkImage: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentRadius.large,
    backgroundColor: '#333',
  },
  trackInfo: {
    flex: 1,
    gap: FluentSpacing.xxs,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.s,
    marginTop: FluentSpacing.xs,
  },
  webBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xxs,
    borderRadius: FluentRadius.large,
  },
  addButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
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
