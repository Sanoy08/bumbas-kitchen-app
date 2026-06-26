// src/app/(shop)/index.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import {
  Cake, ChevronDown, ChevronLeft, ChevronRight, Gift, Heart, Leaf, MapPin, Mic,
  Search, ShieldCheck,
  Sparkles,
  Truck, User
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Dimensions, FlatList, InteractionManager, Modal, Platform, ScrollView,
  Text, TouchableOpacity, View
} from 'react-native';
import Animated, {
  Extrapolation, interpolate, useAnimatedScrollHandler,
  useAnimatedStyle, useSharedValue, withTiming, runOnJS // 🟢 runOnJS ইম্পোর্ট করা হলো
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import NotificationPrompt from '@/components/shop/NotificationPrompt';
import { ProductCard } from '@/components/shop/ProductCard';
import { SpecialDishCard } from '@/components/shop/SpecialDishCard';
import { optimizeImageUrl } from '@/lib/imageUtils';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useTabBarStore } from '@/store/tabBarStore'; // 🟢 TabBar Store ইম্পোর্ট করা হলো

const { width: windowWidth } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';

const CATEGORIES = [
  { name: "All", image: require("../../../assets/Categories/9.webp"), link: "/menus", color: "border-slate-500" },
  { name: "Chicken", image: require("../../../assets/Categories/7.webp"), link: "/menus?category=chicken", color: "border-red-500" },
  { name: "Mutton", image: require("../../../assets/Categories/4.webp"), link: "/menus?category=mutton", color: "border-rose-700" },
  { name: "Rice", image: require("../../../assets/Categories/2.webp"), link: "/menus?category=rice", color: "border-orange-400" },
  { name: "Fish", image: require("../../../assets/Categories/3.webp"), link: "/menus?category=fish", color: "border-blue-500" },
  { name: "Paneer", image: require("../../../assets/Categories/8.webp"), link: "/menus?category=paneer", color: "border-indigo-500" },
  { name: "Chapati", image: require("../../../assets/Categories/6.webp"), link: "/menus?category=chapati", color: "border-emerald-500" },
  { name: "Veg", image: require("../../../assets/Categories/1.webp"), link: "/menus?category=veg", color: "border-lime-500" },
];

const FEATURES = [
  { icon: Truck, title: "Safe & Secure", desc: "Get Secured Delivery", color: "#3b82f6", bg: "bg-blue-50" },
  { icon: Leaf, title: "Fresh & Organic", desc: "Farm fresh ingredients", color: "#22c55e", bg: "bg-green-50" },
  { icon: ShieldCheck, title: "Safety First", desc: "100% Hygienic Kitchen", color: "#a855f7", bg: "bg-purple-50" },
];

const HERO_CAROUSEL_HEIGHT = windowWidth + 8;
const PRODUCTS_PER_PAGE = 10;

const CARD_MARGIN = 4;
const CONTAINER_PADDING = 16;
const CARD_WIDTH = (windowWidth - CONTAINER_PADDING * 2 - CARD_MARGIN * 4) / 2;

