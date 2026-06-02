// src/components/shop/ProductCard.tsx

import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Ban, Minus, Plus, ShoppingCart } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

// আপনার প্রোজেক্টের টাইপ এবং ইউটিলস
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import { optimizeImageUrl } from '@/lib/imageUtils';
import type { CartItem, Product } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

// অন্যান্য কম্পোনেন্ট এবং স্টোর
import { useCartStore } from '@/store/cartStore'; // Zustand কার্ট স্টোর
import { SpecialDishCard } from './SpecialDishCard';

// date-fns এর differenceInDays
import { differenceInDays } from 'date-fns';

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  // Zustand স্টোর থেকে স্টেট এবং অ্যাকশন নিচ্ছি
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const cartItem = items.find((item: CartItem) => item.id === product.id);
  const isOutOfStock = product.stock <= 0;

  // Haptic Feedback
  const triggerVibration = async (style: Haptics.ImpactFeedbackStyle) => {
    try {
      await Haptics.impactAsync(style);
    } catch (err) {
      console.error("Haptics failed", err);
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

  // ইমেজ চেক লজিক
  const hasValidImage = product.images && product.images.length > 0 && product.images[0].url && product.images[0].url.trim() !== '';
  const rawImageUrl = hasValidImage ? product.images[0].url : PLACEHOLDER_IMAGE_URL;
  const imageSrc = optimizeImageUrl(rawImageUrl);

  // স্পেশাল ডিশ কার্ড
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
        {/* Floating Add Button */}
        <TouchableOpacity
          onPress={handleAdd}
          className="absolute bottom-4 right-4 bg-white rounded-full p-3 shadow-md z-20"
        >
          <ShoppingCart size={20} color="#e11d48" />
        </TouchableOpacity>
      </View>
    );
  }

  // নরমাল প্রোডাক্ট কার্ড
  return (
    <View className={`flex-1 m-1.5 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm ${isOutOfStock ? 'opacity-70' : ''}`}>
      <Link href={`/menus/${product.slug}`} asChild>
        <TouchableOpacity activeOpacity={0.9} className="aspect-square relative overflow-hidden bg-gray-50">
          {isOutOfStock ? (
            <View className="absolute top-2 right-2 bg-red-500 px-2 py-1 rounded-md z-10">
              <Text className="text-white text-[10px] font-bold">Out of Stock</Text>
            </View>
          ) : isNew ? (
            <View className="absolute top-2 right-2 bg-blue-500 px-2 py-1 rounded-md z-10">
              <Text className="text-white text-[10px] font-bold">NEW</Text>
            </View>
          ) : null}

          <Image
            source={{ uri: imageSrc }}
            className="w-full h-full"
            contentFit="cover"
            transition={200}
          />

          {isOutOfStock && <View className="absolute inset-0 bg-black/20 z-0" />}
        </TouchableOpacity>
      </Link>

      <View className="p-3 flex-1 justify-between">
        <Text className="font-semibold text-sm leading-tight text-gray-900" numberOfLines={2}>
          {product.name}
        </Text>

        <View className="flex-row items-center justify-between mt-3">
          <Text className={`font-bold text-base ${isOutOfStock ? 'text-gray-400' : 'text-primary'}`}>
            {formatPrice(product.price)}
          </Text>

          <View>
            {isOutOfStock ? (
              <View className="flex-row items-center bg-gray-100 px-2 py-1.5 rounded-full border border-gray-200">
                <Ban size={12} color="#9ca3af" />
                <Text className="text-[10px] font-medium text-gray-500 ml-1">Sold Out</Text>
              </View>
            ) : cartItem ? (
              <View className="flex-row items-center h-8 border border-primary/30 rounded-full bg-white shadow-sm">
                <TouchableOpacity onPress={handleDecrease} className="px-2 py-1" hitSlop={10}>
                  <Minus size={14} color="#e11d48" />
                </TouchableOpacity>
                <Text className="w-5 text-center font-bold text-sm text-gray-900">{cartItem.quantity}</Text>
                <TouchableOpacity onPress={handleIncrease} className="px-2 py-1" hitSlop={10}>
                  <Plus size={14} color="#e11d48" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleAdd}
                className="h-8 px-3.5 bg-primary items-center justify-center rounded-full flex-row shadow-sm"
              >
                <ShoppingCart size={14} color="#fff" />
                <Text className="text-white text-xs font-semibold ml-1.5">Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}