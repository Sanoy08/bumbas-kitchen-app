import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const SEARCH_TERMS = ['"Chicken Kosha"', '"Biryani"', '"Fish Fry"', '"Alur Dom"', '"Chana Paneer"', '"Thali"'];

export const AnimatedSearchText = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let isActive = true;

    // Initial entrance
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
    opacity.value = withTiming(1, { duration: 400 });

    const interval = setInterval(() => {
      if (!isActive) return;
      
      // Exit animation (slide up and fade out)
      translateY.value = withTiming(-20, { duration: 300, easing: Easing.in(Easing.ease) });
      opacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished && isActive) {
          runOnJS(setCurrentIndex)((prev) => (prev + 1) % SEARCH_TERMS.length);
          // Instantly move to bottom
          translateY.value = 20;
          // Enter animation (slide up to center and fade in)
          translateY.value = withDelay(50, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));
          opacity.value = withDelay(50, withTiming(1, { duration: 400 }));
        }
      });
    }, 2500); // Change text every 2.5 seconds

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
      position: 'absolute',
      left: 0,
    };
  });

  return (
    <View className="flex-1 ml-2.5 h-6 overflow-hidden justify-center relative">
      <Animated.Text
        style={[animatedStyle]}
        className="text-gray-500 font-medium font-sans text-base"
        numberOfLines={1}
      >
        Search {SEARCH_TERMS[currentIndex]}
      </Animated.Text>
    </View>
  );
};
