import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";

interface PolicySectionProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  content: string;
  colors: typeof FluentLightColors;
}

function PolicySection({ icon, title, content, colors }: PolicySectionProps) {
  return (
    <View style={[styles.policySection, { backgroundColor: colors.colorNeutralBackground2 }]}>
      <View style={styles.policySectionHeader}>
        <MaterialCommunityIcons name={icon} size={FluentIconSize.small} color={colors.colorBrandForeground1} />
        <FluentText variant="body1" style={styles.policySectionTitle}>
          {title}
        </FluentText>
      </View>
      <FluentText variant="caption1" color="secondary" style={styles.policySectionContent}>
        {content}
      </FluentText>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  return (
    <FluentScreenLayout edges={[]} hasBottomNavigation={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.m, paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <GlassCard style={styles.headerCard}>
          <View style={[styles.iconContainer, { backgroundColor: colors.colorBrandForeground1 + "20" }]}>
            <MaterialCommunityIcons name="shield-lock" size={32} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title3" style={styles.headerTitle}>
            Privacy Policy
          </FluentText>
          <FluentText variant="caption2" color="secondary" align="center">
            Last updated: January 2026
          </FluentText>
        </GlassCard>

        <GlassCard style={styles.introCard}>
          <FluentText variant="caption1" color="secondary" style={styles.introText}>
            New Audio 360 is designed with your privacy as a top priority. This app operates 100% offline and does not collect, transmit, or share any personal data with external servers.
          </FluentText>
        </GlassCard>

        <View style={styles.sectionsContainer}>
          <PolicySection
            icon="database-off"
            title="No Data Collection"
            content="We do not collect any personal information, usage data, analytics, or tracking information. Your music listening habits and preferences remain entirely private on your device."
            colors={colors}
          />

          <PolicySection
            icon="cellphone"
            title="Local Storage Only"
            content="All app data including playlists, favorites, settings, and preferences are stored locally on your device using secure storage mechanisms. No data is ever transmitted to external servers."
            colors={colors}
          />

          <PolicySection
            icon="music-box-multiple"
            title="Media Library Access"
            content="The app requests permission to access your device's music library to display and play your audio files. This access is used solely for playing music and is never used to upload or share your files."
            colors={colors}
          />

          <PolicySection
            icon="bell"
            title="Notification Permission"
            content="Notification permission is requested to display now-playing media controls in your notification bar. This is a standard feature for music players and does not involve sending any data externally."
            colors={colors}
          />

          <PolicySection
            icon="folder-image"
            title="Photos & Videos Access"
            content="If granted, this permission allows the app to access album artwork and media thumbnails to enhance your music browsing experience. No images are uploaded or shared."
            colors={colors}
          />

          <PolicySection
            icon="wifi-off"
            title="No Internet Required"
            content="New Audio 360 functions entirely offline. The app does not require an internet connection to operate, and no network requests are made during normal use."
            colors={colors}
          />

          <PolicySection
            icon="google-play"
            title="In-App Purchases"
            content="Purchase transactions are handled securely through the Google Play Store. We do not store or have access to your payment information. Purchase verification is done locally on your device."
            colors={colors}
          />

          <PolicySection
            icon="shield-check"
            title="Data Security"
            content="Your subscription data and preferences are protected using device-level encryption. The app includes integrity checks to ensure your data has not been tampered with."
            colors={colors}
          />

          <PolicySection
            icon="account-child-circle"
            title="Children's Privacy"
            content="This app does not knowingly collect any information from children. The app is designed for general audiences and contains no advertising or tracking."
            colors={colors}
          />

          <PolicySection
            icon="update"
            title="Policy Updates"
            content="Any changes to this privacy policy will be reflected in app updates. We will never change the fundamental principle that your data stays on your device."
            colors={colors}
          />
        </View>

        <View style={styles.footer}>
          <FluentText variant="caption2" color="secondary" align="center">
            By: Dhairya Shah (The Team 360)
          </FluentText>
          <FluentText
            variant="caption2"
            color="secondary"
            align="center"
            style={{ marginTop: FluentSpacing.xs }}
          >
            Contact: team360@example.com
          </FluentText>
        </View>
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
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
