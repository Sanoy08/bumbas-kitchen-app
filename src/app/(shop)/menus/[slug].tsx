// src/app/(shop)/menus/[slug].tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Minus, Plus, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { ProductCard } from '@/components/shop/ProductCard';
import { optimizeImageUrl } from '@/lib/imageUtils';
import { formatPrice } from '@/lib/utils';

const { width: screenWidth } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';
const PLACEHOLDER_IMAGE_URL = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop';

export default function ProductDetailsScreen() {
  const searchParams = useLocalSearchParams();
  const slug = searchParams.slug;
  
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState<any>(null);
  const [userRating, setUserRating] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setIsLoading(true);
      
      try {
        // ★ Local Cache Logic (To prevent "Product not found" API error)
        const cachedData = await AsyncStorage.getItem('bumbas_home_data');
        if (cachedData) {
          const homeData = JSON.parse(cachedData);
          const allProducts = homeData.allProducts || [];
          
          const foundProduct = allProducts.find((p: any) => p.slug === slug);
          
          if (foundProduct) {
            setProduct(foundProduct);
            
            const related = allProducts
              .filter((p: any) => p.category?.name === foundProduct.category?.name && p.id !== foundProduct.id)
              .slice(0, 4);
            setRelatedProducts(related);
            
            if (foundProduct.images && foundProduct.images.length > 0) {
              setMainImage(foundProduct.images[0]);
            } else {
              setMainImage({ id: 'default', url: PLACEHOLDER_IMAGE_URL, alt: foundProduct.name });
            }
            setIsLoading(false);
            return; 
          }
        }

        // Fallback API Call
        const res = await fetch(`${API_URL}/products/${slug}`);
        const data = await res.json();
        
        if (data && (data.success || data.product || data._id)) {
          const fetchedProduct = data.product || data;
          setProduct(fetchedProduct);
          setRelatedProducts(data.relatedProducts || []);
          
          if (fetchedProduct.images && fetchedProduct.images.length > 0) {
            setMainImage(fetchedProduct.images[0]);
          } else {
            setMainImage({ id: 'default', url: PLACEHOLDER_IMAGE_URL, alt: fetchedProduct.name });
          }
        }
      } catch (error) {
        console.error("Failed to fetch product details:", error);
        toast.error("Failed to load product details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    toast.success(`Added ${quantity}x ${product.name} to cart! 🛒`);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-4">
        <Text className="text-xl font-bold text-gray-800 mb-2">Dish not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="px-6 py-3 bg-gray-900 rounded-md mt-4">
          <Text className="text-white font-medium font-sans">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isNonVeg = product.category?.name === 'Chicken' || product.category?.name === 'Mutton' || product.category?.name === 'Egg' || product.category?.name === 'Fish';

  return (
    <View className="flex-1 bg-white">
      {/* App Specific: Floating Back Button (Since mobiles don't have browser back buttons) */}
      <View style={{ paddingTop: insets.top + 10, position: 'absolute', top: 0, left: 16, zIndex: 50 }}>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="h-10 w-10 bg-white/90 rounded-full items-center justify-center shadow-sm border border-gray-100"
        >
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="flex-1 bg-white" 
        contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top + 60 }}
      >
        <View className="px-4">
          
          {/* --- Left Column (Web) -> Image Gallery --- */}
          <View>
            <View className="relative aspect-square w-full rounded-lg overflow-hidden border border-gray-200 mb-4 bg-gray-100">
              <Image 
                source={{ uri: optimizeImageUrl(mainImage?.url || PLACEHOLDER_IMAGE_URL) }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
              />
            </View>

            {product.images && product.images.length > 1 && (
              <View className="flex-row justify-between w-full">
                {product.images.slice(0, 4).map((image: any) => (
                  <TouchableOpacity 
                    key={image.id}
                    onPress={() => setMainImage(image)}
                    className={`relative w-[23%] aspect-square rounded-md overflow-hidden bg-gray-100 border-2 ${
                      mainImage?.id === image.id ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <Image 
                      source={{ uri: optimizeImageUrl(image.url) }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          {/* --- Right Column (Web) -> Product Details --- */}
          <View className="pt-8">
            <View className="flex-row items-center gap-4 mb-2">
              <View className={`w-5 h-5 border flex items-center justify-center ${isNonVeg ? 'border-red-600' : 'border-green-600'}`}>
                <View className={`w-3 h-3 rounded-full ${isNonVeg ? 'bg-red-600' : 'bg-green-600'}`}></View>
              </View>
              <View className="flex-row items-center gap-1">
                <Star size={16} color="#f59e0b" fill="#f59e0b" />
                <Text className="font-bold text-gray-900 font-sans">{product.rating || "4.5"}</Text>
              </View>
            </View>
            
            <Text className="text-3xl font-bold text-gray-900 font-sans leading-tight">
              {product.name}
            </Text>
            
            <Text className="text-3xl font-bold text-primary my-4 font-sans">
              {formatPrice(product.price)}
            </Text>

            <View className="flex-row items-center gap-4 mb-6">
              <Text className="font-medium text-gray-900 font-sans text-base">Quantity</Text>
              <View className="flex-row items-center border border-gray-200 rounded-md h-10">
                <TouchableOpacity 
                  onPress={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-full items-center justify-center"
                >
                  <Minus size={16} color="#0f172a" />
                </TouchableOpacity>
                <Text className="w-10 text-center font-medium text-gray-900 font-sans">
                  {quantity}
                </Text>
                <TouchableOpacity 
                  onPress={() => setQuantity(q => q + 1)}
                  className="w-10 h-full items-center justify-center"
                >
                  <Plus size={16} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Shadcn style Button */}
            <TouchableOpacity 
              onPress={handleAddToCart}
              className="w-full bg-gray-900 h-11 rounded-md items-center justify-center"
            >
              <Text className="text-white font-medium text-base font-sans">Add to Cart</Text>
            </TouchableOpacity>
          </View>

          {/* --- About This Item --- */}
          <View className="mt-12">
            <Text className="text-2xl font-bold text-gray-900 font-sans mb-4">About This Item</Text>
            <Text className="text-base text-gray-500 font-sans leading-relaxed">
              {product.description || "Enjoy the authentic taste of freshly prepared meals from Bumba's Kitchen."}
            </Text>
          </View>
          
          {/* --- Rating Section --- */}
          <View className="mt-12 bg-white p-8 rounded-lg border border-gray-200 shadow-sm items-center">
            <Text className="text-xl font-semibold text-gray-900 font-sans mb-2">Enjoyed the meal? Rate it!</Text>
            <View className="flex-row justify-center gap-2 my-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
                  <Star 
                    size={32} 
                    color={userRating >= star ? "#f59e0b" : "#d1d5db"} 
                    fill={userRating >= star ? "#f59e0b" : "transparent"} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            {/* Shadcn Outline Button */}
            <TouchableOpacity 
              className="border border-gray-200 h-10 px-4 rounded-md justify-center items-center"
              onPress={() => { 
                if(userRating > 0) {
                  toast.success("Thank you for your rating! 💖"); 
                  setUserRating(0); 
                } else {
                  toast.error("Please select a rating first.");
                }
              }}
            >
              <Text className="font-medium text-gray-900 font-sans">Submit Rating</Text>
            </TouchableOpacity>
          </View>

          {/* --- Related Products --- */}
          {relatedProducts && relatedProducts.length > 0 && (
            <View className="mt-16">
              <Text className="text-2xl font-bold text-gray-900 font-sans mb-6 text-center">You May Also Like</Text>
              
              {/* Using flex-wrap grid equivalent for Native to match Web's grid layout */}
              <View className="flex-row flex-wrap justify-between gap-y-4">
                {relatedProducts.map((p) => (
                  <View key={p.id || p._id} style={{ width: '48%', height: 240 }}>
                    <ProductCard product={p} />
                  </View>
                ))}
              </View>

            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}