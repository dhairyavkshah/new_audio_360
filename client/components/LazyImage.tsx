import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Image,
  StyleSheet,
  LayoutChangeEvent,
  ImageSourcePropType,
  ViewStyle,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemedColors } from "@/contexts/ThemeContext";
import { imageCache } from "@/lib/imageCache";

interface LazyImageProps {
  source: { uri: string } | ImageSourcePropType;
  fallbackSource?: ImageSourcePropType;
  style?: ViewStyle;
  placeholderColor?: string;
  onLoad?: () => void;
}

/**
 * LazyImage component that loads images only when visible in viewport
 * Uses onLayout for visibility detection on mobile
 * Uses IntersectionObserver API on web
 * Includes LRU cache for loaded images
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  source,
  fallbackSource,
  style,
  placeholderColor,
  onLoad,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const viewRef = useRef<any>(null);
  const containerRef = useRef<any>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const fluentColors = useThemedColors();

  // Get the URI from source
  const imageUri = typeof source === "object" && source !== null && "uri" in source 
    ? source.uri 
    : null;

  // Check cache for this image
  const cachedSource = imageUri ? imageCache.get(imageUri) : null;
  const shouldLoadImage = isVisible || cachedSource !== null;
  const displaySource = shouldLoadImage
    ? cachedSource || source
    : null;

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    if (imageUri && !cachedSource) {
      // Cache the loaded image
      imageCache.set(imageUri, { uri: imageUri });
    }
    onLoad?.();
  }, [imageUri, cachedSource, onLoad]);

  // Setup visibility detection
  useEffect(() => {
    if (Platform.OS === "web" && containerRef.current) {
      // Use IntersectionObserver API on web
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              // Once visible, we can stop observing
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.1, // Trigger when 10% of the element is visible
        }
      );

      observer.observe(containerRef.current);
      intersectionObserverRef.current = observer;

      return () => {
        if (intersectionObserverRef.current) {
          intersectionObserverRef.current.disconnect();
        }
      };
    } else if (Platform.OS !== "web") {
      // On mobile, we'll use onLayout for a simpler approach
      // We consider the image visible if layout is calculated
      // In a more sophisticated app, you might use FlatList's onViewableItemsChanged
      setIsVisible(true);
    }
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    // On mobile platforms, once layout is calculated, the view is visible
    // In a scrollable list context, you might want to use FlatList's
    // viewabilityConfig for more sophisticated visibility detection
    if (Platform.OS !== "web") {
      setIsVisible(true);
    }
  }, []);

  // Placeholder styling
  const placeholderBgColor = placeholderColor || fluentColors.colorSubtleBackground;

  return (
    <View
      ref={containerRef}
      style={[styles.container, style]}
      onLayout={handleLayout}
    >
      {!displaySource || !isLoaded ? (
        <View
          style={[
            styles.placeholder,
            style,
            { backgroundColor: placeholderBgColor },
          ]}
        >
          <MaterialCommunityIcons
            name="music-note"
            size={32}
            color={fluentColors.colorNeutralForeground3}
          />
        </View>
      ) : null}
      {displaySource ? (
        <Image
          ref={viewRef}
          source={displaySource}
          style={[styles.image, style as any]}
          onLoad={handleImageLoad}
          onError={() => {
            // On error, show placeholder and optionally use fallback
            if (fallbackSource) {
              // You could implement fallback logic here
            }
          }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  },
});
