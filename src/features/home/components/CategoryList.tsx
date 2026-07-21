// src/features/home/components/CategoryList.tsx
import { Image } from 'expo-image';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const CATEGORIES = [
  { name: "All", image: require('../../../../assets/Categories/9.webp'), color: "border-slate-500" },
  { name: "Chicken", image: require('../../../../assets/Categories/7.webp'), color: "border-red-500" },
  { name: "Mutton", image: require('../../../../assets/Categories/4.webp'), color: "border-rose-700" },
  { name: "Rice", image: require('../../../../assets/Categories/2.webp'), color: "border-orange-400" },
  { name: "Fish", image: require('../../../../assets/Categories/3.webp'), color: "border-blue-500" },
  { name: "Paneer", image: require('../../../../assets/Categories/8.webp'), color: "border-indigo-500" },
  { name: "Chapati", image: require('../../../../assets/Categories/6.webp'), color: "border-emerald-500" },
  { name: "Veg", image: require('../../../../assets/Categories/1.webp'), color: "border-lime-500" },
];

export { CATEGORIES };

interface CategoryListProps {
  activeCategory: string;
  setActiveCategory: (name: string) => void;
}

export const CategoryList = memo(({ activeCategory, setActiveCategory }: CategoryListProps) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollViewWidth, setScrollViewWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const itemLayouts = useRef<{ [key: string]: { x: number; width: number } }>({});

  const scrollToCenter = useCallback((category: string) => {
    InteractionManager.runAfterInteractions(() => {
      const layout = itemLayouts.current[category];
      if (!layout || scrollViewWidth === 0) {
        requestAnimationFrame(() => {
          const retryLayout = itemLayouts.current[category];
          if (retryLayout && scrollViewWidth > 0) {
            const offsetX = retryLayout.x + retryLayout.width / 2 - scrollViewWidth / 2;
            const clamped = Math.max(0, Math.min(offsetX, contentWidth - scrollViewWidth));
            scrollViewRef.current?.scrollTo({ x: clamped, animated: true });
          }
        });
        return;
      }
      const offsetX = layout.x + layout.width / 2 - scrollViewWidth / 2;
      const clamped = Math.max(0, Math.min(offsetX, contentWidth - scrollViewWidth));
      scrollViewRef.current?.scrollTo({ x: clamped, animated: true });
    });
  }, [scrollViewWidth, contentWidth]);

  useEffect(() => {
    scrollToCenter(activeCategory);
  }, [activeCategory, scrollToCenter]);

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-2"
      contentContainerStyle={{ paddingRight: 20 }}
      onLayout={(e) => setScrollViewWidth(e.nativeEvent.layout.width)}
      onContentSizeChange={(w) => setContentWidth(w)}
      scrollEventThrottle={16}
    >
      {CATEGORIES.map((cat, idx) => {
        const isActive = activeCategory === cat.name;
        return (
          <TouchableOpacity
            key={idx}
            onLayout={(e) => {
              itemLayouts.current[cat.name] = {
                x: e.nativeEvent.layout.x,
                width: e.nativeEvent.layout.width,
              };
            }}
            onPress={() => setActiveCategory(cat.name)}
            className={`items-center mx-2 pb-0 ${isActive ? 'border-b-[3px] border-primary' : ''}`}
            activeOpacity={0.7}
          >
            <View className={`h-16 w-16 rounded-full mb-1.5 overflow-hidden items-center justify-center border-2 ${isActive ? 'border-primary' : 'border-gray-200 bg-gray-50'}`}>
              <Image source={cat.image} style={{ width: '100%', height: '100%', borderRadius: 32 }} contentFit="cover" />
            </View>
            <Text className={`text-xs ${isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-600'} font-sans`}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});
