// src/features/home/components/DailySpecialSection.tsx
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { memo } from 'react';
import { Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';
import { formatPrice } from '@/shared/utils/utils';
import { SpecialDishCard } from '@/shared/components/shop/SpecialDishCard';
import { SectionHeading } from './SectionHeading';
import { Star, Utensils, ArrowRight, Sun, Moon, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

interface DailySpecialSectionProps {
  products: any[];
}

export const DailySpecialSection = memo(({ products }: DailySpecialSectionProps) => {
  if (!products || products.length === 0) return null;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

  return (
    <View className="py-6 my-2 bg-gradient-to-b from-amber-50/90 via-orange-50/50 to-amber-50/30 border-y border-amber-100">
      <View className="px-4 mb-4">
        <View className="flex-row items-center justify-between">
          <SectionHeading title="Today's Special 🌟" />
          <View className="bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200/80 flex-row items-center gap-1">
            <Star size={11} color="#b45309" fill="#b45309" />
            <Text className="text-[11px] font-bold text-amber-800 font-sans">
              Daily Specials
            </Text>
          </View>
        </View>
        <Text className="text-gray-500 mt-1 font-sans ml-1 text-sm">
          Freshly prepared handpicked delicacies available today
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
      >
        {products.map(product => {
          // Prioritize cloudinary images over external links
          const bestImage = product.images?.find((img: any) => img.url?.includes('cloudinary')) || product.images?.[0];
          const hasValidImage = bestImage && bestImage.url && bestImage.url.trim() !== '';

          const itemDate = product.deliveryDate || product.date || todayStr;
          const isToday = itemDate === todayStr;
          const isTomorrow = itemDate === tomorrowStr;

          const isLunch = product.mealType === 'lunch';
          const isDinner = product.mealType === 'dinner';

          return (
            <View 
              key={product.id} 
              className="bg-white p-3.5 rounded-3xl shadow-sm border border-amber-200/80 w-72 flex-col justify-between"
              style={{
                shadowColor: '#f59e0b',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 10,
                elevation: 3
              }}
            >
              <Link href={`/menus/${product.slug}`} asChild>
                <TouchableOpacity 
                  activeOpacity={0.9} 
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                  {/* Image or Poster */}
                  <View className="aspect-square w-full rounded-2xl overflow-hidden bg-amber-50 relative border border-amber-100/60">
                    {hasValidImage ? (
                      <>
                        <Image
                          source={{ uri: optimizeImageUrl(bestImage.url, 400, 400) }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                          transition={200}
                          cachePolicy="memory-disk"
                        />
                        {/* Overlay Badges */}
                        <View className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full flex-row items-center gap-1 border border-white/20">
                          <Star size={10} color="#fbbf24" fill="#fbbf24" />
                          <Text className="text-[10px] font-bold text-white uppercase tracking-wider font-sans">
                            Special
                          </Text>
                        </View>
                        {/* Meal Timing Badge (Lunch / Dinner / Lunch & Dinner) */}
                        {isLunch ? (
                          <View className="absolute top-2.5 right-2.5 bg-amber-500/95 px-2.5 py-0.5 rounded-full shadow-sm flex-row items-center gap-1 border border-white/20">
                            <Sun size={10} color="#ffffff" strokeWidth={2.5} />
                            <Text className="text-[11px] font-black text-white font-sans uppercase tracking-wider">
                              Lunch
                            </Text>
                          </View>
                        ) : isDinner ? (
                          <View className="absolute top-2.5 right-2.5 bg-indigo-600/95 px-2.5 py-0.5 rounded-full shadow-sm flex-row items-center gap-1 border border-white/20">
                            <Moon size={10} color="#ffffff" strokeWidth={2.5} />
                            <Text className="text-[11px] font-black text-white font-sans uppercase tracking-wider">
                              Dinner
                            </Text>
                          </View>
                        ) : (
                          <View className="absolute top-2.5 right-2.5 bg-primary/95 px-2.5 py-0.5 rounded-full shadow-sm flex-row items-center gap-1 border border-white/20">
                            <Utensils size={10} color="#ffffff" strokeWidth={2.5} />
                            <Text className="text-[11px] font-black text-white font-sans uppercase tracking-wider">
                              Lunch & Dinner
                            </Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <SpecialDishCard
                        name={product.name}
                        description=""
                        price={product.price}
                      />
                    )}
                  </View>

                  {/* Title & Preview Details */}
                  <View className="mt-3 px-1">
                    <View className="flex-row items-center justify-between gap-1">
                      <Text 
                        className="text-gray-900 font-extrabold text-base font-sans flex-1" 
                        numberOfLines={1}
                      >
                        {product.name}
                      </Text>
                      {product.category?.name && (
                        <View className="bg-gray-100 px-2 py-0.5 rounded-md">
                          <Text className="text-[10px] font-bold text-gray-600 uppercase font-sans">
                            {product.category.name}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Date Badge */}
                    <View className="flex-row items-center gap-1.5 flex-wrap mt-2">
                      <View className="bg-amber-100/70 px-2.5 py-0.5 rounded-md flex-row items-center gap-1 border border-amber-200/60">
                        <Calendar size={11} color="#b45309" />
                        <Text className="text-[10px] font-bold text-amber-900 font-sans">
                          {isToday ? 'Available Today' : isTomorrow ? 'Available Tomorrow' : `Available ${itemDate}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Link>

              {/* Order Now Button */}
              <Link href={`/menus/${product.slug}`} asChild>
                <TouchableOpacity 
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                  activeOpacity={0.85}
                  className="mt-3.5 bg-primary h-12 rounded-xl flex-row items-center justify-center shadow-sm"
                  style={{
                    shadowColor: '#e11d48',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 5,
                    elevation: 3
                  }}
                >
                  <Text className="text-white font-bold text-sm font-sans mr-1.5">
                    Order Now • {formatPrice(product.price)}
                  </Text>
                  <ArrowRight size={16} color="#ffffff" strokeWidth={2.5} />
                </TouchableOpacity>
              </Link>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});
