import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Cake, Gift, Leaf, ShieldCheck, Truck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, ScrollView, Text, TouchableOpacity, View, Modal } from 'react-native';

import { ProductCard } from '@/components/shop/ProductCard';
import { SpecialDishCard } from '@/components/shop/SpecialDishCard';
import { optimizeImageUrl } from '@/lib/imageUtils';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const { width: windowWidth } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';

// --- Constants ---
const CATEGORIES = [
  { name: "All", image: require("../../../assets/Categories/9.webp"), link: "/menus", color: "border-slate-500" },
  { name: "Chicken", image: require("../../../assets/Categories/7.webp"), link: "/menus?category=chicken", color: "border-red-500" },
  { name: "Mutton", image: require("../../../assets/Categories/4.webp"), link: "/menus?category=mutton", color: "border-amber-700" },
  { name: "Rice", image: require("../../../assets/Categories/2.webp"), link: "/menus?category=rice", color: "border-orange-400" },
  { name: "Fish", image: require("../../../assets/Categories/3.webp"), link: "/menus?category=fish", color: "border-cyan-500" },
  { name: "Paneer", image: require("../../../assets/Categories/8.webp"), link: "/menus?category=paneer", color: "border-indigo-500" },
  { name: "Veg", image: require("../../../assets/Categories/1.webp"), link: "/menus?category=veg", color: "border-lime-500" },
];

const FEATURES = [
  { icon: Truck, title: "Safe & Secure", desc: "Get Secured Delivery", color: "#3b82f6", bg: "bg-blue-50" },
  { icon: Leaf, title: "Fresh & Organic", desc: "Farm fresh ingredients", color: "#22c55e", bg: "bg-green-50" },
  { icon: ShieldCheck, title: "Safety First", desc: "100% Hygienic Kitchen", color: "#a855f7", bg: "bg-purple-50" },
];

const TESTIMONIALS = [
  { name: 'Ishita M.', location: 'Kolkata', rating: 5, quote: "The food is very tasty and the price is reasonable. A must try!" },
  { name: 'Rohan G.', location: 'Hooghly', rating: 4.5, quote: "Amazing home-style food! The chicken kosha was simply out of this world." },
  { name: 'Priya S.', location: 'Serampore', rating: 5, quote: "Bumba's Kitchen is my go-to for weekend meals. Consistent quality!" },
];

// --- Dynamic Auto Scaled Image Component ---
const AutoScaledImage = ({ url, isFullWidth = true }: { url: string, isFullWidth?: boolean }) => {
  const [ratio, setRatio] = useState(2); // Default 2:1 aspect ratio

  return (
    <Image
      source={{ uri: url }}
      style={{ width: isFullWidth ? windowWidth : windowWidth - 32, aspectRatio: ratio }}
      contentFit="cover"
      onLoad={(e) => {
        if (e.source.width && e.source.height) {
          setRatio(e.source.width / e.source.height); // Asol image er ratio calculate kora
        }
      }}
    />
  );
};

// --- Reusable Native Carousel Component ---
const AutoCarousel = ({ data, renderItem, autoPlayDelay = 4000, isAutoPlay = false }: any) => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isAutoPlay || data.length === 0) return;
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= data.length) nextIndex = 0;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, autoPlayDelay);
    return () => clearInterval(interval);
  }, [currentIndex, data.length, isAutoPlay]);

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={data}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
          setCurrentIndex(index);
        }}
        renderItem={({ item, index }) => (
          <View style={{ width: windowWidth }}>{renderItem(item, index)}</View>
        )}
        keyExtractor={(item, index) => item.id || index.toString()}
      />
      {data.length > 1 && (
        <View className="flex-row justify-center mt-3 space-x-1.5">
          {data.map((_: any, idx: number) => (
            <View key={idx} className={`h-1.5 rounded-full ${currentIndex === idx ? 'w-6 bg-primary' : 'w-1.5 bg-primary/20'}`} />
          ))}
        </View>
      )}
    </View>
  );
};


