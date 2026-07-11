// src/features/home/components/MiddleSlider.tsx
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Carousel from 'react-native-reanimated-carousel';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';

const { width: windowWidth } = Dimensions.get('window');

interface MiddleSliderProps {
  slides: any[];
}

const AnimatedDot = ({ index, progressValue, count }: { index: number; progressValue: Animated.SharedValue<number>; count: number }) => {
  const dotStyle = useAnimatedStyle(() => {
    let dist = Math.abs(progressValue.value - index);
    if (dist > count / 2) {
      dist = count - dist; // wrap around for smooth looping distance
    }
    
    const width = interpolate(dist, [0, 1], [18, 6], Extrapolation.CLAMP);
    const opacity = interpolate(dist, [0, 1], [1, 0.3], Extrapolation.CLAMP);
    const scale = interpolate(dist, [0, 1], [1.1, 1], Extrapolation.CLAMP);

    return { width, opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View
      style={[{ height: 6, borderRadius: 3, backgroundColor: '#e11d48', marginHorizontal: 4 }, dotStyle]}
    />
  );
};

export const MiddleSlider = ({ slides }: MiddleSliderProps) => {
  const progressValue = useSharedValue<number>(0);

  if (!slides || slides.length === 0) return null;

  const cardWidth = windowWidth * 0.9;
  const cardHeight = cardWidth * 0.45;

  return (
    <View className="bg-white pt-4 pb-6 relative">
      <Carousel
        loop
        width={windowWidth}
        height={cardHeight}
        autoPlay={true}
        autoPlayInterval={4000}
        data={slides}
        scrollAnimationDuration={450}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.92,
          parallaxScrollingOffset: 55,
          parallaxAdjacentItemScale: 0.85,
        }}
        onProgressChange={(_, absoluteProgress) => {
          progressValue.value = absoluteProgress;
        }}
        renderItem={({ item }) => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View 
              style={{ width: cardWidth, height: cardHeight, backgroundColor: '#f9fafb', borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
            >
              <Link href={item.clickUrl || '/menus'} asChild>
                <TouchableOpacity activeOpacity={0.85} style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden' }}>
                  <Image
                    source={{ uri: optimizeImageUrl(item.imageUrl) }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={300}
                  />
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        )}
      />
      
      {slides.length > 1 && (
        <View className="flex-row justify-center items-center mt-4">
          {slides.map((_: any, idx: number) => (
            <AnimatedDot key={idx} index={idx} progressValue={progressValue} count={slides.length} />
          ))}
        </View>
      )}
    </View>
  );
};
