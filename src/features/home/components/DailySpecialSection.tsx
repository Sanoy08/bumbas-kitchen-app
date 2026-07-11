// src/features/home/components/DailySpecialSection.tsx
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';
import { formatPrice } from '@/shared/utils/utils';
import { SpecialDishCard } from '@/shared/components/shop/SpecialDishCard';

interface DailySpecialSectionProps {
  product: any;
}

export const DailySpecialSection = ({ product }: DailySpecialSectionProps) => {
  if (!product) return null;

  return (
    <View className="py-8 bg-amber-50/60 px-4 mb-6">
      <Text className="text-2xl font-bold text-gray-900 text-center mb-1 font-sans">
        Today's Special 🌟
      </Text>
      <Text className="text-sm text-gray-500 text-center mb-6 font-sans">
        Freshly prepared just for you.
      </Text>
      <View className="bg-white p-3 rounded-3xl shadow-sm border border-amber-100">
        <View className="aspect-square w-full rounded-2xl overflow-hidden bg-gray-100">
          {product.images?.length > 0 ? (
            <Image
              source={{ uri: optimizeImageUrl(product.images[0].url) }}
              className="w-full h-full"
              contentFit="cover"
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
    </View>
  );
};