// --- Helper Components ---
const AutoScaledImage = ({ url, isFullWidth = true }: { url: string, isFullWidth?: boolean }) => {
  return (
    <Image source={{ uri: url }} style={{ width: isFullWidth ? windowWidth : windowWidth - 32, aspectRatio: 1 }} contentFit="cover" />
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
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollViewWidth, setScrollViewWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const itemLayouts = useRef<{ [key: string]: { x: number; width: number } }>({});

  const scrollToCenter = useCallback((category: string) => {
    InteractionManager.runAfterInteractions(() => {
      const layout = itemLayouts.current[category];
      if (!layout || scrollViewWidth === 0) {
        requestAnimationFrame(() => {
          const retryLayout = itemLayouts.current[category];
          if (retryLayout && scrollViewWidth > 0) {
            const offsetX = retryLayout.x + retryLayout.width / 2 - scrollViewWidth / 2;
            const clamped = Math.max(0, Math.min(offsetX, contentWidth - scrollViewWidth));
            scrollViewRef.current?.scrollTo({ x: clamped, animated: true });
          }
        });
        return;
      }
      const offsetX = layout.x + layout.width / 2 - scrollViewWidth / 2;
      const clamped = Math.max(0, Math.min(offsetX, contentWidth - scrollViewWidth));
      scrollViewRef.current?.scrollTo({ x: clamped, animated: true });
    });
  }, [scrollViewWidth, contentWidth]);

  useEffect(() => {
    scrollToCenter(activeCategory);
  }, [activeCategory, scrollToCenter]);

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-2"
      contentContainerStyle={{ paddingRight: 20 }}
      onLayout={(e) => setScrollViewWidth(e.nativeEvent.layout.width)}
      onContentSizeChange={(w) => setContentWidth(w)}
      scrollEventThrottle={16}
    >
      {CATEGORIES.map((cat, idx) => {
        const isActive = activeCategory === cat.name;
        return (
          <TouchableOpacity
            key={idx}
            onLayout={(e) => {
              itemLayouts.current[cat.name] = {
                x: e.nativeEvent.layout.x,
                width: e.nativeEvent.layout.width,
              };
            }}
            onPress={() => setActiveCategory(cat.name)}
            className={`items-center mx-2 pb-0 ${isActive ? 'border-b-[3px] border-primary' : ''}`}
            activeOpacity={0.7}
          >
            <View className={`h-16 w-16 rounded-full mb-1.5 overflow-hidden items-center justify-center border-2 ${isActive ? 'border-primary' : 'border-gray-200 bg-gray-50'}`}>
              <Image source={cat.image} style={{ width: '100%', height: '100%', borderRadius: 32 }} contentFit="cover" />
            </View>
            <Text className={`text-xs ${isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-600'} font-sans`}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const getDisplayAddress = (user: any) => {
  if (!user || !user.savedAddresses || user.savedAddresses.length === 0) {
    return "Select Location";
  }
  const defaultAddr = user.savedAddresses.find((a: any) => a.isDefault) || user.savedAddresses[0];
  const parts = defaultAddr.address.split(',');
  return parts.slice(0, 2).join(',').trim();
};

export default function HomeScreen() {
  const { user, login } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // 🟢 Tab Bar Store
  const setTabBarVisible = useTabBarStore((state) => state.setVisibility);

  const [homeData, setHomeData] = useState({ heroSlides: [], sliderImages: [], offers: [], bestsellers: [], allProducts: [] });
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [dob, setDob] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [isVeg, setIsVeg] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [hasSkippedSession, setHasSkippedSession] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState<'dob' | 'anniversary' | null>(null);
  const [tempDate, setTempDate] = useState(new Date());

  const [productDisplayCount, setProductDisplayCount] = useState(PRODUCTS_PER_PAGE);

  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const categoryContainerRef = useRef<View>(null);
  const scrollY = useSharedValue(0);
  const categoryY = useSharedValue(0);
  const categoryYRef = useRef(0);

  const backButtonWidth = useSharedValue(0);
  const backButtonOpacity = useSharedValue(0);

  // 🟢 স্ক্রোল ডিরেকশন ট্র্যাক করার জন্য Reanimated Shared Values
  const lastScrollY = useSharedValue(0);
  const isTabBarVisibleShared = useSharedValue(true);

  const isLoadingMore = useRef(false);
  const lastLoadTime = useRef(0);

  useEffect(() => {
    if (homeData.heroSlides.length > 0) {
      categoryY.value = HERO_CAROUSEL_HEIGHT;
    } else {
      categoryY.value = 0;
    }
  }, [homeData.heroSlides]);

  useEffect(() => {
    if (activeCategory !== "All") {
      backButtonWidth.value = withTiming(40, { duration: 300 });
      backButtonOpacity.value = withTiming(1, { duration: 300 });
    } else {
      backButtonWidth.value = withTiming(0, { duration: 300 });
      backButtonOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [activeCategory]);

  // =========================================================================
  // 🟢 স্ক্রোল হ্যান্ডলার (Slide Up/Down Logic)
  // =========================================================================
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      
      const currentY = event.contentOffset.y;
      
      // নিচের দিকে স্ক্রোল করলে (Slide Down / Hide)
      if (currentY > lastScrollY.value + 15 && currentY > 50) {
        if (isTabBarVisibleShared.value) {
          isTabBarVisibleShared.value = false;
          runOnJS(setTabBarVisible)(false);
        }
        lastScrollY.value = currentY;
      } 
      // উপরের দিকে স্ক্রোল করলে (Slide Up / Show)
      else if (currentY < lastScrollY.value - 15) {
        if (!isTabBarVisibleShared.value) {
          isTabBarVisibleShared.value = true;
          runOnJS(setTabBarVisible)(true);
        }
        lastScrollY.value = currentY;
      }
    },
  });

  const handleScrollEndDrag = (event: any) => {
    lockCategoryIfNeeded(event.nativeEvent.contentOffset.y);
  };

  const handleMomentumScrollEnd = (event: any) => {
    lockCategoryIfNeeded(event.nativeEvent.contentOffset.y);
    handleLoadMoreIfNeeded(event.nativeEvent);
  };

  const lockCategoryIfNeeded = (currentOffset: number) => {
    if (activeCategory === "All") return;
    const stickyHeaderHeight = insets.top + 60;
    const lockPosition = categoryYRef.current - stickyHeaderHeight + 10;
    if (currentOffset < lockPosition) {
      scrollViewRef.current?.scrollTo({ y: lockPosition, animated: true });
    }
  };

  const handleLoadMoreIfNeeded = (nativeEvent: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 250) {
      const now = Date.now();
      if (!isLoadingMore.current && now - lastLoadTime.current > 300 && hasMore) {
        isLoadingMore.current = true;
        lastLoadTime.current = now;
        loadMoreProducts();
      }
    }
  };

  useEffect(() => {
    isLoadingMore.current = false;
  }, [productDisplayCount]);

  const adjustScrollForCategory = () => {
    if (activeCategory === "All") {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      setTimeout(() => {
        const stickyHeaderHeight = insets.top + 60;
        const lockPosition = categoryYRef.current - stickyHeaderHeight + 10;
        scrollViewRef.current?.scrollTo({ y: Math.max(0, lockPosition), animated: true });
      }, 100);
    }
  };

  useEffect(() => {
    setProductDisplayCount(PRODUCTS_PER_PAGE);
    adjustScrollForCategory();
  }, [activeCategory]);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const bgOpacity = interpolate(scrollY.value, [0, 80], [0, 1], Extrapolation.CLAMP);
    return {
      backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
      borderBottomWidth: 0,
    };
  });

  const locationRowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 80], [1, 0], Extrapolation.CLAMP);
    const height = interpolate(scrollY.value, [0, 80], [48, 0], Extrapolation.CLAMP);
    const marginBottom = interpolate(scrollY.value, [0, 80], [12, 0], Extrapolation.CLAMP);
    return { opacity, height, marginBottom, overflow: 'hidden' };
  });

  const stickyCategoryStyle = useAnimatedStyle(() => {
    const collapsedHeaderHeight = insets.top + 60;
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
      transform: [{ translateY: isSticking ? 0 : -10 }],
    };
  });

  const backButtonStyle = useAnimatedStyle(() => ({
    width: backButtonWidth.value,
    opacity: backButtonOpacity.value,
    overflow: 'hidden',
  }));

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
      if ((missingDob || missingAnniversary) && !hasSkippedSession) {
        const timer = setTimeout(() => setShowDatePopup(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, hasSkippedSession]);

  const handleSaveDates = async () => {
    const isDobMissing = !user?.dob || user?.dob === "";
    if (isDobMissing && !dob) {
      toast.error("Please add your Birthday first.");
      return;
    }
    setIsSavingDates(true);
    try {
      let firstName = "User";
      let lastName = ".";
      if (user?.name && typeof user.name === 'string') {
        const parts = user.name.trim().split(/\s+/);
        firstName = parts[0] || "User";
        lastName = parts.slice(1).join(' ') || ".";
      } else if (user?.firstName && typeof user.firstName === 'string') {
        firstName = user.firstName;
        lastName = user.lastName || ".";
      }
      const response = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          dob: dob || user?.dob,
          anniversary: anniversary || user?.anniversary,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setHasSkippedSession(true);
        setShowDatePopup(false);
        toast.success("Special dates saved successfully! 🎉");
        await login(data.user);
      } else {
        toast.error(data.error || "Failed to save dates");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleSkipPopup = () => {
    setHasSkippedSession(true);
    setShowDatePopup(false);
  };

  const openDatePicker = (type: 'dob' | 'anniversary') => {
    setActiveDatePicker(type);
    if (type === 'dob' && dob) setTempDate(new Date(dob));
    else if (type === 'anniversary' && anniversary) setTempDate(new Date(anniversary));
    else setTempDate(new Date());
  };

  const onDateSelected = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setActiveDatePicker(null);
    if (event.type !== 'dismissed' && selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      if (activeDatePicker === 'dob') setDob(formatted);
      else if (activeDatePicker === 'anniversary') setAnniversary(formatted);
    }
  };

  const isDobMissing = !user?.dob || user?.dob === "";
  const isAnnivMissing = !user?.anniversary || user?.anniversary === "";

  const allProducts = homeData.allProducts || [];

  const categoryFiltered =
    activeCategory !== "All"
      ? allProducts.filter(
          (p: any) => p.category?.name?.toLowerCase() === activeCategory.toLowerCase()
        )
      : allProducts;

  const vegFiltered = isVeg
    ? categoryFiltered.filter((p: any) => p.isVeg === true)
    : categoryFiltered;

  const filteredProducts = vegFiltered;

  const displayedProducts = filteredProducts.slice(0, productDisplayCount);
  const hasMore = productDisplayCount < filteredProducts.length;

  const loadMoreProducts = () => {
    setProductDisplayCount((prev) =>
      Math.min(prev + PRODUCTS_PER_PAGE, filteredProducts.length)
    );
  };

  useEffect(() => {
    setProductDisplayCount(PRODUCTS_PER_PAGE);
  }, [activeCategory, isVeg]);

  const dailySpecial = homeData.allProducts?.find((p: any) => p.isDailySpecial);

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <Animated.View
        style={[
          headerAnimatedStyle,
          {
            paddingTop: insets.top + 10,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
          },
        ]}
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
          <TouchableOpacity
            onPress={() =>
              user ? router.push('/(shop)/account') : router.push('/(auth)/login')
            }
            className="h-10 w-10 bg-white/90 rounded-full items-center justify-center"
          >
            <User size={20} color="#e11d48" />
          </TouchableOpacity>
        </Animated.View>

        <View className="flex-row items-center gap-3">
          <Animated.View style={backButtonStyle}>
            <TouchableOpacity
              onPress={() => setActiveCategory("All")}
              className="h-10 w-10 items-center justify-center"
            >
              <ChevronLeft size={24} color="#e11d48" />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => router.push('/(shop)/search')} 
            className="flex-1 flex-row items-center bg-white border border-gray-200/80 rounded-2xl px-3 py-2.5"
          >
            <Search size={20} color="#e11d48" />
            <Text className="flex-1 ml-2.5 text-gray-500 font-medium font-sans">Search "namkeen"</Text>
            <View className="border-l border-gray-300 pl-3 py-0.5">
              <Mic size={20} color="#e11d48" />
            </View>
          </TouchableOpacity>

          {activeCategory === "All" && (
            <TouchableOpacity
              onPress={() => setIsVeg(!isVeg)}
              className={`items-center justify-center px-3 py-1.5 rounded-xl border ${
                isVeg ? 'bg-green-500 border-green-600' : 'bg-white border-gray-300'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`text-xs font-bold font-sans ${isVeg ? 'text-white' : 'text-gray-700'}`}>
                VEG
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Sticky Category */}
      <Animated.View style={stickyCategoryStyle} className="bg-white pt-1 pb-0">
        <CategoryList activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView
        ref={scrollViewRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        className="flex-1"
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* Hero Carousel */}
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

        {/* Category List Container */}
        <View
          ref={categoryContainerRef}
          className="bg-white py-2"
          onLayout={(e) => {
            categoryYRef.current = e.nativeEvent.layout.y;
          }}
        >
          <CategoryList activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
        </View>

        {/* Bestsellers */}
        {activeCategory === "All" && homeData.bestsellers && homeData.bestsellers.length > 0 && (
          <View className="px-4 pt-4 pb-2">
            <Text className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-4 font-sans">
              OUR BESTSELLER
            </Text>
            {(() => {
              const half = Math.ceil(homeData.bestsellers.length / 2);
              const topRow = homeData.bestsellers.slice(0, half);
              const bottomRow = homeData.bestsellers.slice(half);
              return (
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
              );
            })()}
          </View>
        )}

        {/* Features */}
        {activeCategory === "All" && (
          <View className="flex-row justify-between px-4 py-6 bg-gray-50 border-y border-gray-100 mb-6">
            {FEATURES.map((feat, idx) => (
              <View key={idx} className="flex-1 items-center px-1">
                <View className={`h-12 w-12 rounded-full ${feat.bg} items-center justify-center mb-2`}>
                  <feat.icon size={22} color={feat.color} />
                </View>
                <Text className="font-bold text-[11px] text-gray-900 text-center font-sans">
                  {feat.title}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Today's Special */}
        {activeCategory === "All" && dailySpecial && (
          <View className="py-8 bg-amber-50/60 px-4 mb-6">
            <Text className="text-2xl font-bold text-gray-900 text-center mb-1 font-sans">
              Today's Special 🌟
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-6 font-sans">
              Freshly prepared just for you.
            </Text>
            <View className="bg-white p-3 rounded-3xl shadow-sm border border-amber-100">
              <View className="aspect-square w-full rounded-2xl overflow-hidden bg-gray-100">
                {dailySpecial.images?.length > 0 ? (
                  <Image
                    source={{ uri: optimizeImageUrl(dailySpecial.images[0].url) }}
                    className="w-full h-full"
                    contentFit="cover"
                  />
                ) : (
                  <SpecialDishCard
                    name={dailySpecial.name}
                    description={dailySpecial.description}
                    price={dailySpecial.price}
                  />
                )}
              </View>
              <Link href={`/menus/${dailySpecial.slug}`} asChild>
                <TouchableOpacity className="mt-4 bg-primary h-12 rounded-xl items-center justify-center shadow-sm">
                  <Text className="text-white font-bold text-base font-sans">
                    Order Now - {formatPrice(dailySpecial.price)}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        )}

        {/* ─── Products Grid ─── */}
        <View className="bg-white px-4 pt-2 pb-4">
          <Text className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-4 font-sans">
            {activeCategory === "All" ? "EXPLORE MORE" : `Fresh from ${activeCategory}`}
          </Text>

          {filteredProducts.length === 0 ? (
            <View className="py-12 items-center">
              <Text className="text-gray-500 font-sans">No items available</Text>
            </View>
          ) : (
            <FlatList
              data={displayedProducts}
              renderItem={({ item }) => (
                <View style={{ width: CARD_WIDTH, height: 250, margin: CARD_MARGIN }}>
                  <ProductCard product={item} />
                </View>
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              nestedScrollEnabled={true}
              scrollEnabled={false}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              ListFooterComponent={
                hasMore ? (
                  <View className="py-6 items-center justify-center mt-2">
                    <ActivityIndicator size="small" color="#e11d48" />
                    <Text className="text-xs text-gray-400 mt-1 font-sans">
                      Loading more items...
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </Animated.ScrollView>

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
                Add your special dates and get a{' '}
                <Text className="font-bold text-rose-600 bg-white px-2 py-0.5 rounded shadow-sm">
                  Flat 5% OFF
                </Text>{' '}
                on your celebration days!
              </Text>
            </View>

            <View className="bg-white rounded-t-[2rem] -mt-6 p-6 pt-8">
              {isDobMissing && (
                <TouchableOpacity onPress={() => openDatePicker('dob')} className="relative mb-4">
                  <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <Cake size={20} color="#f472b6" />
                  </View>
                  <View className="w-full pl-12 pr-4 h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl flex-row justify-between items-center">
                    <Text className={`text-sm font-bold font-sans ${dob ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                      {dob ? format(new Date(dob), 'MMMM do, yyyy') : 'Select Birthday'}
                    </Text>
                    <ChevronRight size={16} color="#9ca3af" />
                  </View>
                  <View className="absolute -top-2.5 left-4 bg-white px-2 rounded-full border border-pink-100">
                    <Text className="text-[10px] font-bold uppercase text-pink-500 font-sans">Your Birthday</Text>
                  </View>
                </TouchableOpacity>
              )}

              {isAnnivMissing && (
                <TouchableOpacity onPress={() => openDatePicker('anniversary')} className="relative mb-2">
                  <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <Heart size={20} color="#f43f5e" />
                  </View>
                  <View className="w-full pl-12 pr-4 h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl flex-row justify-between items-center">
                    <Text className={`text-sm font-bold font-sans ${anniversary ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                      {anniversary ? format(new Date(anniversary), 'MMMM do, yyyy') : 'Select Anniversary'}
                    </Text>
                    <ChevronRight size={16} color="#9ca3af" />
                  </View>
                  <View className="absolute -top-2.5 left-4 bg-white px-2 rounded-full border border-red-100">
                    <Text className="text-[10px] font-bold uppercase text-red-500 font-sans">Anniversary</Text>
                  </View>
                </TouchableOpacity>
              )}

              <View className="mt-6">
                <TouchableOpacity
                  onPress={handleSaveDates}
                  disabled={isSavingDates || (!dob && !anniversary)}
                  className={`w-full h-14 rounded-2xl items-center justify-center shadow-sm ${
                    isSavingDates || (!dob && !anniversary) ? 'bg-gray-300' : 'bg-orange-500'
                  }`}
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

      {activeDatePicker &&
        (Platform.OS === 'ios' ? (
          <Modal transparent={true} animationType="slide">
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: insets.bottom + 16 }}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={onDateSelected}
                  maximumDate={new Date()}
                />
                <TouchableOpacity
                  onPress={() => setActiveDatePicker(null)}
                  style={{ marginTop: 16, alignItems: 'center', padding: 14, backgroundColor: '#f97316', borderRadius: 12 }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="calendar"
            onChange={onDateSelected}
            maximumDate={new Date()}
          />
        ))}

      <NotificationPrompt />
    </View>
  );
}