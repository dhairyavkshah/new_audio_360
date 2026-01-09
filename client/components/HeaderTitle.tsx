import React from "react";
import { View, StyleSheet, Image } from "react-native";

import { FluentText } from "@/components/fluent";
import { FluentSpacing, FluentRadius } from "@/constants/fluent2";

interface HeaderTitleProps {
  title: string;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/icon.png")}
        style={styles.icon}
        resizeMode="contain"
      />
      <FluentText variant="subtitle1" color="primary">
        {title}
      </FluentText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  icon: {
    width: 32,
    height: 32,
    marginRight: FluentSpacing.s,
    borderRadius: FluentRadius.medium,
  },
});
