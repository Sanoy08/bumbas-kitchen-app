// src/components/shop/SpecialDishCard.tsx

import { formatPrice } from '@/lib/utils';
import { CalendarDays, Utensils } from 'lucide-react-native';
import { Text, View } from 'react-native';

type Props = {
  name: string;
  description: string;
  price: number;
  date?: string;
};

export function SpecialDishCard({ name, description, price, date }: Props) {
  // তারিখ ফরম্যাটিং
  const displayDate = date || new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // ডেসক্রিপশন থেকে লিস্ট আইটেম বের করা
  const items = description
    .split('\n')
    .map(line => line.trim().replace(/^[-•]\s*/, ''))
    .filter(line => line.length > 0);

  return (
    <View className="w-full h-full bg-amber-50 p-6 flex-col items-center justify-center relative overflow-hidden border-[3px] border-amber-200 rounded-2xl">
      
      {/* ডেকোরেটিভ ব্যাকগ্রাউন্ড এলিমেন্ট */}
      <View className="absolute top-0 left-0 right-0 h-2 bg-amber-400 opacity-50" />
      <View className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-300 rounded-full opacity-20" />
      <View className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-300 rounded-full opacity-20" />

      <View className="relative z-10 w-full items-center">
        
        {/* হেডার */}
        <View className="flex-row items-center bg-white/80 px-3 py-1 rounded-full shadow-sm mb-4 border border-amber-100">
          <Utensils size={12} color="#b45309" />
          <Text className="text-xs font-bold text-amber-700 ml-1.5 uppercase">
            TODAY'S SPECIAL
          </Text>
        </View>

        {/* টাইটেল */}
        <Text className="text-2xl font-bold text-gray-900 mb-2 text-center leading-tight">
          {name}
        </Text>

        {/* তারিখ */}
        <View className="flex-row items-center justify-center mb-6">
          <CalendarDays size={14} color="#6b7280" />
          <Text className="text-sm text-gray-500 ml-1.5 italic">
            {displayDate}
          </Text>
        </View>

        {/* মেনু লিস্ট */}
        <View className="space-y-1 mb-6 w-full items-center">
          {items.slice(0, 5).map((item, idx) => (
            <View key={idx} className="border-b border-amber-200/50 pb-1 mb-1 w-full items-center">
              <Text className="text-sm font-medium text-gray-700 text-center">
                {item}
              </Text>
            </View>
          ))}
          {items.length > 5 && (
            <Text className="text-xs text-gray-500 italic mt-1">
              + more items
            </Text>
          )}
        </View>

        {/* দাম */}
        <View className="mt-auto pt-2 items-center">
          <Text className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">
            Only At
          </Text>
          <Text className="text-3xl font-extrabold text-primary">
            {formatPrice(price)}
          </Text>
        </View>

      </View>
    </View>
  );
}