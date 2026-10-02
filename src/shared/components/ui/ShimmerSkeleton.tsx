import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface ShimmerSkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  duration?: number;
}

export const ShimmerSkeleton = ({
  width,
  height,
  borderRadius = 6,
  style,
  className,
  duration = 2000,
}: ShimmerSkeletonProps) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [duration, animatedValue]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(animatedValue.value, [0, 1], [-400, 600]),
        },
      ],
    };
  });

  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor: '#e5e7eb', overflow: 'hidden' },
        style,
      ]}
      className={className}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle, { width: 500 }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};
