// src/app/(shop)/cart.tsx

import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingCart } from 'lucide-react-native';

export default function CartScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View 
      className="flex-1 bg-white items-center justify-center px-4" 
      style={{ paddingTop: insets.top }}
    >
      <View className="h-24 w-24 bg-gray-50 rounded-full items-center justify-center mb-6">
        <ShoppingCart size={40} color="#d1d5db" />
      </View>
      <Text className="text-2xl font-bold text-gray-900 font-sans mb-2">
        Your Cart is Empty
      </Text>
      <Text className="text-center text-gray-500 font-sans">
        Looks like you haven't added any delicious meals yet.
      </Text>
    </View>
  );
}