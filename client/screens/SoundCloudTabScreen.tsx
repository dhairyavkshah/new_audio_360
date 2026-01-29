import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, Image, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useToast } from "@/contexts/ToastContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { getShadowStyle } from "@/constants/fluent2/shadows";
import SoundCloudService, { SoundCloudTrack, SoundCloudPlaylist } from "@/services/SoundCloudService";
import OAuthWebViewModal from "@/components/OAuthWebViewModal";

type SubTabType = 'search' | 'likes' | 'playlists';
const SC_ACCENT = '#FF5500';

export default function SoundCloudTabScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useThemeContext();
  const { playSong } = usePlayerContext();
  const { showSuccess, showError, showInfo } = useToast();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<SoundCloudTrack[]>([]);
  const [likedTracks, setLikedTracks] = useState<SoundCloudTrack[]>([]);
  const [playlists, setPlaylists] = useState<SoundCloudPlaylist[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('search');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [authRedirectUri, setAuthRedirectUri] = useState('');
  const [expectedState, setExpectedState] = useState('');
  
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkAuthStatus();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeSubTab === 'likes' && likedTracks.length === 0 && !loadingLikes) {
        loadLikedTracks();
      } else if (activeSubTab === 'playlists' && playlists.length === 0 && !loadingPlaylists) {
        loadPlaylists();
      }
    }
  }, [isAuthenticated, activeSubTab]);

  const checkAuthStatus = async () => {
    try {
      const isAuth = await SoundCloudService.isUserAuthenticated();
      setIsAuthenticated(isAuth);
      if (isAuth) {
        const profile = await SoundCloudService.getUserProfile();
        setUserProfile(profile);
      }
    } catch (error) {
      console.log('[SoundCloudTabScreen] Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const { url, redirectUri, state } = await SoundCloudService.getAuthorizationUrl();
      
      if (Platform.OS === 'web') {
        try {
          localStorage.removeItem('soundcloud_oauth_result');
        } catch {}
        
        const width = 500;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const popup = window.open(
          url, 
          'soundcloud_auth', 
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
        );
        
        pollIntervalRef.current = setInterval(async () => {
          try {
            const result = localStorage.getItem('soundcloud_oauth_result');
            if (result) {
              const data = JSON.parse(result);
              if (data.type === 'soundcloud_oauth_callback' && data.url) {
                console.log('[SoundCloudTabScreen] OAuth callback received via localStorage');
                localStorage.removeItem('soundcloud_oauth_result');
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                if (popup && !popup.closed) popup.close();
                await handleOAuthSuccess(data.url);
                return;
              }
            }
          } catch {}
          
          try {
            if (popup?.closed) {
              const result = localStorage.getItem('soundcloud_oauth_result');
              if (result) {
                const data = JSON.parse(result);
                if (data.type === 'soundcloud_oauth_callback' && data.url) {
                  console.log('[SoundCloudTabScreen] OAuth callback found after popup closed');
                  localStorage.removeItem('soundcloud_oauth_result');
                  if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                  }
                  await handleOAuthSuccess(data.url);
                  return;
                }
              }
              setIsLoggingIn(false);
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
            }
          } catch {}
        }, 500);
      } else {
        setAuthUrl(url);
        setAuthRedirectUri(redirectUri);
        setExpectedState(state);
        setShowLoginModal(true);
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error('[SoundCloudTabScreen] Login prep error:', error);
      showError("Failed to prepare login");
      setIsLoggingIn(false);
    }
  };

  const handleOAuthSuccess = async (returnedUrl: string) => {
    setShowLoginModal(false);
    setIsLoggingIn(true);
    
    try {
      const url = new URL(returnedUrl);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      
      if (!returnedState || !(await SoundCloudService.validateState(returnedState))) {
        showError("Security check failed - please try again");
        return;
      }
      
      if (code) {
        await SoundCloudService.exchangeCodeForToken(code);
        setIsAuthenticated(true);
        const profile = await SoundCloudService.getUserProfile();
        setUserProfile(profile);
        showSuccess("Connected to SoundCloud!");
      } else {
        showError("Login failed - no authorization code received");
      }
    } catch (error) {
      console.error('[SoundCloudTabScreen] OAuth callback error:', error);
      showError("Failed to connect to SoundCloud");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOAuthCancel = () => {
    setShowLoginModal(false);
    showInfo("Login cancelled");
  };

  const handleLogout = async () => {
    try {
      await SoundCloudService.logout();
      setIsAuthenticated(false);
      setUserProfile(null);
      setTracks([]);
      setLikedTracks([]);
      setPlaylists([]);
      setActiveSubTab('search');
      showInfo("Disconnected from SoundCloud");
    } catch (error) {
      console.error('[SoundCloudTabScreen] Logout error:', error);
    }
  };

  const loadLikedTracks = async () => {
    setLoadingLikes(true);
    try {
      const result = await SoundCloudService.getLikedTracks(50);
      setLikedTracks(result);
    } catch (error) {
      console.error('[SoundCloudTabScreen] Load likes error:', error);
      showError("Failed to load liked tracks");
    } finally {
      setLoadingLikes(false);
    }
  };

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const result = await SoundCloudService.getUserPlaylists(50);
      setPlaylists(result);
    } catch (error) {
      console.error('[SoundCloudTabScreen] Load playlists error:', error);
      showError("Failed to load playlists");
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const result = await SoundCloudService.searchTracksAuthenticated(searchQuery, 15);
      setTracks(result.tracks);
      
      if (result.tracks.length === 0) {
        showError("No results found. Try different keywords.");
      }
    } catch (error) {
      console.error('[SoundCloudTabScreen] Search error:', error);
      showError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, showError]);

  const playTrack = useCallback((track: SoundCloudTrack) => {
    const playableSong = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || 'SoundCloud',
      duration: track.duration * 1000,
      audioUrl: track.stream_url,
      artwork: track.artwork_url || undefined,
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

  const addToLibrary = async (track: SoundCloudTrack) => {
    setAddingIds(prev => new Set(prev).add(track.id));
    try {
      await SoundCloudService.addToFavorites(track);
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

  const handlePlaylistTap = (playlist: SoundCloudPlaylist) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'SoundCloudPlaylist',
        params: { playlist },
      })
    );
  };

  const renderSubTabs = () => (
    <View style={[styles.subTabContainer, { backgroundColor: colors.colorNeutralBackground2 }]}>
      {(['search', 'likes', 'playlists'] as SubTabType[]).map((tab) => (
        <Pressable
          key={tab}
          style={[
            styles.subTab,
            activeSubTab === tab && { backgroundColor: theme.primary },
          ]}
          onPress={() => setActiveSubTab(tab)}
        >
          <MaterialCommunityIcons
            name={tab === 'search' ? 'magnify' : tab === 'likes' ? 'heart' : 'playlist-music'}
            size={16}
            color={activeSubTab === tab ? '#FFFFFF' : colors.colorNeutralForeground2}
          />
          <FluentText
            variant="caption1"
            style={{
              color: activeSubTab === tab ? '#FFFFFF' : colors.colorNeutralForeground2,
              fontWeight: activeSubTab === tab ? '600' : '400',
              marginLeft: 4,
            }}
          >
            {tab === 'search' ? 'Search' : tab === 'likes' ? 'Likes' : 'Playlists'}
          </FluentText>
        </Pressable>
      ))}
    </View>
  );

  const renderTrack = ({ item }: { item: SoundCloudTrack }) => {
    const isAdding = addingIds.has(item.id);

    return (
      <Pressable 
        style={[
          styles.trackCard, 
          { backgroundColor: colors.colorNeutralBackground2 },
          getShadowStyle('shadow2', isDark),
        ]}
        onPress={() => playTrack(item)}
      >
        {item.artwork_url ? (
          <Image 
            source={{ uri: item.artwork_url }} 
            style={styles.artworkImage}
          />
        ) : (
          <View style={[styles.playIcon, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="soundcloud" size={20} color="#FFFFFF" />
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
            <View style={[styles.badge, { backgroundColor: theme.primary + '20' }]}>
              <MaterialCommunityIcons name="soundcloud" size={10} color={theme.primary} />
              <FluentText variant="caption2" style={{ color: theme.primary, marginLeft: 2 }}>
                Full
              </FluentText>
            </View>
            <FluentText variant="caption1" color="tertiary">
              {SoundCloudService.formatPlaybackCount(item.playbackCount)} plays • {SoundCloudService.formatDurationFromSeconds(item.duration)}
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

  const renderPlaylist = ({ item }: { item: SoundCloudPlaylist }) => (
    <Pressable 
      style={[
        styles.playlistCard, 
        { backgroundColor: colors.colorNeutralBackground2 },
        getShadowStyle('shadow2', isDark),
      ]}
      onPress={() => handlePlaylistTap(item)}
    >
      {item.artwork_url ? (
        <Image 
          source={{ uri: item.artwork_url }} 
          style={styles.playlistArtwork}
        />
      ) : (
        <View style={[styles.playlistArtwork, { backgroundColor: theme.primary }]}>
          <MaterialCommunityIcons name="playlist-music" size={28} color="#FFFFFF" />
        </View>
      )}
      
      <View style={styles.playlistInfo}>
        <FluentText variant="body1" numberOfLines={1} style={{ fontWeight: '600' }}>
          {item.title}
        </FluentText>
        <FluentText variant="body2" color="secondary" numberOfLines={1}>
          {item.user}
        </FluentText>
        <View style={styles.playlistMeta}>
          <FluentText variant="caption1" color="tertiary">
            {item.trackCount} tracks • {SoundCloudService.formatDurationFromSeconds(item.duration)}
          </FluentText>
          {item.likesCount > 0 && (
            <View style={styles.likesRow}>
              <MaterialCommunityIcons name="heart" size={12} color={colors.colorNeutralForeground3} />
              <FluentText variant="caption1" color="tertiary" style={{ marginLeft: 2 }}>
                {SoundCloudService.formatPlaybackCount(item.likesCount)}
              </FluentText>
            </View>
          )}
        </View>
      </View>

      <MaterialCommunityIcons 
        name="chevron-right" 
        size={24} 
        color={colors.colorNeutralForeground3} 
      />
    </Pressable>
  );

  const renderSearchContent = () => (
    <>
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.colorNeutralBackground2 }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.colorNeutralForeground3} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Search SoundCloud..."
            placeholderTextColor={colors.colorNeutralForeground3}
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

      {searching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <FluentText variant="body2" color="secondary" style={styles.statusText}>
            Searching SoundCloud...
          </FluentText>
        </View>
      ) : tracks.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="soundcloud" size={64} color={theme.primary} style={{ opacity: 0.5 }} />
          <FluentText variant="subtitle1" color="secondary" style={styles.statusText}>
            {searchQuery ? "No results found" : "Search for music"}
          </FluentText>
          <FluentText variant="caption1" color="tertiary" style={styles.hintText}>
            Full tracks with premium audio processing
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
    </>
  );

  const renderLikesContent = () => {
    if (loadingLikes) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <FluentText variant="body2" color="secondary" style={styles.statusText}>
            Loading your liked tracks...
          </FluentText>
        </View>
      );
    }

    if (likedTracks.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="heart-outline" size={64} color={theme.primary} style={{ opacity: 0.5 }} />
          <FluentText variant="subtitle1" color="secondary" style={styles.statusText}>
            No liked tracks yet
          </FluentText>
          <FluentText variant="caption1" color="tertiary" style={styles.hintText}>
            Like tracks on SoundCloud to see them here
          </FluentText>
        </View>
      );
    }

    return (
      <FlatList
        data={likedTracks}
        renderItem={renderTrack}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    );
  };

  const renderPlaylistsContent = () => {
    if (loadingPlaylists) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <FluentText variant="body2" color="secondary" style={styles.statusText}>
            Loading your playlists...
          </FluentText>
        </View>
      );
    }

    if (playlists.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="playlist-music-outline" size={64} color={theme.primary} style={{ opacity: 0.5 }} />
          <FluentText variant="subtitle1" color="secondary" style={styles.statusText}>
            No playlists yet
          </FluentText>
          <FluentText variant="caption1" color="tertiary" style={styles.hintText}>
            Create playlists on SoundCloud to see them here
          </FluentText>
        </View>
      );
    }

    return (
      <FlatList
        data={playlists}
        renderItem={renderPlaylist}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.loginContainer}>
        <View style={[
          styles.loginCard, 
          { backgroundColor: colors.colorNeutralBackground2 },
          getShadowStyle('shadow8', isDark),
        ]}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="soundcloud" size={48} color="#FFFFFF" />
          </View>
          
          <FluentText variant="title2" style={styles.loginTitle}>
            Connect SoundCloud
          </FluentText>
          
          <FluentText variant="body2" color="secondary" style={styles.loginDescription}>
            Sign in with your SoundCloud account to stream full tracks with our premium audio processing.
          </FluentText>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="music-note" size={20} color={theme.primary} />
              <FluentText variant="body2" color="secondary">Full track playback</FluentText>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="equalizer" size={20} color={theme.primary} />
              <FluentText variant="body2" color="secondary">DSP audio processing</FluentText>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="brain" size={20} color={theme.primary} />
              <FluentText variant="body2" color="secondary">Neural audio enhancement</FluentText>
            </View>
          </View>
          
          <Pressable
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="soundcloud" size={24} color="#FFFFFF" />
                <FluentText variant="body1" style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: 8 }}>
                  Sign in with SoundCloud
                </FluentText>
              </>
            )}
          </Pressable>
          
          <FluentText variant="caption1" color="tertiary" style={styles.disclaimer}>
            Your SoundCloud credentials are handled securely by SoundCloud. We never see your password.
          </FluentText>
        </View>

        <OAuthWebViewModal
          visible={showLoginModal}
          authUrl={authUrl}
          redirectUri={authRedirectUri}
          onSuccess={handleOAuthSuccess}
          onCancel={handleOAuthCancel}
          title="Sign in to SoundCloud"
          accentColor={theme.primary}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {userProfile && (
        <View style={[
          styles.profileBar, 
          { backgroundColor: colors.colorNeutralBackground2 },
          getShadowStyle('shadow2', isDark),
        ]}>
          {userProfile.avatar_url ? (
            <Image source={{ uri: userProfile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <MaterialCommunityIcons name="account" size={16} color="#FFFFFF" />
            </View>
          )}
          <FluentText variant="body2" style={{ flex: 1 }}>
            {userProfile.username}
          </FluentText>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <MaterialCommunityIcons name="logout" size={18} color={colors.colorNeutralForeground2} />
          </Pressable>
        </View>
      )}

      {renderSubTabs()}

      {activeSubTab === 'search' && renderSearchContent()}
      {activeSubTab === 'likes' && renderLikesContent()}
      {activeSubTab === 'playlists' && renderPlaylistsContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.xl,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FluentSpacing.l,
  },
  loginCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: FluentRadius.large,
    padding: FluentSpacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: FluentSpacing.l,
  },
  loginTitle: {
    fontWeight: '600',
    marginBottom: FluentSpacing.s,
    textAlign: 'center',
  },
  loginDescription: {
    textAlign: 'center',
    marginBottom: FluentSpacing.l,
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    marginBottom: FluentSpacing.l,
    gap: FluentSpacing.s,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.s,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    marginBottom: FluentSpacing.m,
  },
  disclaimer: {
    textAlign: 'center',
    lineHeight: 18,
  },
  profileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    marginHorizontal: FluentSpacing.m,
    marginTop: FluentSpacing.s,
    borderRadius: FluentRadius.medium,
    gap: FluentSpacing.s,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    padding: FluentSpacing.xs,
  },
  subTabContainer: {
    flexDirection: 'row',
    marginHorizontal: FluentSpacing.m,
    marginTop: FluentSpacing.s,
    marginBottom: FluentSpacing.xs,
    borderRadius: FluentRadius.large,
    padding: 4,
    gap: 4,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
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
    borderRadius: FluentRadius.medium,
    height: 44,
    gap: FluentSpacing.s,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: FluentRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
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
  artworkImage: {
    width: 44,
    height: 44,
    borderRadius: FluentRadius.small,
    backgroundColor: '#333',
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
    borderRadius: FluentRadius.small,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    gap: FluentSpacing.m,
  },
  playlistArtwork: {
    width: 56,
    height: 56,
    borderRadius: FluentRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  playlistInfo: {
    flex: 1,
    gap: 2,
  },
  playlistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.m,
    marginTop: 4,
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
