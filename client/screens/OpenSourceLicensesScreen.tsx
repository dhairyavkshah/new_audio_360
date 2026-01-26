import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
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
  { name: "React Native", license: "MIT License", version: "0.79.2" },
  { name: "Expo SDK", license: "MIT License", version: "53.0.0" },
  { name: "React Navigation", license: "MIT License", version: "7.x" },
  { name: "React Native Reanimated", license: "MIT License", version: "3.x" },
  { name: "React Native Track Player", license: "Apache License 2.0", version: "4.x" },
  { name: "React Native IAP", license: "MIT License", version: "12.x" },
  { name: "Expo AV", license: "MIT License", version: "~15.x" },
  { name: "Expo Media Library", license: "MIT License", version: "~17.x" },
  { name: "Expo Haptics", license: "MIT License", version: "~14.x" },
  { name: "Expo Notifications", license: "MIT License", version: "~0.29.x" },
  { name: "Expo Location", license: "MIT License", version: "~18.x" },
  { name: "Expo Local Authentication", license: "MIT License", version: "~15.x" },
  { name: "Expo Application", license: "MIT License", version: "~6.x" },
  { name: "Expo Linear Gradient", license: "MIT License", version: "~14.x" },
  { name: "Async Storage", license: "MIT License", version: "2.x" },
  { name: "Expo Secure Store", license: "MIT License", version: "~14.x" },
  { name: "Material Community Icons", license: "SIL Open Font License 1.1", version: "7.x" },
];

export default function OpenSourceLicensesScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.m, paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <View style={styles.headerCard}>
          <View style={[styles.iconContainer, { backgroundColor: colors.colorBrandForeground1 + "20" }]}>
            <MaterialCommunityIcons name="scale-balance" size={32} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title3" style={styles.headerTitle}>
            Legal Notices & Attributions
          </FluentText>
          <FluentText variant="caption2" color="secondary" align="center">
            Open Source Software Acknowledgments
          </FluentText>
        </View>

        <View style={styles.copyrightCard}>
          <View style={[styles.warningIcon, { backgroundColor: colors.colorBrandForeground1 + "20" }]}>
            <MaterialCommunityIcons name="copyright" size={24} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="subtitle2" style={styles.copyrightTitle}>
            Proprietary Software Notice
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.copyrightText}>
            Copyright © 2024-2026 Dhairya Vipulkumar Shah, operating as The Team 360. All Rights Reserved Worldwide.
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.copyrightText}>
            This software application, including without limitation, its source code, object code, user interface design, graphical elements, audio processing algorithms, digital signal processing implementations, and all associated documentation and intellectual property rights (collectively, the "Software"), constitutes the sole and exclusive property of the copyright holder.
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.copyrightText}>
            RESTRICTED RIGHTS LEGEND: Use, duplication, or disclosure by any party is subject to restrictions as set forth in the applicable license agreement. This Software is provided under license and may only be used or copied in accordance with the terms of such license.
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.copyrightText}>
            PROHIBITED ACTIVITIES: No portion of this Software may be reproduced, modified, adapted, translated, reverse engineered, decompiled, disassembled, or otherwise reduced to human-readable form without the express prior written consent of The Team 360. Any attempt to do so shall constitute a violation of this license and applicable intellectual property laws.
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.copyrightText}>
            ENFORCEMENT: Unauthorized reproduction, distribution, modification, public display, public performance, or creation of derivative works based upon this Software, in whole or in part, may subject the infringer to civil liability and criminal prosecution under applicable laws, including but not limited to the Copyright Act, Computer Fraud and Abuse Act, and equivalent international statutes.
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.copyrightText}>
            TRADEMARK NOTICE: "New Audio 360" and "The Team 360" are trademarks or registered trademarks of Dhairya Vipulkumar Shah. All other trademarks, service marks, and trade names referenced herein are the property of their respective owners.
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={[styles.copyrightText, { marginTop: FluentSpacing.s }]}>
            For licensing inquiries, permissions, or related matters:{"\n"}support@theteam360.com
          </FluentText>
        </View>

        <View style={styles.sectionsContainer}>
          <FluentText variant="subtitle2" style={styles.sectionHeader}>
            Open Source Components
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.sectionDescription}>
            This application incorporates the following third-party open source software components, each distributed under their respective licenses. We gratefully acknowledge the contributions of the open source community.
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
                <View style={styles.libraryDetails}>
                  <FluentText variant="body2" style={styles.libraryName}>
                    {lib.name}
                  </FluentText>
                  <FluentText variant="caption2" color="tertiary">
                    Version {lib.version}
                  </FluentText>
                </View>
              </View>
              <FluentText variant="caption2" color="secondary">
                {lib.license}
              </FluentText>
            </View>
          ))}

          <LicenseSection
            title="MIT License (Massachusetts Institute of Technology)"
            content={'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.'}
            colors={colors}
          />

          <LicenseSection
            title="Apache License, Version 2.0"
            content={'Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at:\n\nhttp://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.'}
            colors={colors}
          />

          <LicenseSection
            title="SIL Open Font License, Version 1.1"
            content={'This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is available with a FAQ at: http://scripts.sil.org/OFL\n\nThe fonts are free to use, study, modify and redistribute, subject to the conditions in the license. The fonts cannot be sold by themselves but can be bundled with other software.'}
            colors={colors}
          />
        </View>

        <View style={styles.disclaimerSection}>
          <FluentText variant="caption1" color="tertiary" style={styles.disclaimerText}>
            DISCLAIMER: The inclusion and use of the above-listed open source components does not convey or grant any rights or licenses to the proprietary portions of this application. The open source licenses apply solely to the respective third-party components and do not extend to the proprietary code, design, or intellectual property of New Audio 360.
          </FluentText>
        </View>

        <View style={styles.footer}>
          <FluentText variant="caption2" color="tertiary" align="center">
            This legal notice was last updated on January 25, 2026.{"\n"}
            Document Version: 1.0.1
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
    borderRadius: FluentControlRadius.fab,
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
    borderRadius: FluentControlRadius.fab,
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
    lineHeight: 20,
    marginBottom: FluentSpacing.m,
  },
  sectionsContainer: {
    gap: FluentSpacing.s,
  },
  sectionHeader: {
    marginBottom: FluentSpacing.xs,
  },
  sectionDescription: {
    marginBottom: FluentSpacing.m,
    lineHeight: 20,
    textAlign: "justify",
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
    flex: 1,
  },
  libraryDetails: {
    marginLeft: FluentSpacing.s,
    flex: 1,
  },
  libraryName: {
    fontWeight: "500",
  },
  licenseSection: {
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
    marginTop: FluentSpacing.m,
  },
  licenseSectionTitle: {
    marginBottom: FluentSpacing.s,
    fontWeight: "600",
  },
  licenseSectionContent: {
    lineHeight: 18,
    textAlign: "justify",
  },
  disclaimerSection: {
    marginTop: FluentSpacing.xl,
    padding: FluentSpacing.m,
  },
  disclaimerText: {
    textAlign: "justify",
    lineHeight: 18,
    fontStyle: "italic",
  },
  footer: {
    paddingVertical: FluentSpacing.xl,
    alignItems: "center",
  },
});
