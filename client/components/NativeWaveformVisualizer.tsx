import React, { useEffect, useCallback, memo } from "react";
import { View, StyleSheet, Platform, Text, DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useThemeContext } from "@/contexts/ThemeContext";
import {
  FluentSpacing,
  FluentControlRadius,
  FluentLightColors,
  FluentDarkColors,
} from "@/constants/fluent2";
import { WaveformAnalyzerModule, WaveformData, FftData } from "../../modules/audio-effects";
import NativeAudioService from "@/services/NativeAudioService";

export type VisualizationMode = "waveform" | "fft";

interface NativeWaveformVisualizerProps {
  width?: DimensionValue;
  height?: number;
  barColor?: string;
  backgroundColor?: string;
  barWidth?: number;
  barSpacing?: number;
  barCount?: number;
  mode?: VisualizationMode;
  showLevels?: boolean;
  autoStart?: boolean;
  captureRateHz?: number;
}

interface WaveBarProps {
  value: number;
  index: number;
  barWidth: number;
  height: number;
  color: string;
  spacing: number;
}

const WaveBar = memo(function WaveBar({
  value,
  barWidth,
  height,
  color,
}: WaveBarProps) {
  const animatedHeight = useSharedValue(0.1);

  useEffect(() => {
    const normalizedValue = Math.max(0, Math.min(1, value));
    animatedHeight.value = withSpring(normalizedValue, {
      damping: 15,
      stiffness: 300,
      mass: 0.3,
    });
  }, [value, animatedHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: interpolate(
      animatedHeight.value,
      [0, 1],
      [height * 0.05, height],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width: barWidth,
          backgroundColor: color,
          borderRadius: barWidth / 2,
        },
        animatedStyle,
      ]}
    />
  );
});

function FallbackVisualizer({
  width,
  height,
  barColor,
  backgroundColor,
  barWidth,
  barSpacing,
  barCount,
}: {
  width: DimensionValue;
  height: number;
  barColor: string;
  backgroundColor: string;
  barWidth: number;
  barSpacing: number;
  barCount: number;
}) {
  const bars = Array.from({ length: barCount }, (_, i) => {
    const centerDistance = Math.abs(i - barCount / 2) / (barCount / 2);
    const baseHeight = 0.2 + (1 - centerDistance) * 0.3;
    return baseHeight;
  });

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          backgroundColor,
          gap: barSpacing,
        },
      ]}
    >
      {bars.map((value, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              width: barWidth,
              height: height * value,
              backgroundColor: barColor,
              borderRadius: barWidth / 2,
              opacity: 0.5,
            },
          ]}
        />
      ))}
    </View>
  );
}