export default function HomeScreen() {
  const { user, login } = useAuthStore();
  
  const [homeData, setHomeData] = useState({
    heroSlides: [], sliderImages: [], offers: [], bestsellers: [], allProducts: []
  });

  const [showDatePopup, setShowDatePopup] = useState(false);
  const [dob, setDob] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [activeView, setActiveView] = useState<'main' | 'dob' | 'anniversary'>('main');

  // Cache-First Data Fetching
  useEffect(() => {
    const fetchHomeData = async () => {
      const cachedData = await AsyncStorage.getItem('bumbas_home_data');
      if (cachedData) setHomeData(JSON.parse(cachedData));

      try {
        const res = await fetch(`${API_URL}/home-data`);
        const data = await res.json();
        if (data && data.data) {
          setHomeData(data.data);
          await AsyncStorage.setItem('bumbas_home_data', JSON.stringify(data.data));
        }
      } catch (e) {
        console.log("Home sync failed", e);
      }
    };
    fetchHomeData();
  }, []);

  // Popup Logic
  useEffect(() => {
    if (user) {
      const missingDob = !user.dob; 
      const missingAnniversary = !user.anniversary;
      
      AsyncStorage.getItem('skippedDatePopup').then((hasSkipped) => {
        if ((missingDob || missingAnniversary) && !hasSkipped) {
          setTimeout(() => setShowDatePopup(true), 2000);
        }
      });
    }
  }, [user]);

  const handleSaveDates = async () => {
    setIsSavingDates(true);
    try {
      const nameParts = user?.name ? user.name.trim().split(' ') : ['User', ''];
      const res = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: nameParts,
          lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '.',
          dob: dob || user?.dob,
          anniversary: anniversary || user?.anniversary
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", "Special dates saved successfully! 🎉");
        await login(data.user); 
        setShowDatePopup(false);
      } else {
        Alert.alert("Error", data.error || "Failed to save");
      }
    } catch (e) {
      Alert.alert("Error", "An error occurred");
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleSkipPopup = async () => {
    await AsyncStorage.setItem('skippedDatePopup', 'true');
    setShowDatePopup(false);
  };

  const dailySpecial = homeData.allProducts?.find((p: any) => p.isDailySpecial);

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        
        {/* 1. Hero Section - Now Edge to Edge with Auto Height */}
        {homeData.heroSlides.length > 0 && (
          <View className="bg-gray-50 pb-2">
            <AutoCarousel 
              data={homeData.heroSlides} 
              isAutoPlay={true}
              renderItem={(slide: any) => (
                <Link href={slide.clickUrl || '/menus'} asChild>
                  <TouchableOpacity activeOpacity={0.9} className="w-full">
                    <AutoScaledImage url={optimizeImageUrl(slide.imageUrl)} isFullWidth={true} />
                  </TouchableOpacity>
                </Link>
              )} 
            />
          </View>
        )}

        {/* 2. Categories */}
        <View className="py-6 px-4">
          <Text className="text-xl font-bold text-gray-900 mb-1">What's on your mind? 😋</Text>
          <Text className="text-sm text-gray-500 mb-4">Explore our wide range of categories.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {CATEGORIES.map((cat, idx) => (
              <Link key={idx} href={cat.link} asChild>
                <TouchableOpacity className="items-center mr-5" activeOpacity={0.7}>
                  <View className={`h-16 w-16 rounded-full border-2 ${cat.color} p-0.5 bg-white shadow-sm mb-2 overflow-hidden items-center justify-center`}>
                    <Image source={cat.image} style={{ width: 56, height: 56, borderRadius: 28 }} contentFit="cover" />
                  </View>
                  <Text className="text-xs font-semibold text-gray-700">{cat.name}</Text>
                </TouchableOpacity>
              </Link>
            ))}
          </ScrollView>
        </View>

        {/* 3. Trust Badges */}
        <View className="flex-row justify-between px-4 py-6 bg-gray-50 border-y border-gray-100">
          {FEATURES.map((feat, idx) => (
            <View key={idx} className="flex-1 items-center bg-white p-3 mx-1 rounded-2xl shadow-sm border border-gray-100">
              <View className={`h-10 w-10 rounded-full ${feat.bg} items-center justify-center mb-2`}>
                <feat.icon size={20} color={feat.color} />
              </View>
              <Text className="font-bold text-[11px] text-gray-900 text-center">{feat.title}</Text>
            </View>
          ))}
        </View>

        {/* 4. Middle Slider - Auto Height, slightly padded */}
        {homeData.sliderImages?.length > 0 && (
          <View className="py-6">
            <AutoCarousel 
              data={homeData.sliderImages} 
              isAutoPlay={true}
              renderItem={(slide: any) => (
                <View className="px-4">
                  <Link href={slide.clickUrl || '/menus'} asChild>
                    <TouchableOpacity activeOpacity={0.9} className="rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-100">
                      <AutoScaledImage url={optimizeImageUrl(slide.imageUrl)} isFullWidth={false} />
                    </TouchableOpacity>
                  </Link>
                </View>
              )} 
            />
          </View>
        )}

        {/* 5. Daily Special */}
        {dailySpecial && (
          <View className="py-8 bg-amber-50/50 px-4">
            <Text className="text-2xl font-bold text-gray-900 text-center mb-1">Today's Special 🌟</Text>
            <Text className="text-sm text-gray-500 text-center mb-6">Freshly prepared just for you.</Text>
            <View className="bg-white p-3 rounded-3xl shadow-sm border border-amber-100">
              <View className="aspect-square w-full rounded-2xl overflow-hidden bg-gray-100">
                {dailySpecial.images?.length > 0 ? (
                  <Image source={{ uri: optimizeImageUrl(dailySpecial.images.url) }} className="w-full h-full" contentFit="cover" />
                ) : (
                  <SpecialDishCard name={dailySpecial.name} description={dailySpecial.description} price={dailySpecial.price} />
                )}
              </View>
              <Link href={`/menus/${dailySpecial.slug}`} asChild>
                <TouchableOpacity className="mt-4 bg-primary h-12 rounded-xl items-center justify-center shadow-sm">
                  <Text className="text-white font-bold text-base">Order Now - {formatPrice(dailySpecial.price)}</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        )}

        {/* 6. Bestsellers */}
        <View className="py-8 px-4">
          <Text className="text-2xl font-bold text-gray-900 text-center mb-1">Customer Favorites ❤️</Text>
          <Text className="text-sm text-gray-500 text-center mb-6">The most loved dishes from our kitchen.</Text>
          <FlatList
            data={homeData.bestsellers}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }: any) => (
              <View style={{ width: windowWidth * 0.6 }} className="mr-4">
                <ProductCard product={item} />
              </View>
            )}
            keyExtractor={(item) => item.id}
          />
          <Link href="/menus" asChild>
            <TouchableOpacity className="mt-8 border border-primary/50 rounded-full py-3 mx-8 items-center">
              <Text className="text-primary font-semibold">View Full Menu</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* 7. Testimonials */}
        <View className="py-10 bg-slate-50">
          <Text className="text-2xl font-bold text-gray-900 text-center mb-1">Happy Tummies 😊</Text>
          <Text className="text-sm text-gray-500 text-center mb-6">What our customers say about us.</Text>
          <AutoCarousel
            data={TESTIMONIALS}
            isAutoPlay={true}
            autoPlayDelay={5000}
            renderItem={(item: any, idx: number) => (
              <View className="px-4">
                <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <Text className="text-amber-500 font-bold mb-3">★ {item.rating}</Text>
                  <Text className="text-gray-600 italic mb-4 leading-5">"{item.quote}"</Text>
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 bg-primary/20 rounded-full items-center justify-center">
                      <Text className="font-bold text-primary">{item.name.charAt(0)}</Text>
                    </View>
                    <View className="ml-3">
                      <Text className="font-bold text-sm text-gray-900">{item.name}</Text>
                      <Text className="text-xs text-gray-500">{item.location}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          />
        </View>

      </ScrollView>

      {/* Special Dates Modal */}
      <Modal visible={showDatePopup} transparent animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white w-full rounded-3xl overflow-hidden">
            <View className="bg-orange-50 p-6 items-center">
              <Gift size={40} color="#f97316" />
              <Text className="text-xl font-bold text-orange-600 mt-3">A Special Gift! 🎁</Text>
              <Text className="text-sm text-center text-gray-600 mt-2">
                Add your special dates and get a Flat 5% OFF on your celebration days!
              </Text>
            </View>
            <View className="p-6 space-y-4">
              {!user?.dob && (
                <View>
                  <Text className="text-xs font-bold text-pink-500 mb-1 uppercase">Your Birthday</Text>
                  <View className="flex-row items-center border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50">
                    <Cake size={20} color="#f472b6" />
                    <Text className="ml-3 text-gray-400 font-medium">Use profile section to add Date</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity 
                onPress={handleSaveDates} 
                className="w-full bg-orange-500 h-14 rounded-xl items-center justify-center mt-4 shadow-sm"
              >
                {isSavingDates ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Claim 5% Discount</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSkipPopup} className="items-center py-3">
                <Text className="text-gray-400 font-semibold">Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}