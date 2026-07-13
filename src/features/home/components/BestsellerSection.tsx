// src/features/home/components/BestsellerSection.tsx
import { ScrollView, Text, View } from 'react-native';
import { ProductCard } from '@/shared/components/shop/ProductCard';
import { SectionHeading } from './SectionHeading';

interface BestsellerSectionProps {
  bestsellers: any[];
}

export const BestsellerSection = ({ bestsellers }: BestsellerSectionProps) => {
  if (!bestsellers || bestsellers.length === 0) return null;

  const half = Math.ceil(bestsellers.length / 2);
  const topRow = bestsellers.slice(0, half);
  const bottomRow = bestsellers.slice(half);

  return (
    <View className="px-4 py-8">
      <SectionHeading title="Our Bestsellers" />
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
};
