import React, { useRef, useCallback, useEffect } from "react";
import { View, StyleSheet, Modal, Pressable, ActivityIndicator, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";

interface OAuthWebViewModalProps {
  visible: boolean;
  authUrl: string;
  redirectUri: string;
  onSuccess: (url: string) => void;
  onCancel: () => void;
  title?: string;
  accentColor?: string;
}

export default function OAuthWebViewModal({
  visible,
  authUrl,
  redirectUri,
  onSuccess,
  onCancel,
  title = "Sign In",
  accentColor = "#FF5500",
}: OAuthWebViewModalProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);

  const handleNavigationStateChange = useCallback((navState: { url: string }) => {
    const { url } = navState;
    
    if (url.startsWith(redirectUri) || url.includes('code=')) {
      onSuccess(url);
    }
  }, [redirectUri, onSuccess]);

  const handleShouldStartLoad = useCallback((event: { url: string }) => {
    const { url } = event;
    
    if (url.startsWith(redirectUri) || 
        (url.includes('newaudio360://') && url.includes('code='))) {
      onSuccess(url);
      return false;
    }
    
    return true;
  }, [redirectUri, onSuccess]);

  const popupRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth_callback' && event.data?.url) {
        setIsAuthenticating(false);
        onSuccess(event.data.url);
        if (popupRef.current) {
          popupRef.current.close();
          popupRef.current = null;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [visible, onSuccess]);

  useEffect(() => {
    if (!visible) {
      setIsAuthenticating(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (popupRef.current) {
        popupRef.current.close();
        popupRef.current = null;
      }
    }
  }, [visible]);

  const handleWebAuth = useCallback(() => {
    setIsAuthenticating(true);
    
    const width = 500;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      authUrl, 
      'soundcloud_auth', 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );
    popupRef.current = popup;
    
    pollIntervalRef.current = setInterval(() => {
      try {
        if (popup?.closed) {
          setIsAuthenticating(false);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          return;
        }
        
        const currentUrl = popup?.location?.href;
        if (currentUrl && (currentUrl.includes('code=') || currentUrl.startsWith(redirectUri))) {
          setIsAuthenticating(false);
          onSuccess(currentUrl);
          popup?.close();
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } catch {
      }
    }, 300);
  }, [authUrl, redirectUri, onSuccess]);

  if (Platform.OS === 'web') {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onCancel}
      >
        <View style={styles.overlay}>
          <View style={[styles.webModalContainer, { 
            backgroundColor: colors.colorNeutralBackground1,
          }]}>
            <View style={[styles.header, { borderBottomColor: colors.colorNeutralStroke1 }]}>
              <Pressable onPress={onCancel} style={styles.closeButton}>
                <MaterialCommunityIcons 
                  name="close" 
                  size={24} 
                  color={colors.colorNeutralForeground1} 
                />
              </Pressable>
              <FluentText variant="subtitle1" style={{ fontWeight: '600', flex: 1, textAlign: 'center' }}>
                {title}
              </FluentText>
              <View style={styles.closeButton} />
            </View>
            
            <View style={styles.webAuthContent}>
              <View style={[styles.iconContainer, { backgroundColor: accentColor + '15' }]}>
                <MaterialCommunityIcons 
                  name="soundcloud" 
                  size={64} 
                  color={accentColor} 
                />
              </View>
              
              <FluentText variant="title3" style={{ textAlign: 'center', marginTop: FluentSpacing.xl }}>
                Connect with SoundCloud
              </FluentText>
              
              <FluentText 
                variant="body1" 
                color="secondary" 
                style={{ textAlign: 'center', marginTop: FluentSpacing.s, paddingHorizontal: FluentSpacing.l }}
              >
                Sign in with your SoundCloud account to access your likes, playlists, and stream full tracks.
              </FluentText>
              
              {isAuthenticating ? (
                <View style={styles.authenticatingContainer}>
                  <ActivityIndicator size="large" color={accentColor} />
                  <FluentText variant="body2" color="secondary" style={{ marginTop: FluentSpacing.m }}>
                    Waiting for sign-in...
                  </FluentText>
                  <FluentText variant="caption1" color="tertiary" style={{ marginTop: FluentSpacing.xs }}>
                    Complete sign-in in the popup window
                  </FluentText>
                </View>
              ) : (
                <Pressable 
                  onPress={handleWebAuth}
                  style={({ pressed }) => [
                    styles.signInButton,
                    { backgroundColor: accentColor, opacity: pressed ? 0.9 : 1 }
                  ]}
                >
                  <MaterialCommunityIcons name="login" size={20} color="white" />
                  <FluentText variant="body1" style={{ color: 'white', fontWeight: '600', marginLeft: FluentSpacing.s }}>
                    Sign in with SoundCloud
                  </FluentText>
                </Pressable>
              )}
              
              <FluentText 
                variant="caption1" 
                color="tertiary" 
                style={{ textAlign: 'center', marginTop: FluentSpacing.xl, paddingHorizontal: FluentSpacing.l }}
              >
                A secure sign-in window will open. Your credentials are handled directly by SoundCloud.
              </FluentText>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={[styles.container, { 
        backgroundColor: colors.colorNeutralBackground1,
        paddingTop: insets.top,
      }]}>
        <View style={[styles.header, { borderBottomColor: colors.colorNeutralStroke1 }]}>
          <Pressable onPress={onCancel} style={styles.closeButton}>
            <MaterialCommunityIcons 
              name="close" 
              size={24} 
              color={colors.colorNeutralForeground1} 
            />
          </Pressable>
          <FluentText variant="subtitle1" style={{ fontWeight: '600', flex: 1, textAlign: 'center' }}>
            {title}
          </FluentText>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.progressBar}>
          {isLoading && (
            <View style={[styles.progressIndicator, { backgroundColor: accentColor }]} />
          )}
        </View>

        <WebView
          ref={webViewRef}
          source={{ uri: authUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          style={styles.webView}
          incognito={true}
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accentColor} />
              <FluentText variant="body2" color="secondary" style={{ marginTop: FluentSpacing.m }}>
                Loading SoundCloud...
              </FluentText>
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  webModalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: FluentRadius.xLarge,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.s,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    height: 3,
    backgroundColor: 'transparent',
  },
  progressIndicator: {
    height: 3,
    width: '30%',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  webAuthContent: {
    padding: FluentSpacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authenticatingContainer: {
    marginTop: FluentSpacing.xxl,
    alignItems: 'center',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.xl,
    borderRadius: FluentRadius.large,
    marginTop: FluentSpacing.xxl,
    minWidth: 240,
  },
});
