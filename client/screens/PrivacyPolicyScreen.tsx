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
            Effective Date: January 16, 2026
          </FluentText>
        </GlassCard>

        <GlassCard style={styles.introCard}>
          <FluentText variant="caption1" color="secondary" style={styles.introText}>
            This Privacy Policy describes how New Audio 360, developed and operated by Dhairya Shah under The Team 360, handles information in connection with your use of the New Audio 360 mobile application. By installing or using the Application, you acknowledge that you have read and understood this Policy.
          </FluentText>
        </GlassCard>

        <View style={styles.sectionsContainer}>
          <PolicySection
            icon="database-off"
            title="1. Information We Do Not Collect"
            content="We do not collect, store, process, or transmit any personally identifiable information, usage analytics, behavioral data, device identifiers, or any other form of personal data. The Application is designed to operate entirely offline without any data collection mechanisms. Your music listening habits, preferences, playlists, and all user-generated content remain exclusively on your device."
            colors={colors}
          />

          <PolicySection
            icon="cellphone"
            title="2. Local Data Storage"
            content="All Application data, including but not limited to playlists, favorites, equalizer settings, theme preferences, and playback history, is stored locally on your device utilizing secure storage mechanisms provided by the operating system. This data never leaves your device and is not accessible to us or any third parties. You retain full control over this data and may delete it at any time by uninstalling the Application or clearing Application data through your device settings."
            colors={colors}
          />

          <PolicySection
            icon="music-box-multiple"
            title="3. Device Permissions"
            content="The Application requests certain device permissions solely for functionality purposes: (a) Media Library Access - to read and display audio files stored on your device; (b) Storage Access - to access music files and save user preferences; (c) Notification Permission - to display media playback controls; (d) Location Permission - solely for online radio country detection, processed locally without transmission. These permissions are used exclusively for stated purposes and do not involve data transmission to external servers."
            colors={colors}
          />

          <PolicySection
            icon="google-play"
            title="4. Purchase and Payment Information"
            content="All purchase transactions are processed exclusively through Google Play Store's secure payment infrastructure. We do not have access to, collect, or store any payment information, credit card details, or financial data. License verification is performed locally on your device by checking the installation source through the operating system's package manager."
            colors={colors}
          />

          <PolicySection
            icon="wifi-off"
            title="5. Network Communications"
            content="The Application functions primarily offline and does not require internet connectivity for core music playback features. The only network communications occur when: (a) accessing online radio streaming services, where only publicly available station data is fetched; (b) the Radio Browser API is queried for station information. No personal data is transmitted during these communications."
            colors={colors}
          />

          <PolicySection
            icon="shield-check"
            title="6. Data Security"
            content="We implement industry-standard security measures to protect locally stored data. Sensitive information such as license status is encrypted using device-level secure storage (Android Keystore). While we take reasonable precautions, no method of electronic storage is 100% secure, and we cannot guarantee absolute security of data stored on your device."
            colors={colors}
          />

          <PolicySection
            icon="account-child-circle"
            title="7. Children's Privacy"
            content="The Application is not directed at children under the age of 13, and we do not knowingly collect any information from children. The Application contains no advertising, in-app tracking, or social features. If you believe a child has provided us with personal information, please contact us immediately."
            colors={colors}
          />

          <PolicySection
            icon="account-group"
            title="8. Third-Party Services"
            content="The Application utilizes open-source libraries and third-party services (such as the Radio Browser API for online radio). These services operate under their own privacy policies. We encourage you to review their respective policies. We are not responsible for the privacy practices of third-party services."
            colors={colors}
          />

          <PolicySection
            icon="update"
            title="9. Changes to This Policy"
            content="We reserve the right to modify this Privacy Policy at any time. Any changes will be reflected in updated versions of the Application with a revised 'Effective Date.' Continued use of the Application following any changes constitutes acceptance of the modified Policy. The fundamental principle that your data remains on your device will not change."
            colors={colors}
          />

          <PolicySection
            icon="scale-balance"
            title="10. Your Rights"
            content="As we do not collect personal data, traditional data subject rights (access, rectification, erasure, portability) are not applicable. However, you maintain complete control over all data stored locally on your device. You may delete all Application data by uninstalling the Application or clearing its data through your device settings."
            colors={colors}
          />

          <PolicySection
            icon="gavel"
            title="11. Governing Law"
            content="This Privacy Policy shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising under this Policy shall be subject to the exclusive jurisdiction of the courts located in India."
            colors={colors}
          />
        </View>

        <View style={styles.footer}>
          <FluentText variant="caption2" color="secondary" align="center" style={{ fontWeight: "600" }}>
            Contact Information
          </FluentText>
          <FluentText
            variant="caption2"
            color="secondary"
            align="center"
            style={{ marginTop: FluentSpacing.xs }}
          >
            For questions or concerns regarding this Privacy Policy, please contact:
          </FluentText>
          <FluentText
            variant="caption2"
            color="secondary"
            align="center"
            style={{ marginTop: FluentSpacing.xs }}
          >
            Dhairya Shah (The Team 360)
          </FluentText>
          <FluentText
            variant="caption2"
            color="secondary"
            align="center"
            style={{ marginTop: FluentSpacing.xxs }}
          >
            Email: support@theteam360.com
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
