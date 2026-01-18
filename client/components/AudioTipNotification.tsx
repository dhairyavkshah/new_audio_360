import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Animated, Platform, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentRadius, FluentIconSize, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";

interface AudioTipNotificationProps {
  visible: boolean;
  onDismiss: () => void;
}

const useNativeDriver = Platform.OS !== "web";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function AudioTipNotification({ visible, onDismiss }: AudioTipNotificationProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver,
          friction: 6,
          tension: 80,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver,
        }),
      ]).start();

      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver,
          }),
        ])
      );
      pulseAnimation.start();

      const autoDismissTimer = setTimeout(() => {
        dismissNotification();
      }, 12000);

      return () => {
        clearTimeout(autoDismissTimer);
        pulseAnimation.stop();
      };
    }
  }, [visible]);

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver,
      }),
    ]).start(() => {
      setIsVisible(false);
      onDismiss();
    });
  };

  if (!isVisible) return null;

  const warningColor = "#FF9500";
  const warningColorDark = "#FFB340";

  return (
    <View style={styles.overlay}>
      <Animated.View 
        style={[
          styles.backdrop, 
          { 
            opacity: backdropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }) 
          }
        ]} 
      />
      <Animated.View
        style={[
          styles.container,
          {
            top: insets.top + FluentSpacing.xl,
            opacity: opacityAnim,
            transform: [
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <Animated.View 
          style={[
            styles.card, 
            { 
              backgroundColor: isDark ? colors.colorNeutralBackground2 : colors.colorNeutralBackground1,
              borderColor: isDark ? warningColorDark : warningColor,
              transform: [{ scale: pulseAnim }],
            }
          ]}
        >
          <View style={[styles.iconBadge, { backgroundColor: isDark ? warningColorDark : warningColor }]}>
            <MaterialCommunityIcons
              name="volume-off"
              size={32}
              color="#FFFFFF"
            />
          </View>
          
          <View style={styles.content}>
            <FluentText 
              variant="subtitle1" 
              style={[styles.title, { color: isDark ? warningColorDark : warningColor }]}
            >
              Important Audio Tip
            </FluentText>
            
            <FluentText 
              variant="body1" 
              style={[styles.message, { color: colors.colorNeutralForeground1 }]}
            >
              For the best experience with New Audio 360, please disable your phone's built-in audio effects:
            </FluentText>
            
            <View style={styles.bulletPoints}>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons
                  name="checkbox-blank-circle"
                  size={6}
                  color={colors.colorNeutralForeground2}
                  style={styles.bullet}
                />
                <FluentText variant="body2" style={{ color: colors.colorNeutralForeground2, flex: 1 }}>
                  Dolby Atmos / Dolby Audio
                </FluentText>
              </View>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons
                  name="checkbox-blank-circle"
                  size={6}
                  color={colors.colorNeutralForeground2}
                  style={styles.bullet}
                />
                <FluentText variant="body2" style={{ color: colors.colorNeutralForeground2, flex: 1 }}>
                  System Equalizer
                </FluentText>
              </View>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons
                  name="checkbox-blank-circle"
                  size={6}
                  color={colors.colorNeutralForeground2}
                  style={styles.bullet}
                />
                <FluentText variant="body2" style={{ color: colors.colorNeutralForeground2, flex: 1 }}>
                  Adapt Sound / Audio Enhancement
                </FluentText>
              </View>
            </View>

            <FluentText 
              variant="caption1" 
              style={[styles.hint, { color: colors.colorNeutralForeground3 }]}
            >
              Settings → Sound → Sound Quality or Dolby
            </FluentText>
          </View>
          
          <Pressable 
            onPress={dismissNotification} 
            style={[styles.gotItButton, { backgroundColor: isDark ? warningColorDark : warningColor }]}
          >
            <FluentText variant="body2Strong" style={{ color: "#FFFFFF" }}>
              Got it
            </FluentText>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  container: {
    position: "absolute",
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    zIndex: 99999,
  },
  card: {
    padding: FluentSpacing.l,
    borderRadius: FluentRadius.xLarge,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    alignItems: "center",
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  content: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontWeight: "700",
    marginBottom: FluentSpacing.s,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    marginBottom: FluentSpacing.m,
    lineHeight: 22,
  },
  bulletPoints: {
    alignSelf: "flex-start",
    width: "100%",
    paddingHorizontal: FluentSpacing.m,
    marginBottom: FluentSpacing.m,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.xs,
  },
  bullet: {
    marginRight: FluentSpacing.s,
    marginTop: 2,
  },
  hint: {
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: FluentSpacing.l,
  },
  gotItButton: {
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.xl,
    borderRadius: FluentRadius.large,
    minWidth: 120,
    alignItems: "center",
  },
});

export default AudioTipNotification;
