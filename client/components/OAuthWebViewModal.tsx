import React, { useRef, useCallback } from "react";
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
            
            <View style={styles.webFallbackContent}>
              <MaterialCommunityIcons name="open-in-new" size={48} color={accentColor} />
              <FluentText variant="body1" color="secondary" style={styles.webFallbackText}>
                For security, SoundCloud login opens in a new window on web browsers.
              </FluentText>
              <Pressable
                style={[styles.webFallbackButton, { backgroundColor: accentColor }]}
                onPress={() => {
                  window.open(authUrl, '_blank', 'width=500,height=700');
                  onCancel();
                }}
              >
                <FluentText variant="body1" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  Open SoundCloud Login
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
  webFallbackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FluentSpacing.xl,
  },
  webFallbackText: {
    textAlign: 'center',
    marginTop: FluentSpacing.l,
    marginBottom: FluentSpacing.xl,
    lineHeight: 24,
  },
  webFallbackButton: {
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.xl,
    borderRadius: FluentRadius.medium,
  },
});
