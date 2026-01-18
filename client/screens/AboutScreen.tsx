import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentRadius, FluentIconSize, FluentLightColors, FluentDarkColors, FluentFontWeight } from "@/constants/fluent2";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";

function SectionHeader({ title, isDark }: { title: string; isDark: boolean }) {
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  return (
    <FluentText 
      variant="caption2" 
      style={[styles.sectionHeader, { color: colors.colorNeutralForeground2, fontWeight: FluentFontWeight.medium }]}
    >
      {title.toUpperCase()}
    </FluentText>
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

type SettingsItemProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showDivider?: boolean;
  isDark: boolean;
};

function SettingsItem({ icon, iconColor, title, subtitle, onPress, showDivider = true, isDark }: SettingsItemProps) {
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  
  const handlePress = () => {
    if (!onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  
  return (
    <>
      <Pressable
        onPress={handlePress}
        disabled={!onPress}
        style={styles.settingsItem}
        accessibilityRole="button"
        accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}
      >
        <View style={styles.settingsItemLeft}>
          <View style={[styles.featureIcon, { backgroundColor: (iconColor || colors.colorBrandForeground1) + "15" }]}>
            <MaterialCommunityIcons name={icon} size={FluentIconSize.small} color={iconColor || colors.colorBrandForeground1} />
          </View>
          <View style={styles.settingsItemText}>
            <FluentText variant="body2" style={{ color: colors.colorNeutralForeground1 }}>
              {title}
            </FluentText>
            {subtitle ? (
              <FluentText variant="caption2" style={{ color: colors.colorNeutralForeground2, marginTop: 2 }}>
                {subtitle}
              </FluentText>
            ) : null}
          </View>
        </View>
        {onPress ? (
          <MaterialCommunityIcons name="chevron-right" size={FluentIconSize.small} color={colors.colorNeutralForeground2} />
        ) : null}
      </Pressable>
      {showDivider && <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />}
    </>
  );
}

export default function AboutScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const handlePrivacyPolicyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("PrivacyPolicy");
  };

  const handleOpenSourceLicensesPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("OpenSourceLicenses");
  };

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
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.appIcon}
            resizeMode="contain"
          />
          <FluentText variant="title1" style={styles.appName}>
            New Audio 360
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.version}>
            Version 1.0
          </FluentText>
        </View>

        <SectionCard isDark={isDark}>
          <View style={styles.descriptionContainer}>
            <FluentText variant="caption1" color="secondary" style={styles.description}>
              A beautiful music player designed with love for audio enthusiasts. 
              Experience your music collection like never before with our carefully 
              crafted equalizer presets and immersive sound modes.
            </FluentText>
          </View>
        </SectionCard>

        <SectionHeader title="Features" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <SettingsItem
            icon="music"
            title="Music Library"
            subtitle="Organize and browse your music collection"
            isDark={isDark}
          />
          <SettingsItem
            icon="tune-vertical"
            title="Sound Lab"
            subtitle="Professional equalizer presets and sound modes"
            isDark={isDark}
          />
          <SettingsItem
            icon="palette"
            title="55 Themes"
            subtitle="Beautiful skins from iconic music players"
            isDark={isDark}
          />
          <SettingsItem
            icon="headphones"
            title="Immersive Audio"
            subtitle="Cinema, Music, Sports, and 360 Reality modes"
            showDivider={false}
            isDark={isDark}
          />
        </SectionCard>

        <SectionHeader title="Legal" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <SettingsItem
            icon="shield-lock-outline"
            title="Privacy Policy"
            subtitle="How we protect your data"
            onPress={handlePrivacyPolicyPress}
            isDark={isDark}
          />
          <SettingsItem
            icon="license"
            title="Open Source Licenses"
            subtitle="Third-party software acknowledgments"
            onPress={handleOpenSourceLicensesPress}
            showDivider={false}
            isDark={isDark}
          />
        </SectionCard>

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
            Made with love in India
          </FluentText>
          <FluentText
            variant="caption2"
            color="secondary"
            align="center"
            style={{ marginTop: FluentSpacing.xs }}
          >
            2024-2026 New Audio 360. All rights reserved.
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
  logoContainer: {
    alignItems: "center",
    marginTop: FluentSpacing.l,
    marginBottom: FluentSpacing.xl,
  },
  appIcon: {
    width: 96,
    height: 96,
    borderRadius: FluentRadius.xLarge,
    marginBottom: FluentSpacing.m,
  },
  appName: {
    fontWeight: FluentFontWeight.bold,
  },
  version: {
    marginTop: FluentSpacing.xs,
  },
  sectionHeader: {
    paddingLeft: FluentSpacing.l,
    paddingTop: FluentSpacing.s,
    paddingBottom: FluentSpacing.s,
    marginTop: FluentSpacing.xxl,
  },
  sectionCard: {
    marginHorizontal: FluentSpacing.l,
    borderRadius: FluentRadius.xLarge,
    overflow: "hidden",
  },
  descriptionContainer: {
    padding: FluentSpacing.l,
  },
  description: {
    textAlign: "center",
    lineHeight: 20,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    paddingLeft: FluentSpacing.l,
    paddingRight: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: FluentSpacing.m,
  },
  settingsItemText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: FluentRadius.circular,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    marginLeft: FluentSpacing.l + 36 + FluentSpacing.m,
  },
  footer: {
    paddingVertical: FluentSpacing.xxl,
    alignItems: "center",
  },
});
