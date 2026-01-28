import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import ArchiveScreen from "@/screens/ArchiveScreen";

export type DiscoverStackParamList = {
  Discover: undefined;
};

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export default function DiscoverStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Discover"
        component={ArchiveScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
