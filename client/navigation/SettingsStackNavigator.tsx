import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingsScreen from "@/screens/SettingsScreen";
import SoundLabScreen from "@/screens/SoundLabScreen";
import AppearanceScreen from "@/screens/AppearanceScreen";
import PlanScreen from "@/screens/PlanScreen";
import AboutScreen from "@/screens/AboutScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type SettingsStackParamList = {
  Settings: undefined;
  SoundLab: undefined;
  Appearance: undefined;
  Plan: undefined;
  About: undefined;
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
        name="Plan"
        component={PlanScreen}
        options={{
          headerTitle: "Plan",
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
    </Stack.Navigator>
  );
}
