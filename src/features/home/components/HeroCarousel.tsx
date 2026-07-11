// src/features/home/components/HeroCarousel.tsx
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';

const { width: windowWidth } = Dimensions.get('window');

interface HeroCarouselProps {
  slides: any[];
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const AnimatedDot = ({ index, scrollX, count }: { index: number; scrollX: Animated.SharedValue<number>; count: number }) => {
  const inputRange = slides_inputRange(index, count);

  const dotStyle = useAnimatedStyle(() => {
    const width = interpolate(
      scrollX.value,
      inputRange,
      [6, 20, 6],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );
    return { width, opacity };
  });

  return (
    <Animated.View
      style={[{ height: 6, borderRadius: 3, backgroundColor: '#ffffff', marginHorizontal: 3 }, dotStyle]}
    />
  );
};

function slides_inputRange(index: number, count: number) {
  return [
    (index - 1) * windowWidth,
    index * windowWidth,
    (index + 1) * windowWidth,
  ];
}

const SlideItem = ({ item, index, scrollX }: { item: any; index: number; scrollX: Animated.SharedValue<number> }) => {
  const inputRange = [
    (index - 1) * windowWidth,
    index * windowWidth,
    (index + 1) * windowWidth,
  ];

  const animatedStyle = useAnimatedStyle(() => {
    // When leaving (scrollX moves past this slide), translate it slightly to the right to make it slower.
    // The next slide comes in at normal speed (0 translate) and overlaps it.
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [0, 0, windowWidth * 0.4],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View style={[{ width: windowWidth, overflow: 'hidden' }, animatedStyle]}>
      <Link href={item.clickUrl || '/menus'} asChild>
        <TouchableOpacity activeOpacity={0.9} style={{ width: windowWidth }}>
          <Image
            source={{ uri: optimizeImageUrl(item.imageUrl) }}
            style={{ width: windowWidth, aspectRatio: 1 }}
            contentFit="cover"
          />
        </TouchableOpacity>
      </Link>
    </Animated.View>
  );
};

export const HeroCarousel = ({ slides }: HeroCarouselProps) => {
  const flatListRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const getItemLayout = (_: any, index: number) => ({
    length: windowWidth,
    offset: windowWidth * index,
    index,
  });

  useEffect(() => {
    if (slides.length === 0) return;
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % slides.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, 4000);
    return () => clearInterval(interval);
  }, [currentIndex, slides.length]);

  if (slides.length === 0) return null;

  return (
    <View className="bg-white pb-2 relative">
      <AnimatedFlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={(e: any) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
          setCurrentIndex(index);
        }}
        renderItem={({ item, index }) => (
          <SlideItem item={item} index={index as number} scrollX={scrollX} />
        )}
        keyExtractor={(item: any, index: number) => item.id || index.toString()}
      />
      {slides.length > 1 && (
        <View style={{ position: 'absolute', bottom: 14, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
          {slides.map((_: any, idx: number) => (
            <AnimatedDot key={idx} index={idx} scrollX={scrollX} count={slides.length} />
          ))}
        </View>
      )}
    </View>
  );
};
