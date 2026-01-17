import React from "react";
import { View, StyleSheet, ScrollView, Linking, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";

export default function AboutScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const handleLinkPress = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

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
          { paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: colors.colorBrandForeground1 + "20" }]}>
            <MaterialCommunityIcons name="music-circle" size={FluentIconSize.xxlarge} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title1" style={styles.appName}>
            New Audio 360
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.version}>
            Version 1.0
          </FluentText>
        </View>

        <GlassCard style={styles.descriptionCard}>
          <FluentText variant="caption1" color="secondary" style={styles.description}>
            A beautiful music player designed with love for audio enthusiasts. 
            Experience your music collection like never before with our carefully 
            crafted equalizer presets and immersive sound modes.
          </FluentText>
        </GlassCard>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="star" size={FluentIconSize.small} color={colors.colorBrandForeground1} />
            <FluentText variant="body1" style={styles.sectionTitle}>
              Features
            </FluentText>
          </View>
          <View style={styles.featuresList}>
            <FeatureItem
              icon="music"
              title="Music Library"
              description="Organize and browse your music collection"
              colors={colors}
            />
            <FeatureItem
              icon="tune-vertical"
              title="Sound Lab"
              description="Professional equalizer presets and sound modes"
              colors={colors}
            />
            <FeatureItem
              icon="palette"
              title="55 Themes"
              description="Beautiful skins from iconic music players"
              colors={colors}
            />
            <FeatureItem
              icon="headphones"
              title="Immersive Audio"
              description="Cinema, Music, Sports, and 360 Reality modes"
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="scale-balance" size={FluentIconSize.small} color={colors.colorBrandForeground1} />
            <FluentText variant="body1" style={styles.sectionTitle}>
              Legal
            </FluentText>
          </View>
          <View style={styles.legalLinks}>
            <Pressable
              style={[styles.linkItem, { backgroundColor: colors.colorNeutralBackground2 }]}
              onPress={handlePrivacyPolicyPress}
            >
              <MaterialCommunityIcons name="shield-lock-outline" size={FluentIconSize.small} color={colors.colorNeutralForeground1} />
              <FluentText variant="caption1" style={styles.linkText}>
                Privacy Policy
              </FluentText>
              <MaterialCommunityIcons name="chevron-right" size={FluentIconSize.small} color={colors.colorNeutralForeground2} />
            </Pressable>
            <Pressable
              style={[styles.linkItem, { backgroundColor: colors.colorNeutralBackground2 }]}
              onPress={handleOpenSourceLicensesPress}
            >
              <MaterialCommunityIcons name="license" size={FluentIconSize.small} color={colors.colorNeutralForeground1} />
              <FluentText variant="caption1" style={styles.linkText}>
                Open Source Licenses
              </FluentText>
              <MaterialCommunityIcons name="chevron-right" size={FluentIconSize.small} color={colors.colorNeutralForeground2} />
            </Pressable>
          </View>
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

function FeatureItem({
  icon,
  title,
  description,
  colors,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  colors: typeof FluentLightColors;
}) {
  return (
    <View style={[styles.featureItem, { backgroundColor: colors.colorNeutralBackground2 }]}>
      <View style={[styles.featureIcon, { backgroundColor: colors.colorBrandForeground1 + "20" }]}>
        <MaterialCommunityIcons name={icon} size={FluentIconSize.small} color={colors.colorBrandForeground1} />
      </View>
      <View style={styles.featureText}>
        <FluentText variant="caption1" style={{ fontWeight: "600" }}>
          {title}
        </FluentText>
        <FluentText variant="caption2" color="secondary">
          {description}
        </FluentText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: FluentSpacing.l,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: FluentSpacing.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: FluentControlRadius.avatar,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  appName: {
    fontWeight: "700",
  },
  version: {
    marginTop: FluentSpacing.xs,
  },
  descriptionCard: {
    marginBottom: FluentSpacing.xl,
  },
  description: {
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: FluentSpacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  sectionTitle: {
    marginLeft: FluentSpacing.xs,
    fontWeight: "600",
  },
  featuresList: {
    gap: FluentSpacing.xs,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
  featureIcon: {
    width: FluentIconSize.xxlarge,
    height: FluentIconSize.xxlarge,
    borderRadius: FluentControlRadius.avatar,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  legalLinks: {
    gap: FluentSpacing.xs,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
  linkText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  footer: {
    paddingVertical: FluentSpacing.l,
    alignItems: "center",
  },
});
