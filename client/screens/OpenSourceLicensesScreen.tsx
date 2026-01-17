import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";

interface LicenseSectionProps {
  title: string;
  content: string;
  colors: typeof FluentLightColors;
}

function LicenseSection({ title, content, colors }: LicenseSectionProps) {
  return (
    <View style={[styles.licenseSection, { backgroundColor: colors.colorNeutralBackground2 }]}>
      <FluentText variant="body1" style={styles.licenseSectionTitle}>
        {title}
      </FluentText>
      <FluentText variant="caption1" color="secondary" style={styles.licenseSectionContent}>
        {content}
      </FluentText>
    </View>
  );
}

const OPEN_SOURCE_LIBRARIES = [
  { name: "React Native", license: "MIT License" },
  { name: "Expo", license: "MIT License" },
  { name: "React Navigation", license: "MIT License" },
  { name: "React Native Reanimated", license: "MIT License" },
  { name: "React Native Track Player", license: "Apache 2.0 License" },
  { name: "Expo AV", license: "MIT License" },
  { name: "Expo Media Library", license: "MIT License" },
  { name: "Expo Haptics", license: "MIT License" },
  { name: "Expo Notifications", license: "MIT License" },
  { name: "Expo Location", license: "MIT License" },
  { name: "Expo Local Authentication", license: "MIT License" },
  { name: "Expo Application", license: "MIT License" },
  { name: "Expo Linear Gradient", license: "MIT License" },
  { name: "AsyncStorage", license: "MIT License" },
  { name: "Expo Secure Store", license: "MIT License" },
  { name: "Material Community Icons", license: "SIL Open Font License" },
];

export default function OpenSourceLicensesScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  return (
    <FluentScreenLayout hasBottomNavigation={true}>
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
            <MaterialCommunityIcons name="license" size={32} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title3" style={styles.headerTitle}>
            Open Source Licenses
          </FluentText>
          <FluentText variant="caption2" color="secondary" align="center">
            Third-party software acknowledgments
          </FluentText>
        </GlassCard>

        <GlassCard style={styles.copyrightCard}>
          <View style={[styles.warningIcon, { backgroundColor: colors.colorPaletteRedForeground1 + "20" }]}>
            <MaterialCommunityIcons name="shield-alert" size={24} color={colors.colorPaletteRedForeground1} />
          </View>
          <FluentText variant="subtitle2" style={styles.copyrightTitle}>
            Intellectual Property Notice
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.copyrightText}>
            Copyright © 2024-2026 Dhairya Shah (The Team 360). All rights reserved.
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.copyrightText}>
            This application, including but not limited to its source code, design, user interface, graphics, audio processing algorithms, and all associated intellectual property, is the exclusive property of Dhairya Shah operating under The Team 360.
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.copyrightText}>
            UNAUTHORIZED REPRODUCTION PROHIBITED: No part of this application may be reproduced, distributed, transmitted, copied, reverse-engineered, decompiled, disassembled, or utilized in any form or by any means, whether electronic, mechanical, photocopying, recording, or otherwise, without the prior express written authorization and consent of the developer.
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.copyrightText}>
            Any unauthorized use, reproduction, modification, or distribution of this software or any portion thereof may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent permitted by law.
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.copyrightText}>
            For licensing inquiries or permission requests, please contact: support@theteam360.com
          </FluentText>
        </GlassCard>

        <View style={styles.sectionsContainer}>
          <FluentText variant="subtitle2" style={styles.sectionHeader}>
            Third-Party Libraries
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.sectionDescription}>
            This application incorporates the following open-source software components, each governed by their respective licenses:
          </FluentText>

          {OPEN_SOURCE_LIBRARIES.map((lib, index) => (
            <View 
              key={index} 
              style={[styles.libraryItem, { backgroundColor: colors.colorNeutralBackground2 }]}
            >
              <View style={styles.libraryInfo}>
                <MaterialCommunityIcons 
                  name="package-variant" 
                  size={FluentIconSize.small} 
                  color={colors.colorBrandForeground1} 
                />
                <FluentText variant="body2" style={styles.libraryName}>
                  {lib.name}
                </FluentText>
              </View>
              <FluentText variant="caption2" color="secondary">
                {lib.license}
              </FluentText>
            </View>
          ))}

          <LicenseSection
            title="MIT License"
            content="Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND."
            colors={colors}
          />

          <LicenseSection
            title="Apache License 2.0"
            content="Licensed under the Apache License, Version 2.0. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0. Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied."
            colors={colors}
          />
        </View>

        <View style={styles.footer}>
          <FluentText variant="caption2" color="secondary" align="center">
            The use of third-party open-source components does not grant any rights to the proprietary portions of this application.
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
  copyrightCard: {
    marginBottom: FluentSpacing.l,
    padding: FluentSpacing.l,
  },
  warningIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: FluentSpacing.m,
  },
  copyrightTitle: {
    textAlign: "center",
    marginBottom: FluentSpacing.m,
    fontWeight: "700",
  },
  copyrightText: {
    textAlign: "justify",
    lineHeight: 18,
    marginBottom: FluentSpacing.s,
  },
  sectionsContainer: {
    gap: FluentSpacing.s,
  },
  sectionHeader: {
    marginBottom: FluentSpacing.xs,
  },
  sectionDescription: {
    marginBottom: FluentSpacing.m,
    lineHeight: 18,
  },
  libraryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
  libraryInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  libraryName: {
    marginLeft: FluentSpacing.s,
  },
  licenseSection: {
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    marginTop: FluentSpacing.m,
  },
  licenseSectionTitle: {
    marginBottom: FluentSpacing.xs,
    fontWeight: "600",
  },
  licenseSectionContent: {
    lineHeight: 16,
    textAlign: "justify",
  },
  footer: {
    paddingVertical: FluentSpacing.xl,
    alignItems: "center",
  },
});
