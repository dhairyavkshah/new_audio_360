import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Image, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import * as WebBrowser from 'expo-web-browser';
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { useToast } from "@/contexts/ToastContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentTouchTarget, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";
import { getShadowStyle } from "@/constants/fluent2/shadows";
import SoundCloudService, { SoundCloudTrack, SoundCloudPlaylist } from "@/services/SoundCloudService";
import {
  SoundCloudTrackCard,
  SoundCloudPlaylistCard,
  SoundCloudSubTabs,
  SoundCloudSearchHeader,
  SoundCloudLoginPrompt,
  SubTabType,
  SearchType,
} from "@/components/soundcloud";

export default function SoundCloudTabScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useThemeContext();
  const { playSong, setQueue } = usePlayerContext();
  const { setNowPlayingSource } = useNavigationContext();
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
  const [searchType, setSearchType] = useState<SearchType>('tracks');
  const [searchPlaylists, setSearchPlaylists] = useState<SoundCloudPlaylist[]>([]);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [authRedirectUri, setAuthRedirectUri] = useState('');
  const [expectedState, setExpectedState] = useState('');
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkAuthStatus();
    
    if (Platform.OS === 'web') {
      checkOAuthCallback();
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);
  
  const checkOAuthCallback = async () => {
    try {
      const resultStr = localStorage.getItem('soundcloud_oauth_result') || 
                       sessionStorage.getItem('soundcloud_oauth_result');
      const errorStr = localStorage.getItem('soundcloud_oauth_error') ||
                      sessionStorage.getItem('soundcloud_oauth_error');
      
      if (errorStr) {
        localStorage.removeItem('soundcloud_oauth_error');
        sessionStorage.removeItem('soundcloud_oauth_error');
        const error = JSON.parse(errorStr);
        console.log('[SoundCloudTabScreen] OAuth error from callback:', error);
        showError(error.description || error.error || 'Authorization failed');
        return;
      }
      
      if (resultStr) {
        localStorage.removeItem('soundcloud_oauth_result');
        sessionStorage.removeItem('soundcloud_oauth_result');
        const result = JSON.parse(resultStr);
        console.log('[SoundCloudTabScreen] OAuth result from callback:', result);
        
        if (result.code) {
          setIsLoggingIn(true);
          
          if (result.state && !(await SoundCloudService.validateState(result.state))) {
            showError("Security check failed - please try again");
            setIsLoggingIn(false);
            return;
          }
          
          await SoundCloudService.exchangeCodeForToken(result.code);
          setIsAuthenticated(true);
          const profile = await SoundCloudService.getUserProfile();
          setUserProfile(profile);
          showSuccess("Connected to SoundCloud!");
          setIsLoggingIn(false);
        }
      }
    } catch (error) {
      console.error('[SoundCloudTabScreen] OAuth callback check error:', error);
      setIsLoggingIn(false);
    }
  };

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
        console.log('[SoundCloudTabScreen] Opening SoundCloud auth in new tab');
        const authWindow = window.open(url, '_blank');
        
        if (!authWindow) {
          showError("Please allow popups for this site");
          setIsLoggingIn(false);
          return;
        }
        
        setShowCodeEntry(true);
        
        const checkInterval = setInterval(() => {
          try {
            const result = localStorage.getItem('soundcloud_oauth_result') || 
                          sessionStorage.getItem('soundcloud_oauth_result');
            const error = localStorage.getItem('soundcloud_oauth_error') ||
                         sessionStorage.getItem('soundcloud_oauth_error');
            
            if (result || error) {
              clearInterval(checkInterval);
              localStorage.removeItem('soundcloud_oauth_result');
              localStorage.removeItem('soundcloud_oauth_error');
              checkOAuthCallback();
            }
          } catch (e) {}
        }, 1000);
        
        pollIntervalRef.current = checkInterval;
        return;
      } else {
        console.log('[SoundCloudTabScreen] Opening SoundCloud auth via expo-web-browser');
        console.log('[SoundCloudTabScreen] Auth URL:', url);
        console.log('[SoundCloudTabScreen] Redirect URI:', redirectUri);
        
        try {
          const result = await WebBrowser.openAuthSessionAsync(url, redirectUri, {
            showInRecents: true,
            preferEphemeralSession: false,
          });
          
          console.log('[SoundCloudTabScreen] WebBrowser result:', result.type);
          
          if (result.type === 'success' && result.url) {
            console.log('[SoundCloudTabScreen] OAuth callback URL received:', result.url);
            await handleOAuthSuccess(result.url);
          } else if (result.type === 'cancel' || result.type === 'dismiss') {
            showInfo("Login cancelled");
          } else {
            console.log('[SoundCloudTabScreen] Unexpected result:', result);
            showError("Login failed - please try again");
          }
        } catch (browserError) {
          console.error('[SoundCloudTabScreen] WebBrowser error:', browserError);
          setAuthUrl(url);
          setAuthRedirectUri(redirectUri);
          setExpectedState(state);
          setShowLoginModal(true);
        }
        
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

  const handleManualCodeSubmit = async () => {
    if (!manualCode.trim()) {
      showError("Please enter the authorization code or URL");
      return;
    }
    
    setIsLoggingIn(true);
    try {
      let code: string | null = null;
      let state: string | null = null;
      const input = manualCode.trim();
      
      if (input.includes('?code=') || input.includes('&code=')) {
        try {
          const url = new URL(input);
          code = url.searchParams.get('code');
          state = url.searchParams.get('state');
        } catch {
          const codeMatch = input.match(/[?&]code=([^&]+)/);
          const stateMatch = input.match(/[?&]state=([^&]+)/);
          code = codeMatch ? codeMatch[1] : null;
          state = stateMatch ? stateMatch[1] : null;
        }
      } else if (input.includes('&state=')) {
        const parts = input.split('&state=');
        code = parts[0];
        state = parts[1] || null;
      } else if (input.includes('|')) {
        const parts = input.split('|');
        code = parts[0];
        state = parts[1] || null;
      } else {
        code = input;
      }
      
      if (!code) {
        showError("Could not find authorization code");
        setIsLoggingIn(false);
        return;
      }
      
      console.log('[SoundCloudTabScreen] Manual code parsed:', { code: code.substring(0, 10) + '...', state });
      
      if (state && !(await SoundCloudService.validateState(state))) {
        console.log('[SoundCloudTabScreen] State validation failed, proceeding anyway');
      }
      
      await SoundCloudService.exchangeCodeForToken(code);
      setIsAuthenticated(true);
      const profile = await SoundCloudService.getUserProfile();
      setUserProfile(profile);
      showSuccess("Connected to SoundCloud!");
      setShowCodeEntry(false);
      setManualCode('');
    } catch (error) {
      console.error('[SoundCloudTabScreen] Manual code error:', error);
      showError("Failed to authenticate - please try again");
    } finally {
      setIsLoggingIn(false);
    }
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
      if (searchType === 'tracks') {
        const result = await SoundCloudService.searchTracksAuthenticated(searchQuery, 25);
        setTracks(result.tracks);
        setSearchPlaylists([]);
        if (result.tracks.length === 0) {
          showError("No results found. Try different keywords.");
        }
      } else if (searchType === 'playlists') {
        const result = await SoundCloudService.searchPlaylists(searchQuery, 25);
        setSearchPlaylists(result);
        setTracks([]);
        if (result.length === 0) {
          showError("No playlists found. Try different keywords.");
        }
      } else if (searchType === 'albums') {
        const result = await SoundCloudService.searchAlbums(searchQuery, 25);
        setSearchPlaylists(result);
        setTracks([]);
        if (result.length === 0) {
          showError("No albums found. Try different keywords.");
        }
      }
    } catch (error) {
      console.error('[SoundCloudTabScreen] Search error:', error);
      showError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searchType, showError]);

  const playTrack = useCallback((track: SoundCloudTrack) => {
    const playableSong = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || 'SoundCloud',
      duration: track.duration * 1000,
      audioUrl: track.stream_url,
      artwork: track.artwork_url || undefined,
      source: 'soundcloud' as const,
    };
    
    setNowPlayingSource({ tab: 'DiscoverTab' });
    setQueue([playableSong]);
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
  }, [playSong, setQueue, navigation, setNowPlayingSource]);

  const addToLibrary = async (track: SoundCloudTrack) => {
    setAddingIds(prev => new Set(prev).add(track.id));
    try {
      const syncResult = await SoundCloudService.likeTrackOnSoundCloud(track.id);
      console.log('[SoundCloudTabScreen] Like sync result:', syncResult);
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

  const renderTrack = ({ item }: { item: SoundCloudTrack }) => (
    <SoundCloudTrackCard
      track={item}
      onPress={playTrack}
      onAddToLibrary={addToLibrary}
      isAdding={addingIds.has(item.id)}
    />
  );

  const renderPlaylist = ({ item }: { item: SoundCloudPlaylist }) => (
    <SoundCloudPlaylistCard
      playlist={item}
      onPress={handlePlaylistTap}
    />
  );

  const renderSearchResults = () => {
    if (searching) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <FluentText variant="body2" color="secondary" style={styles.statusText}>
            Searching SoundCloud...
          </FluentText>
        </View>
      );
    }

    if (searchType === 'tracks') {
      if (tracks.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="soundcloud" size={FluentIconSize.xxlarge} color={colors.colorBrandForeground1} style={{ opacity: 0.5 }} />
            <FluentText variant="subtitle1" color="secondary" style={styles.statusText}>
              {searchQuery ? "No tracks found" : "Search for music"}
            </FluentText>
            <FluentText variant="caption1" color="tertiary" style={styles.hintText}>
              Full tracks with premium audio processing
            </FluentText>
          </View>
        );
      }
      return (
        <FlatList
          data={tracks}
          renderItem={renderTrack}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      );
    }

    if (searchPlaylists.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons 
            name={searchType === 'playlists' ? 'playlist-music' : 'album'} 
            size={FluentIconSize.xxlarge} 
            color={colors.colorBrandForeground1} 
            style={{ opacity: 0.5 }} 
          />
          <FluentText variant="subtitle1" color="secondary" style={styles.statusText}>
            {searchQuery ? `No ${searchType} found` : `Search for ${searchType}`}
          </FluentText>
          <FluentText variant="caption1" color="tertiary" style={styles.hintText}>
            {searchType === 'playlists' ? 'Find curated playlists' : 'Discover full albums'}
          </FluentText>
        </View>
      );
    }

    return (
      <FlatList
        data={searchPlaylists}
        renderItem={renderPlaylist}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    );
  };

  const renderSearchContent = () => (
    <>
      <SoundCloudSearchHeader
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        searchType={searchType}
        onSearchTypeChange={setSearchType}
      />
      {renderSearchResults()}
    </>
  );

  const handlePlayAllLikes = useCallback(() => {
    if (likedTracks.length === 0) return;
    const firstTrack = likedTracks[0];
    playTrack(firstTrack);
  }, [likedTracks, playTrack]);

  const handleShuffleLikes = useCallback(() => {
    if (likedTracks.length === 0) return;
    const shuffled = [...likedTracks].sort(() => Math.random() - 0.5);
    const firstTrack = shuffled[0];
    playTrack(firstTrack);
  }, [likedTracks, playTrack]);

  const renderLikesHeader = () => (
    <View style={styles.likesHeader}>
      <FluentText variant="body2" color="secondary">
        {likedTracks.length} {likedTracks.length === 1 ? 'track' : 'tracks'}
      </FluentText>
      <View style={styles.playAllButtons}>
        <Pressable 
          style={[styles.playAllButton, { backgroundColor: colors.colorBrandBackground }]} 
          onPress={handlePlayAllLikes}
        >
          <MaterialCommunityIcons name="play" size={FluentIconSize.small} color="#FFFFFF" />
          <FluentText variant="body2" style={{ color: '#FFFFFF', marginLeft: FluentSpacing.xs }}>Play All</FluentText>
        </Pressable>
        <Pressable 
          style={[styles.shuffleButton, { backgroundColor: colors.colorNeutralBackground3 }]} 
          onPress={handleShuffleLikes}
        >
          <MaterialCommunityIcons name="shuffle" size={FluentIconSize.small} color={colors.colorNeutralForeground1} />
        </Pressable>
      </View>
    </View>
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
          <MaterialCommunityIcons name="heart-outline" size={FluentIconSize.xxlarge} color={colors.colorBrandForeground1} style={{ opacity: 0.5 }} />
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
        ListHeaderComponent={renderLikesHeader}
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
          <MaterialCommunityIcons name="playlist-music-outline" size={FluentIconSize.xxlarge} color={colors.colorBrandForeground1} style={{ opacity: 0.5 }} />
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
      <SoundCloudLoginPrompt
        isLoggingIn={isLoggingIn}
        showCodeEntry={showCodeEntry}
        manualCode={manualCode}
        showLoginModal={showLoginModal}
        authUrl={authUrl}
        authRedirectUri={authRedirectUri}
        onLogin={handleLogin}
        onManualCodeChange={setManualCode}
        onManualCodeSubmit={handleManualCodeSubmit}
        onShowCodeEntry={setShowCodeEntry}
        onOAuthSuccess={handleOAuthSuccess}
        onOAuthCancel={handleOAuthCancel}
      />
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
            <View style={[styles.avatar, { backgroundColor: colors.colorBrandBackground }]}>
              <MaterialCommunityIcons name="account" size={FluentIconSize.small} color={colors.colorNeutralForegroundOnBrand} />
            </View>
          )}
          <FluentText variant="body2" style={{ flex: 1 }}>
            {userProfile.username}
          </FluentText>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <MaterialCommunityIcons name="logout" size={FluentIconSize.small} color={colors.colorNeutralForeground2} />
          </Pressable>
        </View>
      )}

      <SoundCloudSubTabs
        activeTab={activeSubTab}
        onTabChange={setActiveSubTab}
      />

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
  profileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    marginHorizontal: FluentSpacing.m,
    marginTop: FluentSpacing.s,
    borderRadius: FluentControlRadius.card,
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
  likesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.xs,
    marginBottom: FluentSpacing.m,
  },
  playAllButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.s,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentRadius.circular,
  },
  shuffleButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentRadius.circular,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
