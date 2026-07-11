// src/features/home/screens/HomeScreen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, Text, View, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import NotificationPrompt from '@/shared/components/shop/NotificationPrompt';
import { ProductCard } from '@/shared/components/shop/ProductCard';
import { useAuthStore } from '@/shared/store/authStore';
import { useCartStore } from '@/shared/store/cartStore';
import { useTabBarStore } from '@/shared/store/tabBarStore';

import {
  BestsellerSection,
  CategoryList,
  DailySpecialSection,
  DatePopupModal,
  FeaturesSection,
  HeroCarousel,
  HomeHeader,
  MiddleSlider,
} from '../components';

const { width: windowWidth } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';
const PRODUCTS_PER_PAGE = 10;
const CARD_MARGIN = 4;
const CONTAINER_PADDING = 16;
const CARD_WIDTH = (windowWidth - CONTAINER_PADDING * 2 - CARD_MARGIN * 4) / 2;
const HERO_CAROUSEL_HEIGHT = windowWidth + 8;

export function HomeScreen() {
  const { user, login } = useAuthStore();
  const insets = useSafeAreaInsets();
  const isTabBarVisibleStore = useTabBarStore((state) => state.isVisible);
  const setTabBarVisible = useTabBarStore((state) => state.setVisibility);

  // --- Data State ---
  const [homeData, setHomeData] = useState({
    heroSlides: [],
    sliderImages: [],
    offers: [],
    bestsellers: [],
    allProducts: [],
  });

  // --- UI State ---
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [dob, setDob] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [isVeg, setIsVeg] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [hasSkippedSession, setHasSkippedSession] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState<'dob' | 'anniversary' | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  const [productDisplayCount, setProductDisplayCount] = useState(PRODUCTS_PER_PAGE);
  const [refreshing, setRefreshing] = useState(false);

  // --- Scroll/Animation Refs & Values ---
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const categoryYRef = useRef(0);
  const isLoadingMore = useRef(false);
  const lastLoadTime = useRef(0);

  // Header collapse threshold (scrollY must reach this for header to be fully solid)
  const CATEGORY_LOCK_Y = Math.max(insets.top + 60, 90);
  // Height of the floating overlay: collapsed header + sticky category bar
  // Products must start this far down in the viewport so they're not hidden
  const OVERLAY_HEIGHT = insets.top + 60 + 90;
  // Total spacer height: LOCK_Y (for scroll animation) + OVERLAY_HEIGHT (so first product
  // lands exactly below the overlay after scrolling to LOCK_Y)
  const SPACER_HEIGHT = CATEGORY_LOCK_Y + OVERLAY_HEIGHT;

  const scrollY = useSharedValue(0);
  const categoryY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const isTabBarVisibleShared = useSharedValue(true);
  const backButtonWidth = useSharedValue(0);
  const backButtonOpacity = useSharedValue(0);
  // Mirrors activeCategory !== 'All' on the UI thread
  // Used inside useAnimatedStyle to switch between hero-mode and compact-mode
  const isCategoryActive = useSharedValue(false);

  // =========================================================================
  // Effects
  // =========================================================================

  useEffect(() => {
    categoryY.value = homeData.heroSlides.length > 0 ? HERO_CAROUSEL_HEIGHT : 0;
  }, [homeData.heroSlides]);

  useEffect(() => {
    isTabBarVisibleShared.value = isTabBarVisibleStore;
  }, [isTabBarVisibleStore]);

  // Sync activeCategory to shared value so animated styles can react on UI thread
  useEffect(() => {
    isCategoryActive.value = activeCategory !== 'All';
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory !== 'All') {
      backButtonWidth.value = withTiming(40, { duration: 300 });
      backButtonOpacity.value = withTiming(1, { duration: 300 });
    } else {
      backButtonWidth.value = withTiming(0, { duration: 300 });
      backButtonOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [activeCategory]);

  const fetchHomeData = useCallback(async (isRefresh = false) => {
    if (isRefresh) console.log('🔄 [Refresh] Fetching Home Data from:', `${API_URL}/home-data`);
    try {
      const cachedData = await AsyncStorage.getItem('bumbas_home_data');
      if (cachedData && !isRefresh) setHomeData(JSON.parse(cachedData));
      
      const res = await fetch(`${API_URL}/home-data`);
      const data = await res.json();
      if (data?.data) {
        if (isRefresh) {
          console.log('✅ [Refresh] Home Data fetched successfully!');
          console.log(`   - Hero Slides: ${data.data.heroSlides?.length || 0}`);
          console.log(`   - Bestsellers: ${data.data.bestsellers?.length || 0}`);
          console.log(`   - All Products: ${data.data.allProducts?.length || 0}`);
        }
        setHomeData(data.data);
        await AsyncStorage.setItem('bumbas_home_data', JSON.stringify(data.data));
      }
    } catch (e) {
      console.log('❌ [Refresh] Home sync failed:', e);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const onRefresh = useCallback(async () => {
    console.log('\n=============================================');
    console.log('🔽 PULL TO REFRESH TRIGGERED');
    console.log('=============================================');
    setRefreshing(true);
    
    const promises: Promise<any>[] = [fetchHomeData(true)];

    if (user) {
      console.log(`👤 User Logged In: ${user.name || user.phone}`);
      
      // 1. Sync Cart
      console.log('🔄 [Refresh] Fetching Cart Data...');
      promises.push(
        useCartStore.getState().fetchCartFromDB()
          .then(() => {
            const cartItems = useCartStore.getState().items;
            console.log(`✅ [Refresh] Cart Data fetched! Total Items: ${cartItems.length}`);
          })
          .catch(e => console.log('❌ [Refresh] Cart sync failed:', e))
      );
      
      // 2. Sync Wallet & update User context
      console.log('🔄 [Refresh] Fetching Wallet Data from:', `${API_URL}/wallet`);
      promises.push(
        fetch(`${API_URL}/wallet`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.wallet) {
              console.log('✅ [Refresh] Wallet Data fetched successfully!');
              console.log(`   - Balance: ₹${data.wallet.balance || 0}`);
              console.log(`   - Tier: ${data.wallet.tier || 'N/A'}`);
              console.log(`   - Total Spent: ₹${data.wallet.totalSpent || 0}`);
              
              useAuthStore.setState((state) => ({
                user: state.user ? {
                  ...state.user,
                  wallet: {
                    ...state.user.wallet,
                    currentBalance: data.wallet.balance || 0,
                  }
                } : null
              }));
            }
          })
          .catch((e) => console.log('❌ [Refresh] Wallet sync failed:', e))
      );
    } else {
      console.log('👤 No User Logged In. Skipping user-specific APIs (Cart, Wallet).');
    }

    await Promise.allSettled(promises);
    console.log('=============================================');
    console.log('✅ ALL PULL TO REFRESH APIs COMPLETED');
    console.log('=============================================\n');
    setRefreshing(false);
  }, [fetchHomeData, user]);

  useEffect(() => {
    if (user) {
      const missingDob = !user.dob || user.dob === '';
      const missingAnniversary = !user.anniversary || user.anniversary === '';
      if ((missingDob || missingAnniversary) && !hasSkippedSession) {
        const timer = setTimeout(() => setShowDatePopup(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, hasSkippedSession]);

  useEffect(() => {
    isLoadingMore.current = false;
  }, [productDisplayCount]);

  // =========================================================================
  // Category Change → Reset & Scroll
  // When non-All: header is already solid, sticky category already visible.
  // Just reset products and snap scroll to top instantly.
  // =========================================================================
  // =========================================================================
  // Category Change → Reset & Scroll
  // =========================================================================
  useEffect(() => {
    setProductDisplayCount(PRODUCTS_PER_PAGE);
    // Instant snap to top — NO animation, NO spacer.
    // This entirely prevents the ability to scroll up into blank space.
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeCategory]);

  // =========================================================================
  // Scroll Handlers
  // =========================================================================
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      const currentY = event.contentOffset.y;
      if (currentY > lastScrollY.value + 15 && currentY > 50) {
        if (isTabBarVisibleShared.value) {
          isTabBarVisibleShared.value = false;
          runOnJS(setTabBarVisible)(false);
        }
        lastScrollY.value = currentY;
      } else if (currentY < lastScrollY.value - 15) {
        if (!isTabBarVisibleShared.value) {
          isTabBarVisibleShared.value = true;
          runOnJS(setTabBarVisible)(true);
        }
        lastScrollY.value = currentY;
      }
    },
  });

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

  const handleScrollEndDrag = (event: any) => {
    // No-op
  };

  const handleMomentumScrollEnd = (event: any) => {
    handleLoadMoreIfNeeded(event.nativeEvent);
  };

  // =========================================================================
  // Animated Styles
  // Two modes:
  //   isCategoryActive=false (All) → hero mode: header fades in, location row visible
  //   isCategoryActive=true  (any) → compact mode: header always solid, location hidden,
  //                                   sticky category always pinned under header
  // =========================================================================
  const headerAnimatedStyle = useAnimatedStyle(() => {
    if (isCategoryActive.value) {
      // Always fully solid — no transparency
      return { backgroundColor: 'rgba(255, 255, 255, 1)', borderBottomWidth: 0 };
    }
    const bgOpacity = interpolate(scrollY.value, [0, 80], [0, 1], Extrapolation.CLAMP);
    return { backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`, borderBottomWidth: 0 };
  });

  const locationRowStyle = useAnimatedStyle(() => {
    if (isCategoryActive.value) {
      // Always collapsed — no location row in compact mode
      return { opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' };
    }
    const opacity = interpolate(scrollY.value, [0, 80], [1, 0], Extrapolation.CLAMP);
    const height = interpolate(scrollY.value, [0, 80], [48, 0], Extrapolation.CLAMP);
    const marginBottom = interpolate(scrollY.value, [0, 80], [12, 0], Extrapolation.CLAMP);
    return { opacity, height, marginBottom, overflow: 'hidden' };
  });

  const stickyCategoryStyle = useAnimatedStyle(() => {
    const collapsedHeaderHeight = insets.top + 60;
    if (isCategoryActive.value) {
      // Always pinned — visible from the very first render in compact mode
      return {
        opacity: 1,
        position: 'absolute',
        top: collapsedHeaderHeight,
        left: 0,
        right: 0,
        zIndex: 45,
        pointerEvents: 'auto',
        transform: [{ translateY: 0 }],
      };
    }
    // Hero mode: appears when scrolled past category position
    // Added a small -5px buffer to prevent flickering due to minor layout shifts
    const triggerY = categoryY.value - collapsedHeaderHeight - 5;
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

  // =========================================================================
  // Data Derivations
  // =========================================================================
  const allProducts: any[] = homeData.allProducts || [];
  const categoryFiltered =
    activeCategory !== 'All'
      ? allProducts.filter((p: any) => p.category?.name?.toLowerCase() === activeCategory.toLowerCase())
      : allProducts;
  const vegFiltered = isVeg ? categoryFiltered.filter((p: any) => p.isVeg === true) : categoryFiltered;
  const filteredProducts = vegFiltered;
  const displayedProducts = filteredProducts.slice(0, productDisplayCount);
  const hasMore = productDisplayCount < filteredProducts.length;
  const dailySpecial = homeData.allProducts?.find((p: any) => p.isDailySpecial);

  const loadMoreProducts = useCallback(() => {
    setProductDisplayCount((prev) => Math.min(prev + PRODUCTS_PER_PAGE, filteredProducts.length));
  }, [filteredProducts.length]);

  // =========================================================================
  // Date Popup Handlers
  // =========================================================================
  const handleSaveDates = async () => {
    const isDobMissing = !user?.dob || user?.dob === '';
    if (isDobMissing && !dob) {
      toast.error('Please add your Birthday first.');
      return;
    }
    setIsSavingDates(true);
    try {
      let firstName = 'User';
      let lastName = '.';
      if (user?.name && typeof user.name === 'string') {
        const parts = user.name.trim().split(/\s+/);
        firstName = parts[0] || 'User';
        lastName = parts.slice(1).join(' ') || '.';
      } else if ((user as any)?.firstName) {
        firstName = (user as any).firstName;
        lastName = (user as any).lastName || '.';
      }
      const response = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, dob: dob || user?.dob, anniversary: anniversary || user?.anniversary }),
      });
      const data = await response.json();
      if (response.ok) {
        setHasSkippedSession(true);
        setShowDatePopup(false);
        toast.success('Special dates saved successfully! 🎉');
        await login(data.user);
      } else {
        toast.error(data.error || 'Failed to save dates');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSavingDates(false);
    }
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

  const isDobMissing = !user?.dob || user?.dob === '';
  const isAnnivMissing = !user?.anniversary || user?.anniversary === '';

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <View className="flex-1 bg-white">

      {/* ── Floating Header ── */}
      <HomeHeader
        headerAnimatedStyle={headerAnimatedStyle}
        locationRowStyle={locationRowStyle}
        backButtonStyle={backButtonStyle}
        activeCategory={activeCategory}
        isVeg={isVeg}
        onSetVeg={setIsVeg}
        onClearCategory={() => setActiveCategory('All')}
        paddingTop={insets.top + 10}
      />

      {/* ── Sticky Category Bar (appears on scroll) ── */}
      <Animated.View style={stickyCategoryStyle} className="bg-white pt-1 pb-0">
        <CategoryList activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
      </Animated.View>

      {/* ── Main Scrollable Content ── */}
      <Animated.ScrollView
        ref={scrollViewRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e11d48"
            colors={['#e11d48', '#f59e0b', '#10b981']}
            progressBackgroundColor="#ffffff"
            progressViewOffset={10}
          />
        }
        className="flex-1"
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        // In compact mode: push products below the fixed header + sticky category overlay.
        // collapsedHeader = insets.top+60, categoryBar ≈ 100px -> total 160px
        contentContainerStyle={{
          paddingBottom: 56,
          paddingTop: activeCategory !== 'All' ? insets.top + 160 : 0,
        }}
        bounces={activeCategory === 'All'}
        overScrollMode={activeCategory === 'All' ? 'auto' : 'never'}
      >
        {/* All mode: Hero carousel. Non-All: absolutely nothing. 
            No spacer means y=0 is the absolute top, user CANNOT scroll up. */}
        {activeCategory === 'All' && <HeroCarousel slides={homeData.heroSlides} />}

        {activeCategory === 'All' && (
          <View
            className="bg-white py-2"
            onLayout={(e) => { 
              const y = e.nativeEvent.layout.y;
              categoryYRef.current = y; 
              if (y > 0) categoryY.value = y;
            }}
          >
            <CategoryList activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
          </View>
        )}

        {/* All-only sections */}
        {activeCategory === 'All' && (
          <>
            <BestsellerSection bestsellers={homeData.bestsellers} />
            <MiddleSlider slides={homeData.sliderImages} />
            <FeaturesSection />
            <DailySpecialSection product={dailySpecial} />
          </>
        )}

        {/* Products Grid */}
        <View className="bg-white px-4 pt-2 pb-4">
          <Text className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-4 font-sans">
            {activeCategory === 'All' ? 'EXPLORE MORE' : `Fresh from ${activeCategory}`}
          </Text>

          {filteredProducts.length === 0 ? (
            <View className="py-12 items-center">
              <Text className="text-gray-500 font-sans">No items available</Text>
            </View>
          ) : (
            <FlashList
              data={displayedProducts}
              renderItem={({ item }) => (
                <View style={{ width: CARD_WIDTH, height: 250, margin: CARD_MARGIN }}>
                  <ProductCard product={item} />
                </View>
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              estimatedItemSize={258}
              scrollEnabled={false}
              ListFooterComponent={
                hasMore ? (
                  <View className="py-6 items-center justify-center mt-2">
                    <ActivityIndicator size="small" color="#e11d48" />
                    <Text className="text-xs text-gray-400 mt-1 font-sans">Loading more items...</Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </Animated.ScrollView>

      {/* ── Date Popup Modal ── */}
      <DatePopupModal
        visible={showDatePopup}
        isDobMissing={isDobMissing}
        isAnnivMissing={isAnnivMissing}
        dob={dob}
        anniversary={anniversary}
        isSavingDates={isSavingDates}
        activeDatePicker={activeDatePicker}
        tempDate={tempDate}
        onSave={handleSaveDates}
        onSkip={() => { setHasSkippedSession(true); setShowDatePopup(false); }}
        onOpenDatePicker={openDatePicker}
        onCloseDatePicker={() => setActiveDatePicker(null)}
        onDateSelected={onDateSelected}
      />

      <NotificationPrompt />
    </View>
  );
}