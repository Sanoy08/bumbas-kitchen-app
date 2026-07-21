// src/features/home/components/HeroCarousel.tsx
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { memo, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Carousel from 'react-native-reanimated-carousel';
import LottieView from 'lottie-react-native';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';

const { width: windowWidth } = Dimensions.get('window');

interface HeroCarouselProps {
  slides: any[];
}

const AnimatedDot = ({ index, progressValue, count }: { index: number; progressValue: Animated.SharedValue<number>; count: number }) => {
  const dotStyle = useAnimatedStyle(() => {
    // progressValue goes from 0 to count-1.
    // We need to handle looping (e.g. from count-1 back to 0)
    let dist = Math.abs(progressValue.value - index);
    if (dist > count / 2) {
      dist = count - dist; // wrap around for smooth looping distance
    }
    
    const width = interpolate(dist, [0, 1], [20, 6], Extrapolation.CLAMP);
    const opacity = interpolate(dist, [0, 1], [1, 0.4], Extrapolation.CLAMP);

    return { width, opacity };
  });

  return (
    <Animated.View
      style={[{ height: 6, borderRadius: 3, backgroundColor: '#ffffff', marginHorizontal: 3 }, dotStyle]}
    />
  );
};

const HeroSlideItem = ({ item }: { item: any }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <View style={{ width: windowWidth, height: windowWidth, backgroundColor: '#f9fafb' }}>
      <Link href={item.clickUrl || '/menus'} asChild>
        <TouchableOpacity activeOpacity={0.85} style={{ width: windowWidth, height: windowWidth, overflow: 'hidden' }}>
          {!isImageLoaded && (
            <LottieView
              source={require('../../../../assets/animations/Image-Loading.json')}
              autoPlay
              loop
              style={{ width: windowWidth, height: windowWidth, position: 'absolute' }}
              resizeMode="contain"
            />
          )}
          <Image
            source={{ uri: optimizeImageUrl(item.imageUrl) }}
            style={{ width: windowWidth, height: windowWidth }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onLoad={() => setIsImageLoaded(true)}
          />
        </TouchableOpacity>
      </Link>
    </View>
  );
};

export const HeroCarousel = memo(({ slides }: HeroCarouselProps) => {
  const progressValue = useSharedValue<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (slides.length === 0) {
    return (
      <View className="bg-white pb-2 relative">
        <View style={{ width: windowWidth, height: windowWidth, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }}>
          <LottieView
            source={require('../../../../assets/animations/Image-Loading.json')}
            autoPlay
            loop
            style={{ width: windowWidth, height: windowWidth, position: 'absolute' }}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }

  return (
    <View className="bg-white pb-2 relative">
      <Carousel
        loop
        width={windowWidth}
        height={windowWidth}
        autoPlay={true}
        autoPlayInterval={4000}
        data={slides}
        scrollAnimationDuration={400}
        onSnapToItem={(index) => setCurrentIndex(index)}
        onProgressChange={(_, absoluteProgress) => {
          progressValue.value = absoluteProgress;
        }}
        customAnimation={(value: number) => {
          "worklet";
          // value: 0 is center, 1 is right (entering), -1 is left (leaving)
          // We want the leaving item to move slowly to the left, and entering item to move normally.
          const translateX = interpolate(
            value,
            [-1, 0, 1],
            [-windowWidth * 0.25, 0, windowWidth],
            Extrapolation.CLAMP
          );

          // We want the entering item (value > 0) to be on top of the leaving item (value < 0)
          const zIndex = Math.round(interpolate(
            value, 
            [-1, 0, 1], 
            [0, 1, 2],
            Extrapolation.CLAMP
          ));

          // Fade out items that are not adjacent to prevent looping glitches
          const opacity = interpolate(
            value,
            [-2, -1, 0, 1, 2],
            [0, 1, 1, 1, 0],
            Extrapolation.CLAMP
          );

          return {
            transform: [{ translateX }],
            zIndex,
            opacity,
          };
        }}
        renderItem={({ item }) => <HeroSlideItem item={item} />}
      />
      
      {slides.length > 1 && (
        <View style={{ position: 'absolute', bottom: 14, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
          {slides.map((_: any, idx: number) => (
            <AnimatedDot key={idx} index={idx} progressValue={progressValue} count={slides.length} />
          ))}
        </View>
      )}
    </View>
  );
});
