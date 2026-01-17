import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingsScreen from "@/screens/SettingsScreen";
import SoundLabScreen from "@/screens/SoundLabScreen";
import AppearanceScreen from "@/screens/AppearanceScreen";
import LicenseScreen from "@/screens/LicenseScreen";
import AboutScreen from "@/screens/AboutScreen";
import FolderSelectionScreen from "@/screens/FolderSelectionScreen";
import PrivacyPolicyScreen from "@/screens/PrivacyPolicyScreen";
import OpenSourceLicensesScreen from "@/screens/OpenSourceLicensesScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type SettingsStackParamList = {
  Settings: undefined;
  SoundLab: undefined;
  Appearance: undefined;
  License: undefined;
  About: undefined;
  FolderSelection: undefined;
  PrivacyPolicy: undefined;
  OpenSourceLicenses: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SoundLab"
        component={SoundLabScreen}
        options={{
          headerTitle: "Sound Lab",
          headerBackTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="Appearance"
        component={AppearanceScreen}
        options={{
          headerTitle: "Appearance",
          headerBackTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="License"
        component={LicenseScreen}
        options={{
          headerTitle: "License",
          headerBackTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{
          headerTitle: "About",
          headerBackTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="FolderSelection"
        component={FolderSelectionScreen}
        options={{
          headerTitle: "Music Folders",
          headerBackTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          headerTitle: "Privacy Policy",
          headerBackTitle: "About",
        }}
      />
      <Stack.Screen
        name="OpenSourceLicenses"
        component={OpenSourceLicensesScreen}
        options={{
          headerTitle: "Open Source Licenses",
          headerBackTitle: "About",
        }}
      />
    </Stack.Navigator>
  );
}
