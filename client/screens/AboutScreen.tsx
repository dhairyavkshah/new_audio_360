import React from "react";
import { View, StyleSheet, ScrollView, Linking, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeTabBarHeight();
  const { theme } = useThemeContext();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const handleLinkPress = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  const handlePrivacyPolicyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("PrivacyPolicy");
  };

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
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primary + "20" }]}>
            <MaterialCommunityIcons name="music-circle" size={FluentIconSize.xxlarge} color={theme.primary} />
          </View>
          <ThemedText type="h3" style={styles.appName}>
            New Audio 360
          </ThemedText>
          <ThemedText type="small" style={[styles.version, { color: theme.textSecondary }]}>
            Version 1.0.0
          </ThemedText>
        </View>

        <GlassCard style={styles.descriptionCard}>
          <ThemedText type="small" style={[styles.description, { color: theme.textSecondary }]}>
            A beautiful music player designed with love for audio enthusiasts. 
            Experience your music collection like never before with our carefully 
            crafted equalizer presets and immersive sound modes.
          </ThemedText>
        </GlassCard>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="star" size={FluentIconSize.small} color={theme.primary} />
            <ThemedText type="body" style={styles.sectionTitle}>
              Features
            </ThemedText>
          </View>
          <View style={styles.featuresList}>
            <FeatureItem
              icon="music"
              title="Music Library"
              description="Organize and browse your music collection"
              theme={theme}
            />
            <FeatureItem
              icon="tune-vertical"
              title="Sound Lab"
              description="Professional equalizer presets and sound modes"
              theme={theme}
            />
            <FeatureItem
              icon="palette"
              title="55 Themes"
              description="Beautiful skins from iconic music players"
              theme={theme}
            />
            <FeatureItem
              icon="headphones"
              title="Immersive Audio"
              description="Cinema, Music, Sports, and 360 Reality modes"
              theme={theme}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="scale-balance" size={FluentIconSize.small} color={theme.primary} />
            <ThemedText type="body" style={styles.sectionTitle}>
              Legal
            </ThemedText>
          </View>
          <View style={styles.legalLinks}>
            <Pressable
              style={[styles.linkItem, { backgroundColor: theme.backgroundSecondary }]}
            >
              <MaterialCommunityIcons name="file-document-outline" size={FluentIconSize.small} color={theme.text} />
              <ThemedText type="small" style={styles.linkText}>
                Terms of Service
              </ThemedText>
              <MaterialCommunityIcons name="chevron-right" size={FluentIconSize.small} color={theme.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.linkItem, { backgroundColor: theme.backgroundSecondary }]}
              onPress={handlePrivacyPolicyPress}
            >
              <MaterialCommunityIcons name="shield-lock-outline" size={FluentIconSize.small} color={theme.text} />
              <ThemedText type="small" style={styles.linkText}>
                Privacy Policy
              </ThemedText>
              <MaterialCommunityIcons name="chevron-right" size={FluentIconSize.small} color={theme.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.linkItem, { backgroundColor: theme.backgroundSecondary }]}
            >
              <MaterialCommunityIcons name="license" size={FluentIconSize.small} color={theme.text} />
              <ThemedText type="small" style={styles.linkText}>
                Open Source Licenses
              </ThemedText>
              <MaterialCommunityIcons name="chevron-right" size={FluentIconSize.small} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
            By: Dhairya Shah (The Team 360)
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, textAlign: "center", marginTop: FluentSpacing.xs }}
          >
            Made with love in India
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, textAlign: "center", marginTop: FluentSpacing.xs }}
          >
            2024-2026 New Audio 360. All rights reserved.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function FeatureItem({
  icon,
  title,
  description,
  theme,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  theme: any;
}) {
  return (
    <View style={[styles.featureItem, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.featureIcon, { backgroundColor: theme.primary + "20" }]}>
        <MaterialCommunityIcons name={icon} size={FluentIconSize.small} color={theme.primary} />
      </View>
      <View style={styles.featureText}>
        <ThemedText type="small" style={{ fontWeight: "600" }}>
          {title}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
