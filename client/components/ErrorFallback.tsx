import React, { useState } from "react";
import { reloadAppAsync } from "expo";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Text,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText, FluentSurface } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import {
  FluentSpacing,
  FluentRadius,
  FluentLightColors,
  FluentDarkColors,
  FluentIconSize,
} from "@/constants/fluent2";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  return (
    <FluentSurface style={styles.container}>
      {__DEV__ ? (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          style={({ pressed }) => [
            styles.topButton,
            {
              backgroundColor: colors.colorNeutralBackground2,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons 
            name="alert-circle-outline" 
            size={FluentIconSize.regular} 
            color={colors.colorNeutralForeground1} 
          />
        </Pressable>
      ) : null}

      <View style={styles.content}>
        <FluentText variant="title1" align="center" style={styles.title}>
          Something went wrong
        </FluentText>

        <FluentText variant="body1" color="secondary" align="center" style={styles.message}>
          Please reload the app to continue.
        </FluentText>

        <Pressable
          onPress={handleRestart}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.colorBrandBackground,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <FluentText
            variant="body1"
            style={[styles.buttonText, { color: colors.colorNeutralForegroundOnBrand }]}
          >
            Try Again
          </FluentText>
        </Pressable>
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <FluentSurface style={styles.modalContainer}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.colorNeutralStroke2 }]}>
                <FluentText variant="title2" style={styles.modalTitle}>
                  Error Details
                </FluentText>
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  style={({ pressed }) => [
                    styles.closeButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <MaterialCommunityIcons 
                    name="close" 
                    size={FluentIconSize.medium} 
                    color={colors.colorNeutralForeground1} 
                  />
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator
              >
                <View
                  style={[
                    styles.errorContainer,
                    { backgroundColor: colors.colorNeutralBackground2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.errorText,
                      {
                        color: colors.colorNeutralForeground1,
                        fontFamily: "monospace",
                      },
                    ]}
                    selectable
                  >
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </FluentSurface>
          </View>
        </Modal>
      ) : null}
    </FluentSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: FluentSpacing.xxl,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: FluentSpacing.l,
    width: "100%",
    maxWidth: 600,
  },
  title: {
    lineHeight: 40,
  },
  message: {
    lineHeight: 24,
  },
  topButton: {
    position: "absolute",
    top: FluentSpacing.xxl + FluentSpacing.l,
    right: FluentSpacing.l,
    width: 44,
    height: 44,
    borderRadius: FluentRadius.medium,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  button: {
    paddingVertical: FluentSpacing.l,
    borderRadius: FluentRadius.medium,
    paddingHorizontal: FluentSpacing.xxl,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    height: "90%",
    borderTopLeftRadius: FluentRadius.large,
    borderTopRightRadius: FluentRadius.large,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingTop: FluentSpacing.l,
    paddingBottom: FluentSpacing.m,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: "600",
  },
  closeButton: {
    padding: FluentSpacing.xs,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: FluentSpacing.l,
  },
  errorContainer: {
    width: "100%",
    borderRadius: FluentRadius.medium,
    overflow: "hidden",
    padding: FluentSpacing.l,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    width: "100%",
  },
});
