import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, Image, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { useToast } from "@/contexts/ToastContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentTouchTarget, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";
import { getShadowStyle } from "@/constants/fluent2/shadows";
import SoundCloudService, { SoundCloudTrack, SoundCloudPlaylist } from "@/services/SoundCloudService";
import OAuthWebViewModal from "@/components/OAuthWebViewModal";

type SubTabType = 'search' | 'likes' | 'playlists';
const SC_ACCENT = '#FF5500';

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
            activeSubTab === tab && { backgroundColor: colors.colorBrandBackground },
          ]}
          onPress={() => setActiveSubTab(tab)}
        >
          <MaterialCommunityIcons
            name={tab === 'search' ? 'magnify' : tab === 'likes' ? 'heart' : 'playlist-music'}
            size={FluentIconSize.small}
            color={activeSubTab === tab ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground2}
          />
          <FluentText
            variant="caption1"
            style={{
              color: activeSubTab === tab ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground2,
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
          <View style={[styles.playIcon, { backgroundColor: colors.colorBrandBackground }]}>
            <MaterialCommunityIcons name="soundcloud" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
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
            <View style={[styles.badge, { backgroundColor: colors.colorSubtleBackgroundHover }]}>
              <MaterialCommunityIcons name="soundcloud" size={FluentIconSize.tiny} color={colors.colorBrandForeground1} />
              <FluentText variant="caption2" style={{ color: colors.colorBrandForeground1, marginLeft: 2 }}>
                Full
              </FluentText>
            </View>
            <FluentText variant="caption1" color="tertiary">
              {SoundCloudService.formatPlaybackCount(item.playbackCount)} plays • {SoundCloudService.formatDurationFromSeconds(item.duration)}
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
        <View style={[styles.playlistArtwork, { backgroundColor: colors.colorBrandBackground }]}>
          <MaterialCommunityIcons name="playlist-music" size={FluentIconSize.large} color={colors.colorNeutralForegroundOnBrand} />
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
              <MaterialCommunityIcons name="heart" size={FluentIconSize.tiny} color={colors.colorNeutralForeground3} />
              <FluentText variant="caption1" color="tertiary" style={{ marginLeft: 2 }}>
                {SoundCloudService.formatPlaybackCount(item.likesCount)}
              </FluentText>
            </View>
          )}
        </View>
      </View>

      <MaterialCommunityIcons 
        name="chevron-right" 
        size={FluentIconSize.medium} 
        color={colors.colorNeutralForeground3} 
      />
    </Pressable>
  );

  const renderSearchContent = () => (
    <>
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.colorNeutralBackground2 }]}>
          <MaterialCommunityIcons name="magnify" size={FluentIconSize.regular} color={colors.colorNeutralForeground3} />
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
          style={[styles.searchButton, { backgroundColor: colors.colorBrandBackground }]}
          onPress={handleSearch}
        >
          <MaterialCommunityIcons name="magnify" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
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
          <MaterialCommunityIcons name="soundcloud" size={FluentIconSize.xxlarge} color={colors.colorBrandForeground1} style={{ opacity: 0.5 }} />
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
      <View style={styles.loginContainer}>
        <View style={[
          styles.loginCard, 
          { backgroundColor: colors.colorNeutralBackground2 },
          getShadowStyle('shadow8', isDark),
        ]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.colorBrandBackground }]}>
            <MaterialCommunityIcons name="soundcloud" size={FluentIconSize.xxlarge} color={colors.colorNeutralForegroundOnBrand} />
          </View>
          
          <FluentText variant="title2" style={styles.loginTitle}>
            Connect SoundCloud
          </FluentText>
          
          <FluentText variant="body2" color="secondary" style={styles.loginDescription}>
            Sign in with your SoundCloud account to stream full tracks with our premium audio processing.
          </FluentText>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="music-note" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
              <FluentText variant="body2" color="secondary">Full track playback</FluentText>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="equalizer" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
              <FluentText variant="body2" color="secondary">DSP audio processing</FluentText>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="brain" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
              <FluentText variant="body2" color="secondary">Neural audio enhancement</FluentText>
            </View>
          </View>
          
          {!showCodeEntry ? (
            <>
              <Pressable
                style={[styles.loginButton, { backgroundColor: colors.colorBrandBackground }]}
                onPress={handleLogin}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <ActivityIndicator size="small" color={colors.colorNeutralForegroundOnBrand} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="soundcloud" size={FluentIconSize.medium} color={colors.colorNeutralForegroundOnBrand} />
                    <FluentText variant="body1" style={{ color: colors.colorNeutralForegroundOnBrand, fontWeight: '600', marginLeft: 8 }}>
                      Sign in with SoundCloud
                    </FluentText>
                  </>
                )}
              </Pressable>
              
              <Pressable onPress={() => setShowCodeEntry(true)}>
                <FluentText variant="caption1" color="secondary" style={{ textDecorationLine: 'underline', marginTop: FluentSpacing.s }}>
                  Enter code manually
                </FluentText>
              </Pressable>
              
              <FluentText variant="caption1" color="tertiary" style={[styles.disclaimer, { marginTop: FluentSpacing.m }]}>
                Your SoundCloud credentials are handled securely by SoundCloud. We never see your password.
              </FluentText>
            </>
          ) : (
            <>
              <FluentText variant="body2" color="secondary" style={{ marginBottom: FluentSpacing.s, textAlign: 'center' }}>
                After authorizing in the new tab, copy the entire URL from your browser's address bar and paste it below:
              </FluentText>
              <FluentText variant="caption1" color="tertiary" style={{ marginBottom: FluentSpacing.m, textAlign: 'center' }}>
                The URL will contain "?code=" - that's what we need
              </FluentText>
              
              <View style={[styles.searchInput, { backgroundColor: colors.colorNeutralBackground3, width: '100%', marginBottom: FluentSpacing.m }]}>
                <TextInput
                  style={[styles.input, { color: colors.colorNeutralForeground1 }]}
                  placeholder="Paste URL or code here..."
                  placeholderTextColor={colors.colorNeutralForeground3}
                  value={manualCode}
                  onChangeText={setManualCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                />
              </View>
              
              <Pressable
                style={[styles.loginButton, { backgroundColor: colors.colorBrandBackground }]}
                onPress={handleManualCodeSubmit}
                disabled={isLoggingIn || !manualCode.trim()}
              >
                {isLoggingIn ? (
                  <ActivityIndicator size="small" color={colors.colorNeutralForegroundOnBrand} />
                ) : (
                  <FluentText variant="body1" style={{ color: colors.colorNeutralForegroundOnBrand, fontWeight: '600' }}>
                    Submit Code
                  </FluentText>
                )}
              </Pressable>
              
              <Pressable onPress={() => { setShowCodeEntry(false); setManualCode(''); }}>
                <FluentText variant="caption1" color="secondary" style={{ textDecorationLine: 'underline', marginTop: FluentSpacing.m }}>
                  Back to sign in
                </FluentText>
              </Pressable>
            </>
          )}
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
    borderRadius: FluentControlRadius.dialog,
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
    minHeight: FluentTouchTarget.minimum,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
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
    minHeight: FluentTouchTarget.minimum,
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
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
  artworkImage: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.chip,
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
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    gap: FluentSpacing.m,
  },
  playlistArtwork: {
    width: 56,
    height: 56,
    borderRadius: FluentControlRadius.card,
    justifyContent: 'center',
    alignItems: 'center',
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
