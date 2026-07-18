import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { withTiming, Easing, useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { formatPrice } from '@/shared/utils/utils';

const { width } = Dimensions.get('window');

interface SavingsBannerProps {
  amount: number;
  staticDisplay?: boolean;
}

export function SavingsBanner({ amount, staticDisplay = false }: SavingsBannerProps) {
  const targetHeight = 36; // 32 (content) + 4 (scallop)
  const [shouldRender, setShouldRender] = useState(amount > 0);
  const [displayAmount, setDisplayAmount] = useState(amount > 0 ? amount : 0);

  const height = useSharedValue(amount > 0 ? targetHeight : 0);
  const opacity = useSharedValue(amount > 0 ? 1 : 0);
  const translateY = useSharedValue(amount > 0 ? 0 : -50);

  useEffect(() => {
    if (amount > 0) {
      setDisplayAmount(amount);
    }
  }, [amount]);

  // Generate a scalloped edge path dynamically based on screen width
  const scallopRadius = 4;
  const scallopDiameter = scallopRadius * 2;
  const totalScallops = Math.ceil(width / scallopDiameter) + 1;
  let scallopPath = `M0,0`;
  for (let i = 0; i < totalScallops; i++) {
    scallopPath += ` a${scallopRadius},${scallopRadius} 0 0,0 ${scallopDiameter},0`;
  }
  scallopPath += ` L${totalScallops * scallopDiameter},-20 L0,-20 Z`;

  useEffect(() => {
    if (staticDisplay) {
      setShouldRender(amount > 0);
      return; 
    }

    if (amount > 0) {
      setShouldRender(true);
      height.value = withTiming(targetHeight, { duration: 400, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    } else {
      // Unmount after animation finishes
      opacity.value = withTiming(0, { duration: 250, easing: Easing.in(Easing.cubic) });
      translateY.value = withTiming(-50, { duration: 300, easing: Easing.in(Easing.cubic) });
      height.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(setShouldRender)(false);
        }
      });
    }
  }, [amount, staticDisplay]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!shouldRender) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle, { overflow: 'hidden' }]}>
      <View style={styles.content}>
        <LottieView
          source={require('@/../assets/animations/party-emoji.json')}
          autoPlay
          loop
          style={{ width: 24, height: 24 }}
        />
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            Woohoo! You've just saved <Text style={styles.boldText}>{formatPrice(displayAmount)}</Text>
          </Text>
        </View>
      </View>
      <Svg height="4" width={width} style={styles.svg}>
        <Path 
          fill="#16a34a" 
          d={scallopPath} 
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1,
  },
  content: {
    backgroundColor: '#16a34a', // Green-600
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 16,
    gap: 8,
  },
  textContainer: {
    flexDirection: 'row',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'left',
  },
  boldText: {
    fontWeight: '900',
    fontSize: 15,
  },
  svg: {
    transform: [{ translateY: -1 }], // fixes sub-pixel rendering gap
  }
});
