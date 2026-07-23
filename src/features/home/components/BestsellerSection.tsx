import { ScrollView, Text, View } from 'react-native';
import { memo } from 'react';
import { ProductCard } from '@/shared/components/shop/ProductCard';
import { SectionHeading } from './SectionHeading';

interface BestsellerSectionProps {
  bestsellers: any[];
}

import { ArrowRight } from 'lucide-react-native';

export const BestsellerSection = memo(({ bestsellers }: BestsellerSectionProps) => {
  if (!bestsellers || bestsellers.length === 0) return null;

  const half = Math.ceil(bestsellers.length / 2);
  const topRow = bestsellers.slice(0, half);
  const bottomRow = bestsellers.slice(half);

  return (
    <View className="px-4 py-8">
      <SectionHeading 
        title="Our Bestseller" 
        rightElement={
          <View className="flex-row items-center bg-gray-100 px-2.5 py-1 rounded-full">
            <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mr-1 font-sans">Swipe</Text>
            <ArrowRight size={12} color="#6b7280" />
          </View>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {topRow.map((item: any) => (
              <View key={item.id} style={{ width: 160, height: 250, marginRight: 12 }}>
                <ProductCard product={item} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row' }}>
            {bottomRow.map((item: any) => (
              <View key={item.id} style={{ width: 160, height: 250, marginRight: 12 }}>
                <ProductCard product={item} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
});
