import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, Image, Linking } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from 'expo-web-browser';
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useToast } from "@/contexts/ToastContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import SoundCloudService, { SoundCloudTrack } from "@/services/SoundCloudService";

const SC_AUTH_STATE_KEY = '@soundcloud_auth_state';

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
  const [searching, setSearching] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

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
      const { url: authUrl, redirectUri, state: expectedState } = await SoundCloudService.getAuthorizationUrl();
      showInfo("Opening SoundCloud login...");
      
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
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
      } else if (result.type === 'cancel') {
        showInfo("Login cancelled");
      }
    } catch (error) {
      console.error('[SoundCloudTabScreen] Login error:', error);
      showError("Failed to connect to SoundCloud");
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
      showInfo("Disconnected from SoundCloud");
    } catch (error) {
      console.error('[SoundCloudTabScreen] Logout error:', error);
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

  const renderTrack = ({ item }: { item: SoundCloudTrack }) => {
    const isAdding = addingIds.has(item.id);

    return (
      <Pressable 
        style={[styles.trackCard, { backgroundColor: colors.colorNeutralBackground2 }]}
        onPress={() => playTrack(item)}
      >
        {item.artwork_url ? (
          <Image 
            source={{ uri: item.artwork_url }} 
            style={styles.artworkImage}
          />
        ) : (
          <View style={[styles.playIcon, { backgroundColor: '#FF5500' }]}>
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
            <View style={[styles.badge, { backgroundColor: '#FF5500' + '20' }]}>
              <MaterialCommunityIcons name="soundcloud" size={10} color="#FF5500" />
              <FluentText variant="caption2" style={{ color: '#FF5500', marginLeft: 2 }}>
                Full
              </FluentText>
            </View>
            <FluentText variant="caption1" color="tertiary">
              {SoundCloudService.formatPlaybackCount(item.playbackCount)} plays • {SoundCloudService.formatDurationFromSeconds(item.duration)}
            </FluentText>
          </View>
        </View>

        <Pressable
          style={[styles.addButton, { backgroundColor: '#FF5500' + '15' }]}
          onPress={(e) => {
            e.stopPropagation();
            addToLibrary(item);
          }}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#FF5500" />
          ) : (
            <MaterialCommunityIcons name="heart-plus-outline" size={22} color="#FF5500" />
          )}
        </Pressable>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF5500" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.loginContainer}>
        <View style={[styles.loginCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#FF5500' }]}>
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
              <MaterialCommunityIcons name="music-note" size={20} color="#FF5500" />
              <FluentText variant="body2" color="secondary">Full track playback</FluentText>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="equalizer" size={20} color="#FF5500" />
              <FluentText variant="body2" color="secondary">DSP audio processing</FluentText>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="brain" size={20} color="#FF5500" />
              <FluentText variant="body2" color="secondary">Neural audio enhancement</FluentText>
            </View>
          </View>
          
          <Pressable
            style={[styles.loginButton, { backgroundColor: '#FF5500' }]}
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {userProfile && (
        <View style={[styles.profileBar, { backgroundColor: colors.colorNeutralBackground2 }]}>
          {userProfile.avatar_url ? (
            <Image source={{ uri: userProfile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#FF5500' }]}>
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
          style={[styles.searchButton, { backgroundColor: '#FF5500' }]}
          onPress={handleSearch}
        >
          <MaterialCommunityIcons name="magnify" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {searching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF5500" />
          <FluentText variant="body2" color="secondary" style={styles.statusText}>
            Searching SoundCloud...
          </FluentText>
        </View>
      ) : tracks.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="soundcloud" size={64} color="#FF5500" style={{ opacity: 0.5 }} />
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
    borderRadius: 8,
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
    borderRadius: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
