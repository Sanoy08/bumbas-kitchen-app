import { ProductCard } from '@/shared/components/shop/ProductCard';
import { memo } from 'react';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import { SectionHeading } from './SectionHeading';

const { width } = Dimensions.get('window');
const GAP = 8; // Reduced gap between items
const PEEK_AMOUNT = 32; // Amount of the 3rd card to show
const CONTAINER_PADDING = 16; // Left padding (px-4 is 16)
// Calculate width so exactly 2 items + a bit of 3rd item are visible
const CARD_WIDTH = (width - CONTAINER_PADDING - GAP - PEEK_AMOUNT) / 2;

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
        title="Our Bestsellers"
        rightElement={
          <View className="flex-row items-center bg-gray-100 px-2.5 py-1 rounded-full">
            <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mr-1 font-sans">Swipe</Text>
            <ArrowRight size={12} color="#6b7280" />
          </View>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={{ flexDirection: 'row', marginBottom: GAP }}>
            {topRow.map((item: any) => (
              <View key={item.id} style={{ width: CARD_WIDTH, marginRight: GAP }}>
                <ProductCard product={item} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row' }}>
            {bottomRow.map((item: any) => (
              <View key={item.id} style={{ width: CARD_WIDTH, marginRight: GAP }}>
                <ProductCard product={item} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
});
