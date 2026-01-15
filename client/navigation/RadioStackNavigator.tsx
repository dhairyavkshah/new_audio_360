import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import RadioScreen from "@/screens/RadioScreen";
import RadioStationsScreen from "@/screens/RadioStationsScreen";

export type RadioStackParamList = {
  RadioMain: undefined;
  RadioStations: { mode?: 'fmam' | 'online' };
  SoundLab: undefined;
};

const Stack = createNativeStackNavigator<RadioStackParamList>();

export default function RadioStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="RadioMain"
        component={RadioScreen}
        options={{
          headerTitle: "Radio",
        }}
      />
      <Stack.Screen
        name="RadioStations"
        component={RadioStationsScreen}
        options={{
          headerTitle: "Stations",
        }}
      />
    </Stack.Navigator>
  );
}
