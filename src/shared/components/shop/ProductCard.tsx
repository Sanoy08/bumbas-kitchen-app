// src\components\shop\ProductCard.tsx

import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Ban, Minus, Plus, ShoppingCart } from 'lucide-react-native';
import { memo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { LOTTIE_PLACEHOLDER } from '@/shared/constants/constants';
import LottieView from 'lottie-react-native';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';
import type { CartItem, Product } from '@/shared/types/types';
import { formatPrice } from '@/shared/utils/utils';

import { useCartStore } from '@/shared/store/cartStore';
import { differenceInDays } from 'date-fns';
import { SpecialDishCard } from './SpecialDishCard';

type ProductCardProps = {
  product: Product;
};

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  // Only subscribe to this specific product's cart item — not the whole cart array.
  // This means only THIS card re-renders when its own quantity changes.
  const cartItem = useCartStore((state) => state.items.find((item: CartItem) => item.id === product.id));
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const isOutOfStock = product.stock <= 0;

  const triggerVibration = async (style: Haptics.ImpactFeedbackStyle) => {
    try {
      await Haptics.impactAsync(style);
    } catch (err) {
      console.log("Haptics failed", err);
    }
  };

  const handleAdd = () => {
    if (!isOutOfStock) {
      addItem(product);
      triggerVibration(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleIncrease = () => {
    if (cartItem) {
      updateQuantity(product.id, cartItem.quantity + 1);
      triggerVibration(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDecrease = () => {
    if (cartItem) {
      updateQuantity(product.id, cartItem.quantity - 1);
      triggerVibration(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const isNew = product.createdAt && differenceInDays(new Date(), new Date(product.createdAt)) < 7;

  const hasValidImage = product.images && product.images.length > 0 && product.images[0].url && product.images[0].url.trim() !== '';
  const imageSrc = hasValidImage ? optimizeImageUrl(product.images[0].url, 200, 200) : null;

  if (product.isDailySpecial && !hasValidImage) {
    return (
      <View className="flex-1 m-1.5 bg-amber-50/30 rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
        <Link href={`/menus/${product.slug}`} asChild>
          <TouchableOpacity activeOpacity={0.9} className="flex-1">
            <View className="aspect-square relative w-full">
              <SpecialDishCard
                name={product.name}
                description={product.description}
                price={product.price}
              />
            </View>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity
          onPress={handleAdd}
          className="absolute bottom-4 right-4 bg-white rounded-full p-3 shadow-md z-20"
        >
          <ShoppingCart size={20} color="#e11d48" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    // Link component এখন পুরো কার্ডকে র‍্যাপ করছে
    <Link href={`/menus/${product.slug}`} asChild>
      <TouchableOpacity 
        activeOpacity={0.9} 
        className={`m-1.5 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex-col ${isOutOfStock ? 'opacity-70' : ''}`}
      >
        {/* Image wrapper: uses aspect ratio but allows parent to define total size */}
        <View className="aspect-square w-full relative overflow-hidden bg-gray-50">
          {isOutOfStock ? (
            <View className="absolute top-2 right-2 bg-red-500 px-2 py-1 rounded-md z-10">
              <Text className="text-white text-[10px] font-bold">Out of Stock</Text>
            </View>
          ) : isNew ? (
            <View className="absolute top-2 right-2 bg-blue-500 px-2 py-1 rounded-md z-10">
              <Text className="text-white text-[10px] font-bold">NEW</Text>
            </View>
          ) : null}

          {imageSrc ? (
            <View style={{ width: '100%', height: '100%' }}>
              {!isImageLoaded && (
                <LottieView
                  source={LOTTIE_PLACEHOLDER}
                  autoPlay
                  loop
                  style={{ width: '100%', height: '100%', position: 'absolute' }}
                />
              )}
              <Image
                source={{ uri: imageSrc }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                onLoad={() => setIsImageLoaded(true)}
              />
            </View>
          ) : (
            <LottieView
              source={LOTTIE_PLACEHOLDER}
              autoPlay
              loop
              style={{ width: '100%', height: '100%' }}
            />
          )}

          {isOutOfStock && <View className="absolute inset-0 bg-black/20 z-0" />}
        </View>

        <View className="p-2.5 md:p-3 flex-col justify-between" style={{ minHeight: 96 }}>
          <Text className="font-semibold text-sm md:text-base leading-tight text-gray-900" numberOfLines={2}>
            {product.name}
          </Text>

          <View className="flex-row items-center justify-between mt-2 flex-wrap gap-y-2">
            <Text className={`font-bold text-[15px] md:text-base ${isOutOfStock ? 'text-gray-400' : 'text-primary'}`}>
              {formatPrice(product.price)}
            </Text>

            <View className="flex-shrink-0">
              {isOutOfStock ? (
                <View className="flex-row items-center bg-gray-100 px-2 py-1.5 rounded-full border border-gray-200">
                  <Ban size={12} color="#9ca3af" />
                  <Text className="text-[10px] font-medium text-gray-500 ml-1">Sold Out</Text>
                </View>
              ) : cartItem ? (
                <View className="flex-row items-center h-8 border border-primary/30 rounded-full bg-white shadow-sm">
                  <TouchableOpacity onPress={handleDecrease} className="px-2 py-1" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <Minus size={14} color="#e11d48" />
                  </TouchableOpacity>
                  <Text className="w-5 text-center font-bold text-sm text-gray-900">{cartItem.quantity}</Text>
                  <TouchableOpacity onPress={handleIncrease} className="px-2 py-1" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <Plus size={14} color="#e11d48" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleAdd}
                  className="h-8 px-3 md:px-4 bg-primary items-center justify-center rounded-full flex-row shadow-sm"
                >
                  <ShoppingCart size={14} color="#fff" />
                  <Text className="text-white text-xs md:text-sm font-semibold ml-1.5">Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
});