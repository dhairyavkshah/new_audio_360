import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, ScrollView, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { useToast } from "@/contexts/ToastContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentTouchTarget, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";
import ArchiveOrgService, { ArchiveOrgTrack, AudioQuality } from "@/services/ArchiveOrgService";

const CONSENT_STORAGE_KEY = '@discover_consent_accepted';

const QUALITY_OPTIONS: { label: string; value: AudioQuality }[] = [
  { label: 'All', value: 'all' },
  { label: '128k', value: '128' },
  { label: '192k', value: '192' },
  { label: '256k', value: '256' },
  { label: '320k', value: '320' },
];

export default function ArchiveTabScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useThemeContext();
  const { playSong } = usePlayerContext();
  const { setNowPlayingSource } = useNavigationContext();
  const { showSuccess, showError } = useToast();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<ArchiveOrgTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<AudioQuality>('all');
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [showConsentModal, setShowConsentModal] = useState(true);

  useEffect(() => {
    const checkConsent = async () => {
      try {
        const consentAccepted = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
        if (consentAccepted === 'true') {
          setShowConsentModal(false);
        }
      } catch (error) {
        console.error('[ArchiveTabScreen] Error checking consent:', error);
      }
    };
    checkConsent();
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const favorites = await ArchiveOrgService.getFavorites();
      setFavoritedIds(new Set(favorites.map(f => f.id)));
    } catch (error) {
      console.error('[ArchiveTabScreen] Error loading favorites:', error);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleAcceptConsent = async () => {
    try {
      await AsyncStorage.setItem(CONSENT_STORAGE_KEY, 'true');
      setShowConsentModal(false);
    } catch (error) {
      console.error('[ArchiveTabScreen] Error saving consent:', error);
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
      const result = await ArchiveOrgService.searchMusic(searchQuery, selectedQuality, 15);
      setTracks(result.tracks);
      
      if (result.tracks.length === 0) {
        showError("No results found. Try different keywords.");
      }
    } catch (error) {
      console.error('[ArchiveTabScreen] Search error:', error);
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
      album: track.album || 'Public Domain',
      duration: (track.duration || 0) * 1000,
      audioUrl: track.stream_url,
      artwork: undefined,
    };
    
    setNowPlayingSource({ tab: 'DiscoverTab' });
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
  }, [playSong, navigation, setNowPlayingSource]);

  const toggleFavorite = async (track: ArchiveOrgTrack) => {
    const isFavorited = favoritedIds.has(track.id);
    setAddingIds(prev => new Set(prev).add(track.id));
    try {
      if (isFavorited) {
        await ArchiveOrgService.removeFromFavorites(track.id);
        setFavoritedIds(prev => {
          const next = new Set(prev);
          next.delete(track.id);
          return next;
        });
        showSuccess(`Removed "${track.title}" from favorites`);
      } else {
        await ArchiveOrgService.addToFavorites(track);
        setFavoritedIds(prev => new Set(prev).add(track.id));
        showSuccess(`Added "${track.title}" to favorites`);
      }
    } catch (error) {
      showError(isFavorited ? "Failed to remove song" : "Failed to add song");
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
    const isFavorited = favoritedIds.has(item.id);

    return (
      <Pressable 
        style={[styles.trackCard, { backgroundColor: colors.colorNeutralBackground2 }]}
        onPress={() => playTrack(item)}
      >
        <View style={[styles.playIcon, { backgroundColor: colors.colorBrandBackground }]}>
          <MaterialCommunityIcons name="play" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
        </View>
        
        <View style={styles.trackInfo}>
          <FluentText variant="body1" numberOfLines={1} style={{ fontWeight: '600' }}>
            {item.title}
          </FluentText>
          <FluentText variant="body2" color="secondary" numberOfLines={1}>
            {item.artist}
          </FluentText>
          <View style={styles.trackMeta}>
            <View style={[styles.badge, { backgroundColor: colors.colorPaletteGreenBackground1 }]}>
              <MaterialCommunityIcons name="creative-commons" size={FluentIconSize.tiny} color={colors.colorPaletteGreenForeground1} />
              <FluentText variant="caption2" style={{ color: colors.colorPaletteGreenForeground1, marginLeft: 2 }}>
                Free
              </FluentText>
            </View>
            <FluentText variant="caption1" color="tertiary">
              {ArchiveOrgService.formatBitrate(item.bitrate)} • {ArchiveOrgService.formatDuration(item.duration || 0)}
            </FluentText>
          </View>
        </View>

        <Pressable
          style={[styles.addButton, { backgroundColor: isFavorited ? colors.colorPaletteRedBackground1 : colors.colorSubtleBackgroundHover }]}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item);
          }}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={isFavorited ? colors.colorPaletteRedForeground1 : colors.colorBrandForeground1} />
          ) : (
            <MaterialCommunityIcons 
              name={isFavorited ? "heart" : "heart-plus-outline"} 
              size={FluentIconSize.regular} 
              color={isFavorited ? colors.colorPaletteRedForeground1 : colors.colorBrandForeground1} 
            />
          )}
        </Pressable>
      </Pressable>
    );
  };

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
              <MaterialCommunityIcons name="archive" size={FluentIconSize.xxlarge} color={colors.colorBrandForeground1} />
              <FluentText variant="title2" style={styles.modalTitle}>
                Internet Archive
              </FluentText>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <FluentText variant="body2" color="secondary" style={styles.modalText}>
                Browse free music from the Internet Archive's collection of Creative Commons and Public Domain content. By proceeding, you acknowledge:
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
                  Content is provided by a registered non-profit organization
                </FluentText>
              </View>
              
              <FluentText variant="body2" color="tertiary" style={styles.modalDisclaimer}>
                Internet Archive is a 501(c)(3) non-profit building a digital library of Internet sites and other cultural artifacts.
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

      <View style={styles.container}>
        <View style={styles.searchRow}>
          <View style={[styles.searchInput, { backgroundColor: colors.colorNeutralBackground2 }]}>
            <MaterialCommunityIcons name="magnify" size={FluentIconSize.regular} color={colors.colorNeutralForeground3} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Search free music..."
              placeholderTextColor={colors.colorNeutralForeground3}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <Pressable
            style={[styles.searchButton, { backgroundColor: colors.colorBrandBackground }]}
            onPress={handleSearch}
          >
            <MaterialCommunityIcons name="magnify" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
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
              Searching Internet Archive...
            </FluentText>
          </View>
        ) : tracks.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="archive-outline" size={FluentIconSize.xxlarge} color={colors.colorNeutralForeground3} />
            <FluentText variant="subtitle1" color="secondary" style={styles.statusText}>
              {searchQuery ? "No results found" : "Search public domain music"}
            </FluentText>
            <FluentText variant="caption1" color="tertiary" style={styles.hintText}>
              Free Creative Commons and Public Domain content
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    gap: FluentSpacing.s,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.input,
    height: FluentTouchTarget.minimum,
    gap: FluentSpacing.s,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
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
    paddingBottom: FluentSpacing.s,
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
    borderRadius: FluentControlRadius.card,
    gap: FluentSpacing.m,
  },
  playIcon: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  addButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: FluentControlRadius.dialog,
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
});
