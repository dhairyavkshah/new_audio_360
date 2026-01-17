import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import CreateScreen from "@/screens/CreateScreen";
import RecordingScreen from "@/screens/RecordingScreen";
import MixingScreen from "@/screens/MixingScreen";
import EffectsScreen from "@/screens/EffectsScreen";
import SaveScreen from "@/screens/SaveScreen";

export type CreateStackParamList = {
  Create: undefined;
  Recording: { songId: string };
  Mixing: { recordingId: string };
  Effects: { recordingId: string };
  Save: { recordingId: string };
};

const Stack = createNativeStackNavigator<CreateStackParamList>();

export default function CreateStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Create"
        component={CreateScreen}
        options={{
          headerTitle: "Create",
        }}
      />
      <Stack.Screen
        name="Recording"
        component={RecordingScreen}
        options={{
          headerTitle: "Recording",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Mixing"
        component={MixingScreen}
        options={{
          headerTitle: "Mix",
        }}
      />
      <Stack.Screen
        name="Effects"
        component={EffectsScreen}
        options={{
          headerTitle: "Effects",
        }}
      />
      <Stack.Screen
        name="Save"
        component={SaveScreen}
        options={{
          headerTitle: "Save",
        }}
      />
    </Stack.Navigator>
  );
}
