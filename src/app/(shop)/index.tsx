import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import {
  Briefcase, Cake, ChevronDown,
  ChevronRight,
  Gift,
  Heart,
  Leaf, MapPin, Mic,
  PartyPopper, Percent, Search, ShieldCheck, SlidersHorizontal,
  Sparkles,
  TrainFront, Truck, User, ArrowUpDown, X
} from 'lucide-react-native';
import { useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Modal, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

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
  { name: "Mutton", image: require("../../../assets/Categories/4.webp"), link: "/menus?category=mutton", color: "border-rose-700" },
  { name: "Rice", image: require("../../../assets/Categories/2.webp"), link: "/menus?category=rice", color: "border-orange-400" },
  { name: "Fish", image: require("../../../assets/Categories/3.webp"), link: "/menus?category=fish", color: "border-blue-500" },
  { name: "Paneer", image: require("../../../assets/Categories/8.webp"), link: "/menus?category=paneer", color: "border-indigo-500" },
  { name: "Fried", image: require("../../../assets/Categories/5.webp"), link: "/menus?category=fried", color: "border-amber-500" },
  { name: "Chapati", image: require("../../../assets/Categories/6.webp"), link: "/menus?category=chapati", color: "border-emerald-500" },
  { name: "Veg", image: require("../../../assets/Categories/1.webp"), link: "/menus?category=veg", color: "border-lime-500" },
];

