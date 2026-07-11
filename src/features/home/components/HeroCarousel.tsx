// src/features/home/components/HeroCarousel.tsx
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, TouchableOpacity, View } from 'react-native';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';

const { width: windowWidth } = Dimensions.get('window');

interface HeroCarouselProps {
  slides: any[];
}

const AutoScaledImage = ({ url }: { url: string }) => (
  <Image
    source={{ uri: url }}
    style={{ width: windowWidth, aspectRatio: 1 }}
    contentFit="cover"
  />
);

export const HeroCarousel = ({ slides }: HeroCarouselProps) => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <Link href={item.clickUrl || '/menus'} asChild>
            <TouchableOpacity activeOpacity={0.9} style={{ width: windowWidth }}>
              <AutoScaledImage url={optimizeImageUrl(item.imageUrl)} />
            </TouchableOpacity>
          </Link>
        )}
        keyExtractor={(item, index) => item.id || index.toString()}
      />
      {slides.length > 1 && (
        <View className="flex-row justify-center mt-3 space-x-1.5 pb-2 absolute bottom-2 w-full z-10">
          {slides.map((_: any, idx: number) => (
            <View
              key={idx}
              className={`h-1.5 rounded-full ${currentIndex === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </View>
      )}
    </View>
  );
};
