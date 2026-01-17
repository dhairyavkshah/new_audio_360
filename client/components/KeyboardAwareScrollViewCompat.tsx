import React from "react";
import { Platform, ScrollView, ScrollViewProps } from "react-native";

let KeyboardAwareScrollView: React.ComponentType<any> | null = null;

try {
  const keyboardController = require("react-native-keyboard-controller");
  KeyboardAwareScrollView = keyboardController.KeyboardAwareScrollView;
} catch (e) {
  KeyboardAwareScrollView = null;
}

type Props = ScrollViewProps & {
  bottomOffset?: number;
  enabled?: boolean;
};

/**
 * KeyboardAwareScrollView that falls back to ScrollView on web or when native module unavailable.
 * Use this for any screen containing text inputs.
 */
export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  if (Platform.OS === "web" || !KeyboardAwareScrollView) {
    return (
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
