import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluentText } from "@/components/fluent";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import { FluentSpacing } from "@/constants/fluent2";
import { useEagerInitialization } from "@/hooks/useEagerInitialization";

const appIcon = require("../../assets/images/icon.png");

type SplashScreenProps = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const colors = useThemedColors();
  const insets = useSafeAreaInsets();
  const [iconLoaded, setIconLoaded] = useState(false);
  const iconLoadedRef = useRef(false);
  const isMountedRef = useRef(true);
  const [initStatus, setInitStatus] = useState<string>("Initializing...");
  
  const initState = useEagerInitialization();

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (iconLoaded) {
      iconLoadedRef.current = true;
    }
  }, [iconLoaded]);

  useEffect(() => {
    Image.prefetch(appIcon);
    
    const fallback = setTimeout(() => {
      if (!iconLoadedRef.current) {
        setIconLoaded(true);
      }
    }, 500);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (initState.audioEngineReady) {
      setInitStatus("Audio engine ready");
    } else if (initState.isComplete) {
      setInitStatus("Ready");
    }
  }, [initState]);

  useEffect(() => {
    if (!iconLoaded) return;

    const minDisplayTime = 1500;
    const startTime = Date.now();
    let remainingTimer: ReturnType<typeof setTimeout> | null = null;
    
    const checkAndFinish = () => {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);
      
      if (initState.isComplete && isMountedRef.current) {
        remainingTimer = setTimeout(() => {
          if (isMountedRef.current) {
            onFinish();
          }
        }, remainingTime);
      }
    };
    
    checkAndFinish();
    
    return () => {
      if (remainingTimer) clearTimeout(remainingTimer);
    };
  }, [iconLoaded, initState.isComplete, onFinish]);

  useEffect(() => {
    if (!iconLoaded) return;
    
    const maxWaitTimer = setTimeout(() => {
      if (!isMountedRef.current) return;
      
      console.log('[SplashScreen] Max wait time reached, finishing...');
      onFinish();
    }, 6000);

    return () => {
      clearTimeout(maxWaitTimer);
    };
  }, [iconLoaded, onFinish]);

  return (
    <View style={[styles.container, { backgroundColor: colors.colorNeutralBackground1 }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image
            source={appIcon}
            style={styles.icon}
            contentFit="contain"
            priority="high"
            cachePolicy="memory-disk"
            onLoad={() => setIconLoaded(true)}
          />
        </View>
        <FluentText variant="title1" align="center" style={styles.title}>
          New Audio 360
        </FluentText>
        <FluentText variant="body1" color="secondary" align="center">
          The top-grade intelligent music experience{"\n"}built for you
        </FluentText>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.colorBrandForeground1} />
          <FluentText variant="caption1" color="tertiary" style={styles.loadingText}>
            {initStatus}
          </FluentText>
        </View>
      </View>
      <View style={[styles.footer, { bottom: insets.bottom + FluentSpacing.xxxl }]}>
        <FluentText variant="caption1" color="tertiary" align="center">
          By: Dhairya Shah, The Team 360
        </FluentText>
        <FluentText variant="caption1" color="tertiary" align="center" style={{ marginTop: FluentSpacing.s }}>
          v30.0
        </FluentText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: FluentSpacing.xxxl,
  },
  icon: {
    width: 120,
    height: 120,
  },
  title: {
    marginBottom: FluentSpacing.s,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: FluentSpacing.xxxl,
    gap: FluentSpacing.s,
  },
  loadingText: {
    marginLeft: FluentSpacing.xs,
  },
  footer: {
    position: "absolute",
  },
});
