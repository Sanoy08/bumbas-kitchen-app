// src/features/home/components/DailySpecialSection.tsx
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { memo } from 'react';
import { Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';
import { formatPrice } from '@/shared/utils/utils';
import { SpecialDishCard } from '@/shared/components/shop/SpecialDishCard';
import { SectionHeading } from './SectionHeading';

interface DailySpecialSectionProps {
  products: any[];
}

export const DailySpecialSection = memo(({ products }: DailySpecialSectionProps) => {
  if (!products || products.length === 0) return null;

  return (
    <View className="py-10 bg-orange-50/70 py-6 my-2 border-y border-orange-100">
      <View className="px-4">
        <SectionHeading title="Chef's Special 🌟" />
        <Text className="text-gray-500 mb-6 font-sans ml-1 text-base">
          Handpicked recommendations just for you
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
        {products.map(product => {
          // Prioritize cloudinary images over external links like Pinterest which block hotlinking
          const bestImage = product.images?.find((img: any) => img.url?.includes('cloudinary')) || product.images?.[0];
          const hasValidImage = bestImage && bestImage.url && bestImage.url.trim() !== '';

          return (
            <View key={product.id} className="bg-white p-3 rounded-3xl shadow-sm border border-amber-100 w-72">
              <View className="aspect-square w-full rounded-2xl overflow-hidden bg-gray-100 relative">
                {hasValidImage ? (
                  <Image
                    source={{ uri: optimizeImageUrl(bestImage.url, 300, 300) }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <SpecialDishCard
                    name={product.name}
                    description={product.description}
                    price={product.price}
                  />
                )}
              </View>
              <Link href={`/menus/${product.slug}`} asChild>
                <TouchableOpacity className="mt-4 bg-primary h-12 rounded-xl items-center justify-center shadow-sm">
                  <Text className="text-white font-bold text-base font-sans">
                    Order Now - {formatPrice(product.price)}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});