function LevelIndicator({
  label,
  value,
  color,
  textColor,
}: {
  label: string;
  value: number;
  color: string;
  textColor: string;
}) {
  const displayValue = value < -100 ? "-∞" : `${value.toFixed(1)} dB`;

  return (
    <View style={styles.levelContainer}>
      <Text style={[styles.levelLabel, { color: textColor }]}>{label}</Text>
      <View style={styles.levelBarContainer}>
        <View
          style={[
            styles.levelBar,
            {
              backgroundColor: color,
              width: `${Math.max(0, Math.min(100, ((value + 60) / 60) * 100))}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.levelValue, { color: textColor }]}>{displayValue}</Text>
    </View>
  );
}

export function NativeWaveformVisualizer({
  width = "100%",
  height = 120,
  barColor,
  backgroundColor = "transparent",
  barWidth = 3,
  barSpacing = 2,
  barCount = 64,
  mode = "waveform",
  showLevels = false,
  autoStart = true,
  captureRateHz = 30,
}: NativeWaveformVisualizerProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const defaultBarColor = barColor || colors.colorBrandForeground1;
  const textColor = colors.colorNeutralForeground2;

  const [waveformValues, setWaveformValues] = React.useState<number[]>(
    Array(barCount).fill(0.1)
  );
  const [rmsLevel, setRmsLevel] = React.useState<number>(-60);
  const [peakLevel, setPeakLevel] = React.useState<number>(-60);
  const [isNativeAvailable, setIsNativeAvailable] = React.useState<boolean>(false);
  const [isCapturing, setIsCapturing] = React.useState<boolean>(false);

  useEffect(() => {
    const available = Platform.OS === "android" && WaveformAnalyzerModule.isAvailable();
    setIsNativeAvailable(available);
  }, []);

  const normalizeWaveformData = useCallback(
    (data: number[], targetCount: number): number[] => {
      if (data.length === 0) return Array(targetCount).fill(0.1);

      const result: number[] = [];
      const ratio = data.length / targetCount;

      for (let i = 0; i < targetCount; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.floor((i + 1) * ratio);
        let sum = 0;
        let count = 0;

        for (let j = start; j < end && j < data.length; j++) {
          const value = data[j];
          const normalized = (value + 128) / 255;
          sum += normalized;
          count++;
        }

        result.push(count > 0 ? sum / count : 0.1);
      }

      return result;
    },
    []
  );

  const normalizeFftData = useCallback(
    (magnitudes: number[], targetCount: number): number[] => {
      if (magnitudes.length === 0) return Array(targetCount).fill(0.1);

      const result: number[] = [];
      const usableMagnitudes = magnitudes.slice(0, Math.floor(magnitudes.length / 2));
      const ratio = usableMagnitudes.length / targetCount;

      for (let i = 0; i < targetCount; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.floor((i + 1) * ratio);
        let max = 0;

        for (let j = start; j < end && j < usableMagnitudes.length; j++) {
          const value = usableMagnitudes[j];
          const normalized = Math.min(1, value / 255);
          max = Math.max(max, normalized);
        }

        result.push(Math.max(0.05, max));
      }

      return result;
    },
    []
  );

  const handleWaveformUpdate = useCallback(
    (data: WaveformData) => {
      if (mode === "waveform") {
        const normalized = normalizeWaveformData(data.waveform, barCount);
        setWaveformValues(normalized);
      }

      if (typeof data.rms === "number") {
        const rmsDb = data.rms > 0 ? 20 * Math.log10(data.rms / 32768) : -60;
        setRmsLevel(Math.max(-60, rmsDb));
      }

      if (typeof data.peak === "number") {
        const peakDb = data.peak > 0 ? 20 * Math.log10(data.peak / 32768) : -60;
        setPeakLevel(Math.max(-60, peakDb));
      }
    },
    [mode, barCount, normalizeWaveformData]
  );

  const handleFftUpdate = useCallback(
    (data: FftData) => {
      if (mode === "fft") {
        const normalized = normalizeFftData(data.magnitudes, barCount);
        setWaveformValues(normalized);
      }
    },
    [mode, barCount, normalizeFftData]
  );

  useEffect(() => {
    if (!isNativeAvailable) return;

    let unsubscribeWaveform: (() => void) | undefined;
    let unsubscribeFft: (() => void) | undefined;

    const startCapture = async () => {
      if (autoStart) {
        const result = await NativeAudioService.startWaveformCapture(captureRateHz);
        if (result.success) {
          setIsCapturing(true);
        }
      }

      unsubscribeWaveform = NativeAudioService.subscribeToWaveform(handleWaveformUpdate);
      unsubscribeFft = NativeAudioService.subscribeToFft(handleFftUpdate);
    };

    startCapture();

    return () => {
      if (unsubscribeWaveform) unsubscribeWaveform();
      if (unsubscribeFft) unsubscribeFft();
      if (autoStart && isCapturing) {
        NativeAudioService.stopWaveformCapture();
      }
    };
  }, [
    isNativeAvailable,
    autoStart,
    captureRateHz,
    handleWaveformUpdate,
    handleFftUpdate,
  ]);

  if (!isNativeAvailable) {
    return (
      <View style={styles.wrapper}>
        <FallbackVisualizer
          width={width}
          height={height}
          barColor={defaultBarColor}
          backgroundColor={backgroundColor}
          barWidth={barWidth}
          barSpacing={barSpacing}
          barCount={barCount}
        />
        {showLevels && (
          <View style={styles.levelsWrapper}>
            <LevelIndicator
              label="RMS"
              value={-60}
              color={colors.colorNeutralForeground3}
              textColor={textColor}
            />
            <LevelIndicator
              label="Peak"
              value={-60}
              color={colors.colorNeutralForeground3}
              textColor={textColor}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            width,
            height,
            backgroundColor,
            gap: barSpacing,
          },
        ]}
      >
        {waveformValues.map((value, index) => (
          <WaveBar
            key={index}
            value={value}
            index={index}
            barWidth={barWidth}
            height={height}
            color={defaultBarColor}
            spacing={barSpacing}
          />
        ))}
      </View>
      {showLevels && (
        <View style={styles.levelsWrapper}>
          <LevelIndicator
            label="RMS"
            value={rmsLevel}
            color={colors.colorPaletteGreenForeground1}
            textColor={textColor}
          />
          <LevelIndicator
            label="Peak"
            value={peakLevel}
            color={peakLevel > -3 ? colors.colorPaletteRedForeground1 : colors.colorBrandForeground1}
            textColor={textColor}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bar: {
    minHeight: FluentSpacing.xxs,
  },
  levelsWrapper: {
    marginTop: FluentSpacing.xs,
    gap: FluentSpacing.xxs,
  },
  levelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.xs,
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: "500",
    width: 32,
  },
  levelBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    borderRadius: FluentControlRadius.checkbox,
    overflow: "hidden",
  },
  levelBar: {
    height: "100%",
    borderRadius: FluentControlRadius.checkbox,
  },
  levelValue: {
    fontSize: 10,
    fontWeight: "400",
    width: 48,
    textAlign: "right",
  },
});

export default NativeWaveformVisualizer;
