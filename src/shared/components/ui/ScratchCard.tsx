import React, { useState, useRef, ReactNode } from 'react';
import { View, PanResponder, Animated, StyleSheet } from 'react-native';
import Svg, { Mask, Rect, Path, Defs, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

interface ScratchCardProps {
  children: ReactNode;
  width: number;
  height: number;
  coverColor?: string;
  onScratchComplete?: () => void;
  strokeWidth?: number;
  scratchThreshold?: number; // Number of move events needed to trigger completion
}

export const ScratchCard: React.FC<ScratchCardProps> = ({
  children,
  width,
  height,
  coverColor = '#e11d48', // Bumba's primary pink/rose color
  onScratchComplete,
  strokeWidth = 40,
  scratchThreshold = 50,
}) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const currentPath = useRef<string>('');
  const pointsCount = useRef<number>(0);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isCompleted,
      onMoveShouldSetPanResponder: () => !isCompleted,
      onPanResponderGrant: (evt) => {
        if (isCompleted) return;
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M ${locationX} ${locationY} L ${locationX} ${locationY}`;
        lastPointRef.current = { x: locationX, y: locationY };
        setPaths((prev) => [...prev, currentPath.current]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt) => {
        if (isCompleted) return;
        const { locationX, locationY } = evt.nativeEvent;

        // OPTIMIZATION: Only update if moved more than 15 pixels to prevent massive lag
        if (lastPointRef.current) {
          const dx = locationX - lastPointRef.current.x;
          const dy = locationY - lastPointRef.current.y;
          if (Math.sqrt(dx * dx + dy * dy) < 15) return;
        }
        lastPointRef.current = { x: locationX, y: locationY };

        currentPath.current += ` L ${locationX} ${locationY}`;
        
        // Update the last path
        setPaths((prev) => {
          const newPaths = [...prev];
          newPaths[newPaths.length - 1] = currentPath.current;
          return newPaths;
        });

        pointsCount.current += 1;
        
        // Add subtle haptic feedback every few scratch points
        if (pointsCount.current % 4 === 0) {
           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (pointsCount.current > (scratchThreshold / 2) && !isCompleted) {
          handleComplete();
        }
      },
      onPanResponderRelease: () => {
        // Path ended
      },
      onPanResponderTerminate: () => {
        // Interrupted
      },
    })
  ).current;

  const handleComplete = () => {
    setIsCompleted(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      if (onScratchComplete) onScratchComplete();
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[{ width, height }, styles.container]}>
      {/* Background Prize */}
      <View style={StyleSheet.absoluteFill}>{children}</View>

      {/* Foreground Cover (Scratchable) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}
        {...panResponder.panHandlers}
      >
        <Svg width={width} height={height}>
          <Defs>
            <Mask id="scratch-mask">
              <Rect x="0" y="0" width={width} height={height} fill="white" />
              {paths.map((p, index) => {
                if (!p || !p.includes('L')) return null;
                return (
                  <Path
                    key={index}
                    d={p}
                    stroke="black"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </Mask>
          </Defs>
          
          <Rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill={coverColor}
            mask="url(#scratch-mask)"
          />
          
          {/* Pattern/Text on Cover */}
          <SvgText
            x={width / 2}
            y={height / 2 + 6}
            fill="#ffffff"
            fontSize="18"
            fontWeight="bold"
            textAnchor="middle"
            mask="url(#scratch-mask)"
          >
            SCRATCH TO REVEAL
          </SvgText>
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24, // Keeps rounded corners clean
  },
});
