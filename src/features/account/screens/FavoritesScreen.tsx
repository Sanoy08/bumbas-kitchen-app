import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, HeartCrack, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { formatPrice } from '@/shared/utils/utils';
import { LOTTIE_PLACEHOLDER } from '@/shared/constants/constants';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';
import { toast } from 'sonner-native';

export function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const savedFavs = JSON.parse(
        (await AsyncStorage.getItem('bumbas_favorites')) || '[]'
      );
      setFavorites(savedFavs);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFavorite = async (id: string, name: string) => {
    try {
      const newFavs = favorites.filter((fav) => fav.id !== id);
      setFavorites(newFavs);
      await AsyncStorage.setItem('bumbas_favorites', JSON.stringify(newFavs));
      toast.success(`${name} removed from favorites`);
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const FavoriteItem = React.memo(({ item, removeFavorite }: { item: any, removeFavorite: (id: string, name: string) => void }) => {
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/(shop)/menus/${item.slug}`)}
        className="flex-row items-center bg-white border border-gray-100 rounded-2xl p-3 mb-4 shadow-sm"
      >
        <View className="h-24 w-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
          {!item.image ? (
            <LottieView
              source={LOTTIE_PLACEHOLDER}
              autoPlay
              loop
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
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
                source={{ uri: optimizeImageUrl(item.image, 200, 200) }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                onLoad={() => setIsImageLoaded(true)}
              />
            </View>
          )}
        </View>

        <View className="flex-1 ml-4 justify-center">
          <Text className="text-lg font-bold text-gray-900 font-sans mb-1" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="text-lg font-black text-primary font-sans">
            {formatPrice(item.price)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => removeFavorite(item.id, item.name)}
          className="h-10 w-10 items-center justify-center bg-red-50 rounded-full ml-2 border border-red-100"
        >
          <Trash2 size={18} color="#ef4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  });

  const renderItem = ({ item }: { item: any }) => (
    <FavoriteItem item={item} removeFavorite={removeFavorite} />
  );

  return (
    <View className="flex-1 bg-[#f9fafb]">
      {/* Header */}
      <View
        className="bg-white px-4 border-b border-gray-200 z-10"
        style={{
          paddingTop: Platform.OS === 'ios' ? insets.top + 10 : insets.top + 20,
          paddingBottom: 16,
        }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center justify-center mr-10">
            <Text className="text-xl font-black text-gray-900 font-sans text-center">
              My Favorites
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-8">
          <View className="w-24 h-24 bg-red-50 rounded-full items-center justify-center mb-6">
            <HeartCrack size={40} color="#ef4444" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2 font-sans text-center">
            No Favorites Yet!
          </Text>
          <Text className="text-sm text-gray-500 mb-8 text-center leading-relaxed font-sans">
            You haven't saved any dishes. Explore our menu and tap the heart icon to save your favorites here.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(shop)/explore')}
            className="bg-primary px-8 py-3.5 rounded-2xl shadow-md"
            activeOpacity={0.9}
          >
            <Text className="text-white font-bold text-base tracking-wide font-sans">
              Explore Menu
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
