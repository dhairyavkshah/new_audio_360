import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentRadius, FluentIconSize, FluentLightColors, FluentDarkColors, FluentFontWeight } from "@/constants/fluent2";

interface PolicySectionProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  content: string;
  colors: typeof FluentLightColors;
  showDivider?: boolean;
}

function PolicySection({ icon, title, content, colors, showDivider = true }: PolicySectionProps) {
  return (
    <>
      <View style={styles.policyItem}>
        <View style={styles.policyItemHeader}>
          <MaterialCommunityIcons name={icon} size={FluentIconSize.medium} color={colors.colorBrandForeground1} />
          <FluentText variant="body2" style={[styles.policyItemTitle, { color: colors.colorNeutralForeground1 }]}>
            {title}
          </FluentText>
        </View>
        <FluentText variant="caption1" color="secondary" style={styles.policyItemContent}>
          {content}
        </FluentText>
      </View>
      {showDivider && <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />}
    </>
  );
}

function SectionCard({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
      {children}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + FluentSpacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <View style={styles.headerSection}>
          <View style={[styles.iconContainer, { backgroundColor: colors.colorBrandForeground1 + "20" }]}>
            <MaterialCommunityIcons name="shield-lock" size={FluentIconSize.xlarge} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title2" style={styles.headerTitle}>
            Privacy Policy
          </FluentText>
          <FluentText variant="caption1" color="secondary" align="center">
            Effective Date: January 17, 2026
          </FluentText>
        </View>

        <SectionCard isDark={isDark}>
          <View style={styles.introContainer}>
            <FluentText variant="caption1" color="secondary" style={styles.introText}>
              This Privacy Policy describes how New Audio 360, developed and operated by Dhairya Shah under The Team 360, handles information in connection with your use of the New Audio 360 mobile application. By installing or using the Application, you acknowledge that you have read and understood this Policy.
            </FluentText>
          </View>
        </SectionCard>

        <View style={styles.policySections}>
          <SectionCard isDark={isDark}>
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
              showDivider={false}
            />
          </SectionCard>
        </View>

        <View style={styles.footer}>
          <FluentText variant="caption1" color="secondary" align="center" style={{ fontWeight: FluentFontWeight.semibold }}>
            Contact Information
          </FluentText>
          <FluentText variant="caption2" color="secondary" align="center" style={{ marginTop: FluentSpacing.xs }}>
            For questions or concerns regarding this Privacy Policy, please contact:
          </FluentText>
          <FluentText variant="caption2" color="secondary" align="center" style={{ marginTop: FluentSpacing.xs }}>
            Dhairya Shah (The Team 360)
          </FluentText>
          <FluentText variant="caption2" color="secondary" align="center" style={{ marginTop: 2 }}>
            Email: support@theteam360.com
          </FluentText>
        </View>
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: FluentSpacing.l,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: FluentSpacing.xl,
    paddingHorizontal: FluentSpacing.l,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: FluentRadius.circular,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: FluentSpacing.m,
  },
  headerTitle: {
    marginBottom: FluentSpacing.xs,
    fontWeight: FluentFontWeight.semibold,
  },
  sectionCard: {
    marginHorizontal: FluentSpacing.l,
    borderRadius: FluentRadius.xLarge,
    overflow: "hidden",
  },
  introContainer: {
    padding: FluentSpacing.l,
  },
  introText: {
    textAlign: "center",
    lineHeight: 20,
  },
  policySections: {
    marginTop: FluentSpacing.l,
  },
  policyItem: {
    padding: FluentSpacing.l,
  },
  policyItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.s,
  },
  policyItemTitle: {
    marginLeft: FluentSpacing.m,
    fontWeight: FluentFontWeight.semibold,
    flex: 1,
  },
  policyItemContent: {
    lineHeight: 20,
    marginLeft: FluentIconSize.medium + FluentSpacing.m,
  },
  divider: {
    height: 1,
    marginLeft: FluentSpacing.l,
    marginRight: FluentSpacing.l,
  },
  footer: {
    paddingVertical: FluentSpacing.xxl,
    paddingHorizontal: FluentSpacing.l,
    alignItems: "center",
  },
});
