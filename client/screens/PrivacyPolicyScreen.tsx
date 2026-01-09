import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";

interface PolicySectionProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  content: string;
  theme: any;
}

function PolicySection({ icon, title, content, theme }: PolicySectionProps) {
  return (
    <View style={[styles.policySection, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={styles.policySectionHeader}>
        <MaterialCommunityIcons name={icon} size={FluentIconSize.small} color={theme.primary} />
        <ThemedText type="body" style={styles.policySectionTitle}>
          {title}
        </ThemedText>
      </View>
      <ThemedText type="small" style={[styles.policySectionContent, { color: theme.textSecondary }]}>
        {content}
      </ThemedText>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeTabBarHeight();
  const { theme } = useThemeContext();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.m, paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <GlassCard style={styles.headerCard}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
            <MaterialCommunityIcons name="shield-lock" size={32} color={theme.primary} />
          </View>
          <ThemedText type="h4" style={styles.headerTitle}>
            Privacy Policy
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Last updated: January 2026
          </ThemedText>
        </GlassCard>

        <GlassCard style={styles.introCard}>
          <ThemedText type="small" style={[styles.introText, { color: theme.textSecondary }]}>
            New Audio 360 is designed with your privacy as a top priority. This app operates 100% offline and does not collect, transmit, or share any personal data with external servers.
          </ThemedText>
        </GlassCard>

        <View style={styles.sectionsContainer}>
          <PolicySection
            icon="database-off"
            title="No Data Collection"
            content="We do not collect any personal information, usage data, analytics, or tracking information. Your music listening habits and preferences remain entirely private on your device."
            theme={theme}
          />

          <PolicySection
            icon="cellphone"
            title="Local Storage Only"
            content="All app data including playlists, favorites, settings, and preferences are stored locally on your device using secure storage mechanisms. No data is ever transmitted to external servers."
            theme={theme}
          />

          <PolicySection
            icon="music-box-multiple"
            title="Media Library Access"
            content="The app requests permission to access your device's music library to display and play your audio files. This access is used solely for playing music and is never used to upload or share your files."
            theme={theme}
          />

          <PolicySection
            icon="bell"
            title="Notification Permission"
            content="Notification permission is requested to display now-playing media controls in your notification bar. This is a standard feature for music players and does not involve sending any data externally."
            theme={theme}
          />

          <PolicySection
            icon="folder-image"
            title="Photos & Videos Access"
            content="If granted, this permission allows the app to access album artwork and media thumbnails to enhance your music browsing experience. No images are uploaded or shared."
            theme={theme}
          />

          <PolicySection
            icon="wifi-off"
            title="No Internet Required"
            content="New Audio 360 functions entirely offline. The app does not require an internet connection to operate, and no network requests are made during normal use."
            theme={theme}
          />

          <PolicySection
            icon="google-play"
            title="In-App Purchases"
            content="Purchase transactions are handled securely through the Google Play Store. We do not store or have access to your payment information. Purchase verification is done locally on your device."
            theme={theme}
          />

          <PolicySection
            icon="shield-check"
            title="Data Security"
            content="Your subscription data and preferences are protected using device-level encryption. The app includes integrity checks to ensure your data has not been tampered with."
            theme={theme}
          />

          <PolicySection
            icon="account-child-circle"
            title="Children's Privacy"
            content="This app does not knowingly collect any information from children. The app is designed for general audiences and contains no advertising or tracking."
            theme={theme}
          />

          <PolicySection
            icon="update"
            title="Policy Updates"
            content="Any changes to this privacy policy will be reflected in app updates. We will never change the fundamental principle that your data stays on your device."
            theme={theme}
          />
        </View>

        <View style={styles.footer}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
            By: Dhairya Shah (The Team 360)
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, textAlign: "center", marginTop: FluentSpacing.xs }}
          >
            Contact: team360@example.com
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: FluentSpacing.l,
  },
  headerCard: {
    alignItems: "center",
    marginBottom: FluentSpacing.l,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: FluentSpacing.m,
  },
  headerTitle: {
    marginBottom: FluentSpacing.xs,
  },
  introCard: {
    marginBottom: FluentSpacing.l,
  },
  introText: {
    textAlign: "center",
    lineHeight: 20,
  },
  sectionsContainer: {
    gap: FluentSpacing.s,
  },
  policySection: {
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
  policySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.xs,
  },
  policySectionTitle: {
    marginLeft: FluentSpacing.s,
    fontWeight: "600",
  },
  policySectionContent: {
    lineHeight: 18,
  },
  footer: {
    paddingVertical: FluentSpacing.xl,
    alignItems: "center",
  },
});
