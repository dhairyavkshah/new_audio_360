import React from "react";
import { View, StyleSheet, ScrollView, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText, FluentListItem, FluentSectionHeader } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize, FluentTouchTarget, FluentLightColors, FluentDarkColors, getShadowStyle } from "@/constants/fluent2";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";

export default function AboutScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

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
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.appIcon}
            resizeMode="contain"
          />
          <FluentText variant="title1" style={styles.appName}>
            New Audio 360
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.version}>
            Version 26.0
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
          <FluentSectionHeader icon="star" title="Features" />
          <View style={styles.featuresList}>
            <FeatureItem
              icon="music"
              title="Music Library"
              description="Organize and browse your music collection"
              colors={colors}
              isDark={isDark}
            />
            <FeatureItem
              icon="tune-vertical"
              title="Sound Lab"
              description="Professional equalizer presets and sound modes"
              colors={colors}
              isDark={isDark}
            />
            <FeatureItem
              icon="palette"
              title="55 Themes"
              description="Beautiful skins from iconic music players"
              colors={colors}
              isDark={isDark}
            />
            <FeatureItem
              icon="headphones"
              title="Immersive Audio"
              description="Cinema, Music, Sports, and 360 Reality modes"
              colors={colors}
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.section}>
          <FluentSectionHeader icon="scale-balance" title="Legal" />
          <View style={styles.legalLinks}>
            <FluentListItem
              icon="shield-lock-outline"
              title="Privacy Policy"
              onPress={() => navigation.navigate("PrivacyPolicy")}
            />
            <FluentListItem
              icon="license"
              title="Open Source Licenses"
              onPress={() => navigation.navigate("OpenSourceLicenses")}
            />
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
  isDark,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  colors: typeof FluentLightColors;
  isDark: boolean;
}) {
  return (
    <View style={[styles.featureItem, { backgroundColor: colors.colorNeutralBackground2 }, getShadowStyle('shadow2', isDark)]}>
      <View style={[styles.featureIcon, { backgroundColor: colors.colorBrandForeground1 + "20" }]}>
        <MaterialCommunityIcons name={icon} size={FluentIconSize.medium} color={colors.colorBrandForeground1} />
      </View>
      <View style={styles.featureText}>
        <FluentText variant="body1Strong">
          {title}
        </FluentText>
        <FluentText variant="caption1" color="secondary">
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
    marginTop: FluentSpacing.xl,
    marginBottom: FluentSpacing.xl,
  },
  appIcon: {
    width: 96,
    height: 96,
    borderRadius: FluentControlRadius.card,
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
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.card,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  legalLinks: {
    gap: FluentSpacing.s,
  },
  footer: {
    paddingVertical: FluentSpacing.l,
    alignItems: "center",
  },
});
