import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  Canvas,
  Rect,
  Path,
  LinearGradient,
  vec,
  Skia,
  Circle,
} from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';

interface ScratchCardProps {
  children: React.ReactNode;
  width: number;
  height: number;
  coverColor?: string;
  onScratchComplete?: () => void;
  strokeWidth?: number;
  scratchThreshold?: number; // How many points to trigger complete
}

export const ScratchCard: React.FC<ScratchCardProps> = ({
  children,
  width,
  height,
  onScratchComplete,
  strokeWidth = 45,
  scratchThreshold = 50,
}) => {
  const path = useSharedValue(Skia.Path.Make());
  const pointsCount = useSharedValue(0);
  const isCompleted = useSharedValue(false);
  const fadeAnim = useSharedValue(1);
  const fallbackOpacity = useSharedValue(1);
  const [isDone, setIsDone] = useState(false);

  const handleComplete = () => {
    fadeAnim.value = withTiming(0, { duration: 600 }, (finished) => {
      if (finished) {
        runOnJS(setIsDone)(true);
        if (onScratchComplete) {
          runOnJS(onScratchComplete)();
        }
      }
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => {
      if (isCompleted.value) return;
      
      fallbackOpacity.value = 0; // Instantly remove fallback on first touch

      const newPath = path.value.copy();
      newPath.moveTo(e.x, e.y);
      path.value = newPath;
    })
    .onChange((e) => {
      if (isCompleted.value) return;
      
      const newPath = path.value.copy();
      
      // Prevent drawing from (0,0) if onBegin was somehow missed or path is empty
      if (newPath.isEmpty()) {
        newPath.moveTo(e.x, e.y);
      } else {
        newPath.lineTo(e.x, e.y);
      }
      
      path.value = newPath;

      pointsCount.value += 1;

      if (pointsCount.value > scratchThreshold && !isCompleted.value) {
        isCompleted.value = true;
        handleComplete();
      }
    });

  const foregroundStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      zIndex: isCompleted.value ? 0 : 10,
    };
  });

  const fallbackStyle = useAnimatedStyle(() => {
    return {
      opacity: fallbackOpacity.value,
    };
  });

  return (
    <View style={[{ width, height }, styles.container]}>
      {/* Background Prize (Underneath) */}
      <View style={StyleSheet.absoluteFill}>{children}</View>

      {/* Fallback Cover (Prevents flash before Skia mounts) */}
      <Animated.View 
        style={[StyleSheet.absoluteFill, fallbackStyle, { backgroundColor: '#db2777', zIndex: 5 }]} 
        pointerEvents="none" 
      />

      {/* Foreground Cover (Scratchable Skia Canvas) */}
      <Animated.View style={[StyleSheet.absoluteFill, foregroundStyle]} pointerEvents={isDone ? 'none' : 'auto'}>
        <GestureDetector gesture={pan}>
          <View style={StyleSheet.absoluteFill} collapsable={false}>
            <Canvas style={StyleSheet.absoluteFill}>
              {/* --- 1. Draw the Base Gradient Cover --- */}
              <Rect x={0} y={0} width={width} height={height}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(width, height)}
                  colors={['#db2777', '#be185d', '#831843']}
                />
              </Rect>

              {/* --- 2. Draw Decorative Elements --- */}
              <Circle cx={width * 0.2} cy={height * 0.1} r={40} color="rgba(255,255,255,0.05)" />
              <Circle cx={width * 0.8} cy={height * 0.9} r={60} color="rgba(255,255,255,0.05)" />
              <Circle cx={width * 0.9} cy={height * 0.3} r={30} color="rgba(255,255,255,0.1)" />
              <Circle cx={width * 0.1} cy={height * 0.8} r={20} color="rgba(255,255,255,0.1)" />
              <Circle cx={width * 0.5} cy={height * 0.5} r={120} color="rgba(255,255,255,0.03)" />

              {/* --- 3. The Eraser Path (Hole Punch) --- */}
              {/* blendMode="clear" physically removes pixels from the canvas, making it transparent */}
              <Path
                path={path}
                style="stroke"
                strokeWidth={strokeWidth}
                strokeCap="round"
                strokeJoin="round"
                blendMode="clear"
              />
            </Canvas>
          </View>
        </GestureDetector>
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