const EXPLORE_MORE = [
  { title: "Offers", icon: Percent, color: "#3b82f6", bg: "bg-blue-50" },
  { title: "Food on train", icon: TrainFront, color: "#6366f1", bg: "bg-indigo-50" },
  { title: "Plan a party", icon: PartyPopper, color: "#f43f5e", bg: "bg-rose-50" },
  { title: "Collections", icon: Briefcase, color: "#eab308", bg: "bg-yellow-50" },
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

// --- Helper Components ---
const AutoScaledImage = ({ url, isFullWidth = true }: { url: string, isFullWidth?: boolean }) => {
  const [ratio, setRatio] = useState(2);
  return (
    <Image
      source={{ uri: url }}
      style={{ width: isFullWidth ? windowWidth : windowWidth - 32, aspectRatio: ratio }}
      contentFit="cover"
      onLoad={(e) => {
        if (e.source.width && e.source.height) {
          setRatio(e.source.width / e.source.height);
        }
      }}
    />
  );
};

const AutoCarousel = ({ data, renderItem, autoPlayDelay = 4000, isAutoPlay = false, showDots = true }: any) => {
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
      {showDots && data.length > 1 && (
        <View className="flex-row justify-center mt-3 space-x-1.5 pb-2 absolute bottom-2 w-full z-10">
          {data.map((_: any, idx: number) => (
            <View key={idx} className={`h-1.5 rounded-full ${currentIndex === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
          ))}
        </View>
      )}
    </View>
  );
};

const CategoryList = ({ activeCategory, setActiveCategory }: any) => {
  const scrollRef = useRef<ScrollView>(null);
  const itemsRef = useRef<{ [key: string]: { x: number, width: number } }>({});

  const handleCategoryPress = (name: string) => {
    setActiveCategory(name);
    
    // Smoothly scroll to center the selected category
    const item = itemsRef.current[name];
    if (item && scrollRef.current) {
      const scrollPosition = item.x - (windowWidth / 2) + (item.width / 2);
      scrollRef.current.scrollTo({ x: Math.max(0, scrollPosition), animated: true });
    }
  };

  return (
    <ScrollView 
      ref={scrollRef}
      horizontal 
      showsHorizontalScrollIndicator={false} 
      className="px-2" 
      contentContainerStyle={{ paddingRight: 20 }}
    >
      {CATEGORIES.map((cat, idx) => {
        const isActive = activeCategory === cat.name;
        return (
          <TouchableOpacity 
            key={idx} 
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              itemsRef.current[cat.name] = { x: layout.x, width: layout.width };
            }}
            onPress={() => handleCategoryPress(cat.name)} 
            className={`items-center mx-2 pb-0 ${isActive ? 'border-b-[3px] border-primary' : ''}`}
            activeOpacity={0.7}
          >
            <View className={`h-16 w-16 rounded-full mb-1.5 overflow-hidden items-center justify-center border-2 ${isActive ? 'border-primary shadow-sm' : 'border-gray-200 bg-gray-50'}`}>
              <Image source={cat.image} style={{ width: '100%', height: '100%', borderRadius: 32 }} contentFit="cover" />
            </View>
            <Text className={`text-xs ${isActive ? 'font-bold text-primary' : 'font-medium text-gray-600'} font-sans`}>{cat.name}</Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  );
};

const getDisplayAddress = (user: any) => {
  if (!user || !user.savedAddresses || user.savedAddresses.length === 0) {
    return "Select Location";
  }
  const defaultAddr = user.savedAddresses.find((a: any) => a.isDefault) || user.savedAddresses;
  const parts = defaultAddr.address.split(',');
  return parts.slice(0, 2).join(',').trim();
};

export default function HomeScreen() {
  const { user, login } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [homeData, setHomeData] = useState({
    heroSlides: [], sliderImages: [], offers: [], bestsellers: [], allProducts: []
  });
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [dob, setDob] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [isSavingDates, setIsSavingDates] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState("All");
  
  // ★ Filter & Sort States (Next.js logic)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [isUnder200, setIsUnder200] = useState(false);
  
  const [activeDatePicker, setActiveDatePicker] = useState<'dob' | 'anniversary' | null>(null);
  const [tempDate, setTempDate] = useState(new Date());

  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const categoryContainerRef = useRef<View>(null);
  const categoryY = useSharedValue(0);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleScrollEndDrag = (event: any) => {
    if (activeCategory === "All") return;
    const currentOffset = event.nativeEvent.contentOffset.y;
    categoryContainerRef.current?.measureLayout(
      scrollViewRef.current as any,
      (x, y) => {
        const stickyHeaderHeight = insets.top + 90;
        const lockPosition = y - stickyHeaderHeight + 10;
        if (currentOffset < lockPosition) {
          scrollViewRef.current?.scrollTo({ y: lockPosition, animated: true });
        }
      },
      () => {}
    );
  };

  const handleMomentumScrollEnd = (event: any) => {
    if (activeCategory === "All") return;
    const currentOffset = event.nativeEvent.contentOffset.y;
    categoryContainerRef.current?.measureLayout(
      scrollViewRef.current as any,
      (x, y) => {
        const stickyHeaderHeight = insets.top + 90;
        const lockPosition = y - stickyHeaderHeight + 10;
        if (currentOffset < lockPosition) {
          scrollViewRef.current?.scrollTo({ y: lockPosition, animated: true });
        }
      },
      () => {}
    );
  };

  const adjustScrollForCategory = () => {
    if (activeCategory === "All") {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      setTimeout(() => {
        categoryContainerRef.current?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            const stickyHeaderHeight = insets.top + 90;
            const lockPosition = y - stickyHeaderHeight + 10;
            scrollViewRef.current?.scrollTo({ y: Math.max(0, lockPosition), animated: true });
          },
          () => {}
        );
      }, 100);
    }
  };

  useEffect(() => {
    adjustScrollForCategory();
  }, [activeCategory]);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const bgOpacity = interpolate(scrollY.value,,, Extrapolation.CLAMP);
    return {
      backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
      borderBottomWidth: 0,
    };
  });

  const locationRowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value,,, Extrapolation.CLAMP);
    const height = interpolate(scrollY.value,,, Extrapolation.CLAMP);
    const marginBottom = interpolate(scrollY.value,,, Extrapolation.CLAMP);
    return {
      opacity,
      height,
      marginBottom,
      overflow: 'hidden'
    };
  });

  const stickyCategoryStyle = useAnimatedStyle(() => {
    const collapsedHeaderHeight = insets.top + 90;
    const triggerY = categoryY.value - collapsedHeaderHeight;
    const isSticking = categoryY.value > 0 && scrollY.value > triggerY;
    return {
      opacity: isSticking ? 1 : 0,
      position: 'absolute',
      top: collapsedHeaderHeight,
      left: 0,
      right: 0,
      zIndex: 45,
      pointerEvents: isSticking ? 'auto' : 'none',
      transform: [{ translateY: isSticking ? 0 : -10 }]
    };
  });

  // Fetch data
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

  useEffect(() => {
    if (user) {
      const missingDob = !user.dob || user.dob === "";
      const missingAnniversary = !user.anniversary || user.anniversary === "";
      
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
        toast.success("Special dates saved successfully! 🎉");
        await login(data.user);
        setShowDatePopup(false);
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch (e) {
      toast.error("An error occurred while saving.");
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleSkipPopup = async () => {
    await AsyncStorage.setItem('skippedDatePopup', 'true');
    setShowDatePopup(false);
  };

  const openDatePicker = (type: 'dob' | 'anniversary') => {
    setActiveDatePicker(type);
    if (type === 'dob' && dob) {
      setTempDate(new Date(dob));
    } else if (type === 'anniversary' && anniversary) {
      setTempDate(new Date(anniversary));
    } else {
      setTempDate(new Date());
    }
  };

  const onDateSelected = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setActiveDatePicker(null); 
    }
    if (event.type !== 'dismissed' && selectedDate) {
      const formatted = selectedDate.toISOString().split('T');
      if (activeDatePicker === 'dob') {
        setDob(formatted);
      } else if (activeDatePicker === 'anniversary') {
        setAnniversary(formatted);
      }
    }
  };

  const isDobMissing = !user?.dob || user?.dob === "";
  const isAnnivMissing = !user?.anniversary || user?.anniversary === "";

  const dailySpecial = homeData.allProducts?.find((p: any) => p.isDailySpecial);

  // ★ Filter and Sort Logic (Replicating Next.js behavior)
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...(homeData.allProducts || [])];

    // Filter by Category
    if (activeCategory !== 'All') {
      result = result.filter((p: any) => p.category?.name?.toLowerCase() === activeCategory.toLowerCase());
    }

    // Filter Under ₹200
    if (isUnder200) {
      result = result.filter((p: any) => p.price < 200);
    }

    // Sort Logic
    switch (sortBy) {
      case 'price-low': result.sort((a: any, b: any) => a.price - b.price); break;
      case 'price-high': result.sort((a: any, b: any) => b.price - a.price); break;
      case 'rating': result.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0)); break;
      default: 
        // Recommended logic: Special -> Stock -> Name
        result.sort((a: any, b: any) => {
            if (a.stock !== b.stock) return b.stock - a.stock;
            const aSpecial = a.isDailySpecial ? 1 : 0;
            const bSpecial = b.isDailySpecial ? 1 : 0;
            if (aSpecial !== bSpecial) return bSpecial - aSpecial;
            return a.name.localeCompare(b.name);
        });
        break; 
    }

    return result;
  }, [homeData.allProducts, activeCategory, isUnder200, sortBy]);

  return (
    <View className="flex-1 bg-white">
      {/* Absolute Header */}
      <Animated.View
        style={[headerAnimatedStyle, { paddingTop: insets.top + 10, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }]}
        className="px-4 pb-3"
        pointerEvents="box-none"
      >
        <Animated.View style={locationRowStyle} className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1 pr-4">
            <View className="flex-row items-center bg-white/90 pl-2 pr-3 py-1.5 rounded-full max-w-full">
              <MapPin size={22} color="#e11d48" className="mr-1.5 flex-shrink-0" />
              <Text className="text-lg font-bold text-gray-900 font-sans flex-shrink" numberOfLines={1} ellipsizeMode="tail">
                {getDisplayAddress(user)}
              </Text>
              <ChevronDown size={18} color="#374151" className="ml-1 flex-shrink-0" />
            </View>
          </View>
          <TouchableOpacity onPress={() => user ? router.push('/(shop)/account') : router.push('/(auth)/login')} className="h-10 w-10 bg-white/90 rounded-full items-center justify-center">
            <User size={20} color="#e11d48" />
          </TouchableOpacity>
        </Animated.View>

        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.push('/(shop)/search')} activeOpacity={0.8} className="flex-1 flex-row items-center bg-white border border-gray-200/80 rounded-2xl px-3 py-2.5">
            <Search size={20} color="#e11d48" />
            <Text className="flex-1 ml-2.5 text-gray-500 font-medium font-sans">Search for dishes...</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Sticky Category Floating */}
      <Animated.View style={stickyCategoryStyle} className="bg-white py-2 shadow-sm border-b border-gray-100">
        <CategoryList activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
      </Animated.View>

      {/* Main ScrollView with Lock Logic */}
      <Animated.ScrollView
        ref={scrollViewRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        className="flex-1"
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {/* Hero Section */}
        <View className="bg-white pb-2 relative">
          {homeData.heroSlides.length > 0 && (
            <AutoCarousel
              data={homeData.heroSlides}
              isAutoPlay={true}
              showDots={true}
              renderItem={(slide: any) => (
                <Link href={slide.clickUrl || '/menus'} asChild>
                  <TouchableOpacity activeOpacity={0.9} className="w-full relative">
                    <AutoScaledImage url={optimizeImageUrl(slide.imageUrl)} isFullWidth={true} />
                  </TouchableOpacity>
                </Link>
              )}
            />
          )}
        </View>

        {/* Category bar (reference for locking) */}
        <View
          ref={categoryContainerRef}
          onLayout={(e) => { categoryY.value = e.nativeEvent.layout.y; }}
          className="bg-white py-2"
        >
          <CategoryList activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
        </View>

        {/* Rest of content */}
        <View className="bg-white pb-24">
          
          {/* ★ Updated Filters Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row px-4 py-4" contentContainerStyle={{ paddingRight: 20 }}>
            <TouchableOpacity 
              onPress={() => setIsFilterOpen(true)}
              className="flex-row items-center border border-gray-300 bg-white rounded-xl px-3 py-1.5 mr-3 shadow-sm"
            >
              <SlidersHorizontal size={14} color="#374151" />
              <Text className="ml-1.5 text-xs font-semibold text-gray-700 font-sans">Filters</Text>
              <ChevronDown size={14} color="#374151" className="ml-1" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setIsUnder200(!isUnder200)}
              className={`border rounded-xl px-3 py-1.5 mr-3 shadow-sm ${isUnder200 ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}
            >
              <Text className={`text-xs font-semibold font-sans ${isUnder200 ? 'text-white' : 'text-gray-700'}`}>Under ₹200</Text>
            </TouchableOpacity>
          </ScrollView>

          <View className="px-4 pt-2 pb-4">
            <Text className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-4 font-sans">
              {activeCategory === "All" ? "Recommended For You" : `Fresh from ${activeCategory}`}
            </Text>
            
            {filteredAndSortedProducts.length > 0 ? (
              <View className="flex-row flex-wrap justify-between">
                {filteredAndSortedProducts.map((item: any) => (
                  <View key={item.id} style={{ width: '48%', height: 250, marginBottom: 16 }}>
                    <ProductCard product={item} />
                  </View>
                ))}
              </View>
            ) : (
              <View className="py-12 items-center">
                <Text className="text-gray-500 font-sans">No items available</Text>
                {isUnder200 && (
                  <TouchableOpacity onPress={() => setIsUnder200(false)} className="mt-3">
                    <Text className="text-primary font-bold font-sans">Clear Filter</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View className="px-4 pb-6">
             <Text className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-4 font-sans">Explore More</Text>
             <View className="flex-row justify-between flex-wrap gap-y-3">
               {EXPLORE_MORE.map((item, index) => (
                 <TouchableOpacity key={index} className="w-[48%] bg-white border border-gray-100 rounded-xl p-3 flex-row items-center shadow-sm" activeOpacity={0.8}>
                    <View className={`h-10 w-10 rounded-full ${item.bg} items-center justify-center mr-3`}>
                       <item.icon size={20} color={item.color} />
                    </View>
                    <Text className="text-xs font-bold text-gray-700 font-sans flex-1">{item.title}</Text>
                 </TouchableOpacity>
               ))}
             </View>
          </View>

          <View className="flex-row justify-between px-4 py-6 bg-gray-50 border-y border-gray-100 mb-6">
            {FEATURES.map((feat, idx) => (
              <View key={idx} className="flex-1 items-center px-1">
                <View className={`h-12 w-12 rounded-full ${feat.bg} items-center justify-center mb-2`}>
                  <feat.icon size={22} color={feat.color} />
                </View>
                <Text className="font-bold text-[11px] text-gray-900 text-center font-sans">{feat.title}</Text>
              </View>
            ))}
          </View>

          {dailySpecial && (
            <View className="py-8 bg-amber-50/60 px-4 mb-6">
              <Text className="text-2xl font-bold text-gray-900 text-center mb-1 font-sans">Today's Special 🌟</Text>
              <Text className="text-sm text-gray-500 text-center mb-6 font-sans">Freshly prepared just for you.</Text>
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
                    <Text className="text-white font-bold text-base font-sans">Order Now - {formatPrice(dailySpecial.price)}</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          )}

          <View className="pt-2 bg-white">
            <Text className="text-2xl font-bold text-gray-900 text-center mb-1 font-sans">Happy Tummies 😊</Text>
            <Text className="text-sm text-gray-500 text-center mb-6 font-sans">What our customers say about us.</Text>
            <AutoCarousel
              data={TESTIMONIALS}
              isAutoPlay={true}
              autoPlayDelay={5000}
              showDots={false}
              renderItem={(item: any) => (
                <View className="px-4">
                  <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                    <Text className="text-amber-500 font-bold mb-3 font-sans">★ {item.rating}</Text>
                    <Text className="text-gray-600 italic mb-4 leading-5 font-sans">"{item.quote}"</Text>
                    <View className="flex-row items-center">
                      <View className="h-10 w-10 bg-primary/10 rounded-full items-center justify-center">
                        <Text className="font-bold text-primary text-lg">{item.name.charAt(0)}</Text>
                      </View>
                      <View className="ml-3">
                        <Text className="font-bold text-sm text-gray-900 font-sans">{item.name}</Text>
                        <Text className="text-xs text-gray-500 font-sans">{item.location}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Animated.ScrollView>

      {/* ★ Filters Modal (Replicating Next.js Sheet) */}
      <Modal visible={isFilterOpen} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 pb-8">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xl font-bold text-gray-900 font-sans">Filters & Sort</Text>
                <Text className="text-sm text-gray-500 font-sans">Customize your menu view.</Text>
              </View>
              <TouchableOpacity onPress={() => setIsFilterOpen(false)} className="p-2 bg-gray-100 rounded-full">
                <X size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <View className="space-y-6">
              <View>
                <Text className="text-sm font-bold text-gray-700 mb-3 font-sans">Sort By</Text>
                <View className="flex-row flex-wrap gap-3">
                  {[
                    { id: 'recommended', label: 'Recommended' },
                    { id: 'rating', label: 'Top Rated' },
                    { id: 'price-low', label: 'Price: Low to High' },
                    { id: 'price-high', label: 'Price: High to Low' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setSortBy(option.id)}
                      className={`px-4 py-2.5 rounded-xl border ${sortBy === option.id ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200'}`}
                    >
                      <Text className={`font-semibold font-sans ${sortBy === option.id ? 'text-primary' : 'text-gray-600'}`}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => setIsFilterOpen(false)} 
                className="w-full h-14 bg-primary rounded-xl items-center justify-center mt-4 shadow-sm"
              >
                <Text className="text-white font-bold text-lg font-sans">Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Popup Modal */}
      <Modal visible={showDatePopup} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-4">
          <View className="bg-white w-full rounded-3xl overflow-hidden">
            <View className="relative bg-orange-50 p-8 pb-10 items-center overflow-hidden">
              <View className="absolute -top-6 -left-6 w-24 h-24 bg-pink-200/50 rounded-full" />
              <View className="absolute bottom-0 -right-6 w-32 h-32 bg-amber-200/50 rounded-full" />
              <View className="relative z-10 w-20 h-20 bg-white rounded-full items-center justify-center mb-4 shadow-sm border border-orange-100">
                <Gift size={40} color="#ea580c" />
                <Sparkles size={24} color="#fbbf24" style={{ position: 'absolute', top: -5, right: -5 }} />
              </View>
              <Text className="text-2xl font-black text-center text-orange-600 font-sans mb-1">
                A Special Gift! 🎁
              </Text>
              <Text className="text-sm text-gray-700 font-medium text-center px-2 mt-2 leading-relaxed font-sans">
                Add your dates and get a <Text className="font-bold text-rose-600 bg-white px-2 py-0.5 rounded shadow-sm">Flat 5% OFF</Text> on celebration days!
              </Text>
            </View>

            <View className="bg-white rounded-t-[2rem] -mt-6 p-6 pt-8">
              <View className="flex-row gap-3 mb-6">
                {(!user?.dob || user?.dob === "") && (
                  <TouchableOpacity onPress={() => openDatePicker('dob')} className="relative flex-1">
                    <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                      <Cake size={18} color="#f472b6" />
                    </View>
                    <View className="w-full pl-9 pr-2 h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl flex-row justify-start items-center">
                      <Text numberOfLines={1} adjustsFontSizeToFit className={`text-xs font-bold font-sans ${dob ? 'text-gray-900' : 'text-gray-400'}`}>
                        {dob ? format(new Date(dob), 'dd MMM, yy') : 'Birthday'}
                      </Text>
                    </View>
                    <View className="absolute -top-2 left-3 bg-white px-1.5 rounded-full border border-pink-100">
                      <Text className="text-[9px] font-bold uppercase text-pink-500 font-sans">Birthday</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {(!user?.anniversary || user?.anniversary === "") && (
                  <TouchableOpacity onPress={() => openDatePicker('anniversary')} className="relative flex-1">
                    <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                      <Heart size={18} color="#f43f5e" />
                    </View>
                    <View className="w-full pl-9 pr-2 h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl flex-row justify-start items-center">
                      <Text numberOfLines={1} adjustsFontSizeToFit className={`text-xs font-bold font-sans ${anniversary ? 'text-gray-900' : 'text-gray-400'}`}>
                        {anniversary ? format(new Date(anniversary), 'dd MMM, yy') : 'Anniversary'}
                      </Text>
                    </View>
                    <View className="absolute -top-2 left-3 bg-white px-1.5 rounded-full border border-red-100">
                      <Text className="text-[9px] font-bold uppercase text-red-500 font-sans">Anniv.</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              <View className="mt-2">
                <TouchableOpacity
                  onPress={handleSaveDates}
                  disabled={isSavingDates || (!dob && !anniversary)}
                  className={`w-full h-14 rounded-2xl items-center justify-center shadow-sm ${isSavingDates || (!dob && !anniversary) ? 'bg-gray-300' : 'bg-orange-500'}`}
                >
                  {isSavingDates ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base font-sans tracking-wide">Claim 5% Discount</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSkipPopup} className="py-4 mt-1">
                  <Text className="text-gray-400 font-semibold font-sans text-center">Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      {activeDatePicker && (
        <Modal transparent={true} animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                onChange={onDateSelected}
                maximumDate={new Date()}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={() => setActiveDatePicker(null)}
                  style={{ marginTop: 16, alignItems: 'center', padding: 12, backgroundColor: '#f97316', borderRadius: 12 }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}