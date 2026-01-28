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
  const { theme, isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = React.useState(true);

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

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth_callback' && event.data?.url) {
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
      }
    };
  }, [visible, onSuccess]);

  const handleWebAuth = useCallback(() => {
    const popup = window.open(authUrl, 'soundcloud_auth', 'width=500,height=700,left=200,top=100');
    popupRef.current = popup;
    
    pollIntervalRef.current = setInterval(() => {
      try {
        if (popup?.closed) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          return;
        }
        
        const currentUrl = popup?.location?.href;
        if (currentUrl && (currentUrl.includes('code=') || currentUrl.startsWith(redirectUri))) {
          onSuccess(currentUrl);
          popup?.close();
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch (e) {
      }
    }, 500);
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
            
            <View style={styles.iframeContainer}>
              {isLoading && (
                <View style={styles.iframeLoading}>
                  <ActivityIndicator size="large" color={accentColor} />
                  <FluentText variant="body2" color="secondary" style={{ marginTop: FluentSpacing.m }}>
                    Loading SoundCloud...
                  </FluentText>
                </View>
              )}
              <iframe
                ref={iframeRef as any}
                src={authUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: isLoading ? 'none' : 'block',
                }}
                onLoad={() => {
                  setIsLoading(false);
                  try {
                    const iframe = iframeRef.current;
                    const iframeSrc = iframe?.contentWindow?.location?.href;
                    if (iframeSrc && (iframeSrc.includes('code=') || iframeSrc.startsWith(redirectUri))) {
                      onSuccess(iframeSrc);
                    }
                  } catch (e) {
                  }
                }}
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
              />
            </View>
            
            <View style={styles.webFallbackFooter}>
              <FluentText variant="caption1" color="secondary" style={{ textAlign: 'center' }}>
                If login doesn't appear above, 
              </FluentText>
              <Pressable onPress={handleWebAuth}>
                <FluentText variant="caption1" style={{ color: accentColor, textDecorationLine: 'underline' }}>
                  click here to open in popup
                </FluentText>
              </Pressable>
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
    maxWidth: 480,
    height: '80%',
    borderRadius: FluentRadius.large,
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
  iframeContainer: {
    flex: 1,
    position: 'relative',
  },
  iframeLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    zIndex: 1,
  },
  webFallbackFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: FluentSpacing.m,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});
