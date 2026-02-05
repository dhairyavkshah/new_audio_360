import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { useThemedColors } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";
import { ThemedFluentColors } from "@/lib/themeUtils";

interface LicenseSectionProps {
  title: string;
  content: string;
  colors: ThemedFluentColors;
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

const CORE_LIBRARIES = [
  { name: "React Native", license: "MIT License", version: "0.79.2" },
  { name: "React", license: "MIT License", version: "19.0.0" },
  { name: "React DOM", license: "MIT License", version: "19.0.0" },
  { name: "Expo SDK", license: "MIT License", version: "53.0.0" },
  { name: "React Native Web", license: "MIT License", version: "0.20.0" },
];

const NAVIGATION_LIBRARIES = [
  { name: "React Navigation Native", license: "MIT License", version: "7.1.6" },
  { name: "React Navigation Native Stack", license: "MIT License", version: "7.3.10" },
  { name: "React Navigation Bottom Tabs", license: "MIT License", version: "7.3.10" },
  { name: "React Navigation Elements", license: "MIT License", version: "2.3.8" },
  { name: "React Native Screens", license: "MIT License", version: "4.10.0" },
  { name: "React Native Safe Area Context", license: "MIT License", version: "5.4.0" },
  { name: "React Native Gesture Handler", license: "MIT License", version: "2.24.0" },
];

const UI_LIBRARIES = [
  { name: "React Native Reanimated", license: "MIT License", version: "3.17.5" },
  { name: "Expo Vector Icons", license: "MIT License", version: "14.0.4" },
  { name: "Material Community Icons", license: "SIL Open Font License 1.1", version: "7.x" },
  { name: "Expo Blur", license: "MIT License", version: "14.1.5" },
  { name: "Expo Image", license: "MIT License", version: "2.4.1" },
  { name: "Expo Splash Screen", license: "MIT License", version: "0.30.10" },
  { name: "Expo Status Bar", license: "MIT License", version: "2.2.3" },
  { name: "Expo Navigation Bar", license: "MIT License", version: "5.0.10" },
  { name: "Expo System UI", license: "MIT License", version: "5.0.11" },
  { name: "React Native Keyboard Controller", license: "MIT License", version: "1.20.6" },
  { name: "React Native Community Slider", license: "MIT License", version: "4.5.5" },
];

const AUDIO_LIBRARIES = [
  { name: "React Native Track Player", license: "Apache License 2.0", version: "4.1.1" },
  { name: "React Native Audio API", license: "MIT License", version: "0.11.1" },
  { name: "Expo AV", license: "MIT License", version: "15.1.7" },
  { name: "Expo Audio", license: "MIT License", version: "0.4.9" },
  { name: "AndroidX Media3 ExoPlayer", license: "Apache License 2.0", version: "1.2.1" },
  { name: "Browser ID3 Writer", license: "MIT License", version: "6.3.1" },
];

const EXPO_MODULES = [
  { name: "Expo Media Library", license: "MIT License", version: "17.1.7" },
  { name: "Expo File System", license: "MIT License", version: "19.0.21" },
  { name: "Expo Haptics", license: "MIT License", version: "14.1.4" },
  { name: "Expo Notifications", license: "MIT License", version: "0.31.4" },
  { name: "Expo Location", license: "MIT License", version: "18.1.6" },
  { name: "Expo Local Authentication", license: "MIT License", version: "16.0.5" },
  { name: "Expo Application", license: "MIT License", version: "7.0.8" },
  { name: "Expo Secure Store", license: "MIT License", version: "14.2.4" },
  { name: "Expo Crypto", license: "MIT License", version: "14.1.5" },
  { name: "Expo Clipboard", license: "MIT License", version: "7.1.5" },
  { name: "Expo Constants", license: "MIT License", version: "17.1.8" },
  { name: "Expo Asset", license: "MIT License", version: "11.1.7" },
  { name: "Expo Font", license: "MIT License", version: "13.3.2" },
  { name: "Expo Linking", license: "MIT License", version: "7.1.7" },
  { name: "Expo Web Browser", license: "MIT License", version: "14.2.0" },
  { name: "Expo Auth Session", license: "MIT License", version: "6.2.1" },
  { name: "Expo Build Properties", license: "MIT License", version: "0.14.8" },
  { name: "Expo Dev Client", license: "MIT License", version: "5.2.4" },
];

const STORAGE_LIBRARIES = [
  { name: "Async Storage", license: "MIT License", version: "2.1.2" },
  { name: "PostgreSQL Client (node-postgres)", license: "MIT License", version: "8.17.2" },
];

const NETWORK_LIBRARIES = [
  { name: "Express", license: "MIT License", version: "5.2.1" },
  { name: "AWS SDK S3 Client", license: "Apache License 2.0", version: "3.975.0" },
  { name: "TanStack React Query", license: "MIT License", version: "5.90.7" },
  { name: "CORS Middleware", license: "MIT License", version: "2.8.6" },
  { name: "React Native WebView", license: "MIT License", version: "13.16.0" },
];

const UTILITY_LIBRARIES = [
  { name: "Zod", license: "MIT License", version: "3.24.2" },
  { name: "Zod Validation Error", license: "MIT License", version: "3.4.0" },
];

const ANDROID_NATIVE_LIBRARIES = [
  { name: "Google Play Billing Library", license: "Apache License 2.0", version: "6.1.0" },
  { name: "AndroidX Security Crypto", license: "Apache License 2.0", version: "1.1.0" },
  { name: "Android NDK (C++/NEON SIMD)", license: "Apache License 2.0", version: "25.1.8937393" },
];

const SMART_ENHANCEMENT_LIBRARIES = [
  { name: "TensorFlow.js", license: "Apache License 2.0", version: "4.22.0", description: "Neural AI audio upscaling on Web/PWA" },
  { name: "TensorFlow Lite", license: "Apache License 2.0", version: "2.x", description: "Neural AI audio upscaling on Android" },
  { name: "ARM NEON Intrinsics", license: "BSD-3-Clause", version: "ARMv8-A", description: "SIMD optimizations for PCM conversion and DSP" },
];

const API_SERVICES = [
  { name: "Radio Browser API", license: "CC BY-SA 4.0", version: "Community API" },
  { name: "Internet Archive API", license: "Various (Public Domain/CC)", version: "Public API" },
  { name: "SoundCloud API", license: "Proprietary (OAuth 2.1)", version: "v2" },
];

interface LibraryCategory {
  title: string;
  description: string;
  libraries: Array<{ name: string; license: string; version: string; description?: string }>;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const LIBRARY_CATEGORIES: LibraryCategory[] = [
  {
    title: "Core Framework",
    description: "Foundation libraries powering the application.",
    libraries: CORE_LIBRARIES,
    icon: "react",
  },
  {
    title: "Navigation",
    description: "Screen navigation and gesture handling.",
    libraries: NAVIGATION_LIBRARIES,
    icon: "navigation",
  },
  {
    title: "User Interface",
    description: "UI components, animations, and visual elements.",
    libraries: UI_LIBRARIES,
    icon: "palette",
  },
  {
    title: "Audio Processing",
    description: "Audio playback, track management, and media handling.",
    libraries: AUDIO_LIBRARIES,
    icon: "music-note",
  },
  {
    title: "Expo Modules",
    description: "Cross-platform device APIs and native functionality.",
    libraries: EXPO_MODULES,
    icon: "cellphone",
  },
  {
    title: "Data Storage",
    description: "Local and cloud data persistence.",
    libraries: STORAGE_LIBRARIES,
    icon: "database",
  },
  {
    title: "Networking",
    description: "API communication and cloud services.",
    libraries: NETWORK_LIBRARIES,
    icon: "cloud",
  },
  {
    title: "Utilities",
    description: "Validation and helper libraries.",
    libraries: UTILITY_LIBRARIES,
    icon: "tools",
  },
  {
    title: "Android Native",
    description: "Native Android SDKs and performance optimizations.",
    libraries: ANDROID_NATIVE_LIBRARIES,
    icon: "android",
  },
];

export default function OpenSourceLicensesScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const colors = useThemedColors();

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
          {LIBRARY_CATEGORIES.map((category, catIndex) => (
            <View key={`cat-${catIndex}`}>
              <View style={styles.categoryHeader}>
                <MaterialCommunityIcons 
                  name={category.icon} 
                  size={FluentIconSize.medium} 
                  color={colors.colorBrandForeground1} 
                />
                <View style={styles.categoryTitleContainer}>
                  <FluentText variant="subtitle2">
                    {category.title}
                  </FluentText>
                  <FluentText variant="caption2" color="tertiary">
                    {category.description}
                  </FluentText>
                </View>
              </View>

              {category.libraries.map((lib, index) => (
                <View 
                  key={`${catIndex}-${index}`} 
                  style={[styles.libraryItem, { backgroundColor: colors.colorNeutralBackground2 }]}
                >
                  <View style={styles.libraryHeader}>
                    <MaterialCommunityIcons 
                      name="package-variant" 
                      size={FluentIconSize.small} 
                      color={colors.colorNeutralForeground3} 
                    />
                    <View style={styles.libraryDetails}>
                      <FluentText variant="body2" style={styles.libraryName}>
                        {lib.name}
                      </FluentText>
                      <FluentText variant="caption2" color="tertiary">
                        v{lib.version}
                      </FluentText>
                    </View>
                  </View>
                  <FluentText variant="caption2" color="secondary" style={styles.libraryLicense}>
                    {lib.license}
                  </FluentText>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.categoryHeader}>
            <MaterialCommunityIcons 
              name="brain" 
              size={FluentIconSize.medium} 
              color={colors.colorBrandForeground1} 
            />
            <View style={styles.categoryTitleContainer}>
              <FluentText variant="subtitle2">
                Smart Enhancements
              </FluentText>
              <FluentText variant="caption2" color="tertiary">
                AI audio upscaling and real-time DSP processing.
              </FluentText>
            </View>
          </View>

          {SMART_ENHANCEMENT_LIBRARIES.map((lib, index) => (
            <View 
              key={`smart-${index}`} 
              style={[styles.libraryItem, { backgroundColor: colors.colorNeutralBackground2 }]}
            >
              <View style={styles.libraryHeader}>
                <MaterialCommunityIcons 
                  name="chip" 
                  size={FluentIconSize.small} 
                  color={colors.colorNeutralForeground3} 
                />
                <View style={styles.libraryDetails}>
                  <FluentText variant="body2" style={styles.libraryName}>
                    {lib.name}
                  </FluentText>
                  <FluentText variant="caption2" color="tertiary">
                    v{lib.version}
                  </FluentText>
                </View>
              </View>
              <FluentText variant="caption2" color="secondary" style={styles.libraryLicense}>
                {lib.license}
              </FluentText>
              <FluentText variant="caption2" color="tertiary" style={styles.libraryLicense}>
                {lib.description}
              </FluentText>
            </View>
          ))}

          <View style={styles.categoryHeader}>
            <MaterialCommunityIcons 
              name="api" 
              size={FluentIconSize.medium} 
              color={colors.colorBrandForeground1} 
            />
            <View style={styles.categoryTitleContainer}>
              <FluentText variant="subtitle2">
                External API Services
              </FluentText>
              <FluentText variant="caption2" color="tertiary">
                Third-party APIs for content discovery.
              </FluentText>
            </View>
          </View>

          {API_SERVICES.map((lib, index) => (
            <View 
              key={`api-${index}`} 
              style={[styles.libraryItem, { backgroundColor: colors.colorNeutralBackground2 }]}
            >
              <View style={styles.libraryHeader}>
                <MaterialCommunityIcons 
                  name="earth" 
                  size={FluentIconSize.small} 
                  color={colors.colorNeutralForeground3} 
                />
                <View style={styles.libraryDetails}>
                  <FluentText variant="body2" style={styles.libraryName}>
                    {lib.name}
                  </FluentText>
                  <FluentText variant="caption2" color="tertiary">
                    {lib.version}
                  </FluentText>
                </View>
              </View>
              <FluentText variant="caption2" color="secondary" style={styles.libraryLicense}>
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
            title="BSD 3-Clause License"
            content={'Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:\n\n1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.\n\n2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.\n\n3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.'}
            colors={colors}
          />

          <LicenseSection
            title="SIL Open Font License, Version 1.1"
            content={'This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is available with a FAQ at: http://scripts.sil.org/OFL\n\nThe fonts are free to use, study, modify and redistribute, subject to the conditions in the license. The fonts cannot be sold by themselves but can be bundled with other software.'}
            colors={colors}
          />

          <LicenseSection
            title="Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)"
            content={'Radio Browser API data is licensed under Creative Commons Attribution-ShareAlike 4.0 International License.\n\nYou are free to share (copy and redistribute) and adapt (remix, transform, build upon) the material for any purpose, even commercially, under the following terms:\n\nAttribution: You must give appropriate credit, provide a link to the license, and indicate if changes were made.\n\nShareAlike: If you remix, transform, or build upon the material, you must distribute your contributions under the same license.\n\nMore info: https://creativecommons.org/licenses/by-sa/4.0/'}
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
            This legal notice was last updated on February 5, 2026.{"\n"}
            Document Version: 2.0.0
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
  },
  copyrightText: {
    textAlign: "justify",
    lineHeight: 20,
    marginBottom: FluentSpacing.m,
  },
  sectionsContainer: {
    gap: FluentSpacing.s,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: FluentSpacing.l,
    marginBottom: FluentSpacing.s,
    gap: FluentSpacing.s,
  },
  categoryTitleContainer: {
    flex: 1,
  },
  libraryItem: {
    flexDirection: "column",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    gap: FluentSpacing.xs,
  },
  libraryHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  libraryDetails: {
    marginLeft: FluentSpacing.s,
    flex: 1,
  },
  libraryName: {
  },
  libraryLicense: {
    marginLeft: FluentSpacing.l + FluentSpacing.s,
  },
  licenseSection: {
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
    marginTop: FluentSpacing.m,
  },
  licenseSectionTitle: {
    marginBottom: FluentSpacing.s,
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
