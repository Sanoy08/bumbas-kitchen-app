import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { ShimmerSkeleton } from '@/shared/components/ui/ShimmerSkeleton';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ActivityIndicator, BackHandler, DeviceEventEmitter, Dimensions, LayoutAnimation, Platform, RefreshControl, ScrollView, Text, UIManager, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useAnimatedRef,
  useAnimatedReaction,
  scrollTo,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import NotificationPrompt from '@/shared/components/shop/NotificationPrompt';
import { ProductCard } from '@/shared/components/shop/ProductCard';
import { useAlert, OrderCancelledModal } from '@/shared/components/ui';
import { useAuthStore } from '@/shared/store/authStore';
import { useCartStore } from '@/shared/store/cartStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useTabBarStore } from '@/shared/store/tabBarStore';
import { useNotificationStore } from '@/shared/store/notificationStore';

import {
  BestsellerSection,
  CategoryList,
  DailySpecialSection,
  DatePopupModal,
  FeaturesSection,
  FilterModal,
  FilterOption,
  HeroCarousel,
  HomeHeader,
  MiddleSlider,
  OffersSection,
  SectionHeading
} from '../components';
import { VoiceSearchModal } from '@/shared/components/search/VoiceSearchModal';

const { width: windowWidth } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';
const PRODUCTS_PER_PAGE = 10;
const CARD_MARGIN = 6; // 6px margin on each side = 12px gap between items
const CARD_WIDTH = (windowWidth / 2) - (CARD_MARGIN * 2);
const GRID_WIDTH = windowWidth; // Total width of 2 columns
const HERO_CAROUSEL_HEIGHT = windowWidth + 8;

export function HomeScreen() {
  const router = useRouter();
  const { user, login } = useAuthStore();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useAnimatedRef<FlashList<any>>();
  const isTabBarVisibleStore = useTabBarStore((state) => state.isVisible);
  const setTabBarVisible = useTabBarStore((state) => state.setVisibility);
  const { showAlert } = useAlert();
  const hasOrderedThisSession = useSessionStore((state) => state.hasOrderedThisSession);

  // Exit confirmation — only active when HomeScreen tab is focused
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (hasOrderedThisSession) {
          showAlert({
            title: 'Thanks for ordering!',
            message: 'Your food is being prepared with love. See you next time!',
            confirmText: 'Exit App',
            cancelText: 'Stay',
            lottieSource: require('@/../assets/animations/order.json'),
            onConfirm: () => BackHandler.exitApp(),
          });
        } else {
          showAlert({
            title: 'You haven\'t ordered yet!',
            message: 'Bumba\'s Kitchen has some amazing dishes waiting for you. Sure you want to leave?',
            confirmText: 'Leave Anyway',
            cancelText: 'Let me check!',
            lottieSource: require('@/../assets/animations/notorder.json'),
            onConfirm: () => BackHandler.exitApp(),
          });
        }
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [hasOrderedThisSession, showAlert])
  );

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
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [visualCategory, setVisualCategory] = useState<string>('All');
  const [visualFilter, setVisualFilter] = useState<FilterOption>('all');
  const [isSwitchingCategory, setIsSwitchingCategory] = useState(false);
  const [hideMiddleSections, setHideMiddleSections] = useState(false);
  const [hasSkippedSession, setHasSkippedSession] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState<'dob' | 'anniversary' | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [cancelledNotification, setCancelledNotification] = useState<any>(null);

  // --- Scroll/Animation Refs & Values ---
  const categoryYRef = useRef(0);
  const exploreGridYRef = useRef(0);

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
  const filterButtonWidth = useSharedValue(42);
  const filterButtonOpacity = useSharedValue(1);
  const filterButtonMargin = useSharedValue(12);
  
  // Used to lock header and hide tab bar in Grid Mode
  const isCategoryActive = useSharedValue(false);
  
  const isAtTopShared = useSharedValue(true);
  const programmaticScrollY = useSharedValue(-1);

  useAnimatedReaction(
    () => programmaticScrollY.value,
    (val) => {
      if (val >= 0) {
        scrollTo(scrollViewRef, 0, val, false);
      }
    }
  );

  // =========================================================================
  // Effects
  // =========================================================================

  useEffect(() => {
    categoryY.value = homeData.heroSlides.length > 0 ? HERO_CAROUSEL_HEIGHT : 0;
  }, [homeData.heroSlides]);

  useEffect(() => {
    isTabBarVisibleShared.value = isTabBarVisibleStore;
  }, [isTabBarVisibleStore]);

  const isGridViewMode = activeCategory !== 'All' || activeFilter !== 'all';

  const modeSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const finalizeGridMode = useCallback((newCat: string, newFilt: FilterOption) => {
    isCategoryActive.value = true;
    setActiveCategory(newCat);
    setActiveFilter(newFilt);
    
    // Wait a tiny bit for React to apply Grid Mode padding and remove HeroCarousel
    modeSwitchTimeoutRef.current = setTimeout(() => {
      scrollViewRef.current?.scrollToOffset({ offset: 0, animated: false });
      setIsSwitchingCategory(false); // Reveal real items perfectly
    }, 50);
  }, [isCategoryActive, scrollViewRef]);

  const handleModeSwitch = (newCategory: string, newFilter: FilterOption) => {
    if (modeSwitchTimeoutRef.current) {
      clearTimeout(modeSwitchTimeoutRef.current);
      modeSwitchTimeoutRef.current = null;
    }

    const isNewGridViewMode = newCategory !== 'All' || newFilter !== 'all';
    
    // Instantly set visual states so text titles update before scroll
    setVisualCategory(newCategory);
    setVisualFilter(newFilter);

    if (isNewGridViewMode && !isGridViewMode) {
      // Transitioning from normal mode to grid mode
      setHideMiddleSections(true);
      setIsSwitchingCategory(true);
      
      const targetY = categoryYRef.current - CATEGORY_LOCK_Y;

      // Start search bar animations with a delay so it triggers when Category Bar is 3/4ths to the top
      backButtonWidth.value = withDelay(350, withTiming(40, { duration: 250 }));
      backButtonOpacity.value = withDelay(350, withTiming(1, { duration: 250 }));
      filterButtonWidth.value = withDelay(350, withTiming(0, { duration: 250 }));
      filterButtonOpacity.value = withDelay(350, withTiming(0, { duration: 250 }));
      filterButtonMargin.value = withDelay(350, withTiming(0, { duration: 250 }));
      
      setTimeout(() => {
        setTabBarVisible(false);
        isTabBarVisibleShared.value = false;
      }, 350);

      // Give React enough time to render Skeletons and remove Bestsellers without blocking UI thread
      setTimeout(() => {
        const startY = scrollY.value;
        const targetYPos = Math.max(0, targetY);
        programmaticScrollY.value = startY;

        programmaticScrollY.value = withTiming(
          targetYPos,
          { duration: 500, easing: Easing.out(Easing.cubic) },
          (finished) => {
            // Always run state updates even if animation is interrupted
            programmaticScrollY.value = -1; // reset reaction
            runOnJS(finalizeGridMode)(newCategory, newFilter);
          }
        );
      }, 150);
    } else if (!isNewGridViewMode && isGridViewMode) {
      // Reverting from grid mode back to "All"
      
      // Revert search bar animations instantly
      backButtonWidth.value = withTiming(0, { duration: 300 });
      backButtonOpacity.value = withTiming(0, { duration: 300 });
      filterButtonWidth.value = withTiming(42, { duration: 300 });
      filterButtonOpacity.value = withTiming(1, { duration: 300 });
      filterButtonMargin.value = withTiming(12, { duration: 300 });
      setTabBarVisible(true);
      isTabBarVisibleShared.value = true;
      
      // Swap layout back to Normal Mode (Mounts HeroCarousel and Bestsellers)
      setHideMiddleSections(false);
      setActiveCategory(newCategory);
      setActiveFilter(newFilter);
      setIsSwitchingCategory(true);
      
      const targetY = categoryYRef.current - CATEGORY_LOCK_Y;
      
      // Instantly jump scroll offset so the real category bar is positioned correctly when layout updates.
      // isCategoryActive.value remains TRUE during this time to act as a seamless mask!
      scrollViewRef.current?.scrollToOffset({ offset: Math.max(0, targetY), animated: false });
      
      // Give React ample time (150ms) to paint the expanded layout robustly on Android
      setTimeout(() => {
        // Enforce the offset just in case FlashList auto-adjusted
        scrollViewRef.current?.scrollToOffset({ offset: Math.max(0, targetY), animated: false });
        
        // NOW turn off the sticky mask, revealing the perfectly aligned real Category Bar beneath it!
        isCategoryActive.value = false;
        
        programmaticScrollY.value = Math.max(0, targetY);
        programmaticScrollY.value = withTiming(
          0,
          { duration: 500, easing: Easing.out(Easing.cubic) },
          (finished) => {
            // Always reset even if interrupted
            programmaticScrollY.value = -1;
            runOnJS(setIsSwitchingCategory)(false);
          }
        );
      }, 150);
    } else {
      // Switching categories within Grid mode, OR edge case where both are false
      isCategoryActive.value = isNewGridViewMode;
      setActiveCategory(newCategory);
      setActiveFilter(newFilter);
      scrollViewRef.current?.scrollToOffset({ offset: 0, animated: true });
      setTimeout(() => setIsSwitchingCategory(false), 350);
    }
  };

  const handleCategorySelect = useCallback((category: string) => {
    if (category === visualCategory) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisualCategory(category);
    handleModeSwitch(category, activeFilter);
  }, [activeCategory, activeFilter, visualCategory, isGridViewMode, CATEGORY_LOCK_Y]);

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

        // Validate special offers in the cart against current active offers
        if (data.data.offers) {
          const removedItems = useCartStore.getState().validateSpecialOffers(data.data.offers);
          if (removedItems.length > 0) {
            showAlert({
              title: 'Offer Expired',
              message: `The following special offers are no longer available and were removed from your cart:\n\n${removedItems.map(item => `• ${item}`).join('\n')}`,
              cancelText: '',
            });
          }
        }
      }
    } catch (e) {
      console.log('❌ [Refresh] Home sync failed:', e);
    } finally {
      DeviceEventEmitter.emit('home_data_loaded');
    }
  }, []);

  const fetchUnreadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/notifications/history`);
      const data = await res.json();
      if (data.success && data.notifications) {
        const unreadNotifications = data.notifications.filter((n: any) => !n.isRead);
        useNotificationStore.getState().setHasUnread(unreadNotifications.length > 0);

        // Check for any unread cancelled order notification
        const cancelledNotif = unreadNotifications.find((n: any) => 
          n.type === 'ORDER_CANCELLED' || 
          (n.title && n.title.toLowerCase().includes('cancel')) ||
          (n.message && n.message.toLowerCase().includes('cancel'))
        );

        if (cancelledNotif) {
          // Small delay for smooth entry after home screen renders
          setTimeout(() => {
            setCancelledNotification(cancelledNotif);
          }, 1500);
        }
      }
    } catch (e) {
      // silently fail
    }
  }, [user]);

  // --- Lifecycle ---
  useEffect(() => {
    fetchHomeData();
    fetchUnreadNotifications();

    // Listen for network restoration to fetch data if the user opened the app offline
    const networkSubscription = DeviceEventEmitter.addListener('network_restored', () => {
      console.log('Network restored, refreshing home data...');
      fetchHomeData();
    });

    // Onboarding listener
    const onboardingSub = DeviceEventEmitter.addListener('onboarding_finished', () => {
      fetchHomeData();
    });

    return () => {
      networkSubscription.remove();
      onboardingSub.remove();
    };
  }, []);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('\n=============================================');
    console.log('🔽 PULL TO REFRESH TRIGGERED (FULL RESET)');
    console.log('=============================================');
    setRefreshing(true);
    
    // Trigger the global splash screen
    DeviceEventEmitter.emit('trigger_refresh_splash');
    
    // Reset category to All
    handleModeSwitch('All', 'all');
    
    // Clear home data cache
    AsyncStorage.removeItem('bumbas_home_data').catch(console.error);

    const promises: Promise<any>[] = [fetchHomeData(true), fetchUnreadNotifications()];

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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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


  // =========================================================================
  // Scroll Handlers
  // =========================================================================
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      const currentY = event.contentOffset.y;

      // If we are in a specific category, ALWAYS keep the tab bar hidden
      if (isCategoryActive.value) {
        if (isTabBarVisibleShared.value) {
          isTabBarVisibleShared.value = false;
          runOnJS(setTabBarVisible)(false);
        }
        lastScrollY.value = currentY;
        return;
      }

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

  const handleScrollEndDrag = (event: any) => {
    // No-op
  };

  const handleMomentumScrollEnd = (event: any) => {
    // No-op
  };

  // =========================================================================
  // Animated Styles
  // =========================================================================
  const headerAnimatedStyle = useAnimatedStyle(() => {
    if (isCategoryActive.value) {
      return { backgroundColor: 'rgba(255, 255, 255, 1)', borderBottomWidth: 0 };
    }
    const bgOpacity = interpolate(scrollY.value, [0, 40], [0, 1], Extrapolation.CLAMP);
    return { backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`, borderBottomWidth: 0 };
  });

  const locationRowStyle = useAnimatedStyle(() => {
    if (isCategoryActive.value) {
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
    // Activate sticky behavior when scroll passes the category's original position
    const triggerY = categoryY.value - collapsedHeaderHeight;
    const isSticking = categoryY.value > 0 && scrollY.value >= triggerY;
    return {
      opacity: isSticking ? 1 : 0,
      position: 'absolute',
      top: collapsedHeaderHeight,
      left: 0,
      right: 0,
      zIndex: 45,
      pointerEvents: isSticking ? 'auto' : 'none',
      transform: [{ translateY: 0 }],
    };
  });

  const backButtonStyle = useAnimatedStyle(() => ({
    width: backButtonWidth.value,
    opacity: backButtonOpacity.value,
    overflow: 'hidden',
  }));

  const filterButtonStyle = useAnimatedStyle(() => ({
    width: filterButtonWidth.value,
    opacity: filterButtonOpacity.value,
    marginLeft: filterButtonMargin.value,
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

  const filteredProducts = useMemo(() => {
    let result = [...categoryFiltered];
    switch (activeFilter) {
      case 'veg':
        result = result.filter(p => {
          const cat = p.category?.name?.toLowerCase() || '';
          return cat === 'veg' || cat === 'paneer' || cat === 'chapati';
        });
        break;
      case 'non-veg':
        result = result.filter(p => {
          const cat = p.category?.name?.toLowerCase() || '';
          return cat !== 'veg' && cat !== 'paneer' && cat !== 'chapati';
        });
        break;
      case 'price-low':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'all':
      default:
        break;
    }
    return result;
  }, [categoryFiltered, activeFilter, homeData.bestsellers]);
  
  const dailySpecial = useMemo(() => homeData.allProducts?.find((p: any) => p.isDailySpecial), [homeData.allProducts]);

  // =========================================================================
  // Date Popup Handlers
  // =========================================================================
  const handleSaveDates = async () => {
    const isDobMissing = !user?.dob || user?.dob === '';
    if (isDobMissing && !dob) {
      showAlert({
        title: "Birthday Required",
        message: "We need your birthday to calculate your special rewards. Please add it first!",
        confirmText: "Got it"
      });
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

  // --- Callbacks for FlashList ---
  const renderProductItem = useCallback(({ item }: { item: any }) => {
    if (typeof item === 'number') {
      return (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ width: CARD_WIDTH, margin: CARD_MARGIN }}>
            <View className="flex-1 m-1.5 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex-col">
              <ShimmerSkeleton style={{ aspectRatio: 1, width: '100%', borderRadius: 0 }} />
              <View className="p-2.5 md:p-3 flex-col justify-between" style={{ minHeight: 96 }}>
                <View>
                  <ShimmerSkeleton width="75%" height={16} style={{ marginBottom: 6 }} />
                  <ShimmerSkeleton width="50%" height={16} />
                </View>
                <View className="flex-row items-center justify-between mt-2">
                  <ShimmerSkeleton width="33%" height={20} />
                  <ShimmerSkeleton width={64} height={32} borderRadius={16} />
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ width: CARD_WIDTH, margin: CARD_MARGIN }}>
          <ProductCard product={item} />
        </View>
      </View>
    );
  }, [CARD_WIDTH, CARD_MARGIN]);

  const keyExtractorProduct = useCallback((item: any, index: number) => {
    return typeof item === 'number' ? `skeleton-${item}` : item.id;
  }, []);

  const listHeaderElement = useMemo(() => (
    <View className="bg-white">
      <View style={{ display: isGridViewMode ? 'none' : 'flex' }}>
        <HeroCarousel slides={homeData.heroSlides} />
      </View>
      {!isGridViewMode && (
        <View
          className="pt-2 pb-0"
          onLayout={(e) => {
            const y = e.nativeEvent.layout.y;
            categoryYRef.current = y;
            if (y > 0) categoryY.value = y;
          }}
        >
          <CategoryList activeCategory={visualCategory} setActiveCategory={handleCategorySelect} />
        </View>
      )}
      {!isGridViewMode && !hideMiddleSections && (
        <>
          <BestsellerSection bestsellers={homeData.bestsellers} />
          <OffersSection offers={homeData.offers} />
          <FeaturesSection />
          <MiddleSlider slides={homeData.sliderImages} />
          <DailySpecialSection product={dailySpecial} />
        </>
      )}
      <View
        className="pt-8 pb-4"
        onLayout={(e) => {
          exploreGridYRef.current = e.nativeEvent.layout.y;
        }}
      >
        <View className="px-4">
          <SectionHeading 
            title={
              visualCategory !== 'All' 
                ? `Fresh from ${visualCategory}` 
                : (visualFilter !== 'all' ? 'Filtered Items' : 'Explore More')
            } 
          />
        </View>
      </View>
    </View>
  ), [isGridViewMode, homeData, visualCategory, visualFilter, dailySpecial, handleCategorySelect]);

  const renderListEmpty = useCallback(() => {
    if (isSwitchingCategory) return null;
    return (
      <View className="py-12 items-center w-full bg-white">
        <Text className="text-gray-500 font-sans">No items available</Text>
      </View>
    );
  }, [isSwitchingCategory]);

  const listData = useMemo(() => {
    if (isSwitchingCategory) return [1, 2, 3, 4, 5, 6];
    return filteredProducts;
  }, [isSwitchingCategory, filteredProducts]);

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
        filterButtonStyle={filterButtonStyle}
        activeCategory={activeCategory}
        activeFilter={activeFilter}
        onOpenFilter={() => setIsFilterModalVisible(true)}
        onClearCategory={() => handleModeSwitch('All', 'all')}
        onMicPress={() => setIsVoiceModalVisible(true)}
        paddingTop={insets.top + 10}
      />

      {/* ── Sticky Category Bar (appears on scroll) ── */}
      <Animated.View style={stickyCategoryStyle} className="bg-white pt-2 pb-0">
        <CategoryList activeCategory={visualCategory} setActiveCategory={handleCategorySelect} />
      </Animated.View>

      {/* ── Main Scrollable Content via FlashList ── */}
      <AnimatedFlashList
        ref={scrollViewRef}
        style={{ flex: 1 }}
        data={listData}
        renderItem={renderProductItem}
        keyExtractor={keyExtractorProduct}
        numColumns={2}
        estimatedItemSize={250}
        ListHeaderComponent={listHeaderElement}
        ListEmptyComponent={renderListEmpty}
        onScroll={scrollHandler}
        scrollEventThrottle={1}
        showsVerticalScrollIndicator={false}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{
          paddingBottom: 56,
          paddingTop: isGridViewMode ? insets.top + 150 : 0,
          backgroundColor: '#fff'
        }}
        bounces={true}
        overScrollMode="auto"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            enabled={!isGridViewMode}
            tintColor="#e11d48"
            colors={['#e11d48']}
            progressBackgroundColor="#ffffff"
            progressViewOffset={insets.top + 120}
            style={{ zIndex: 999, elevation: 999 }}
          />
        }
      />

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        activeFilter={activeFilter}
        onApplyFilter={(filter) => {
          if (filter === activeFilter) return;
          handleModeSwitch(activeCategory, filter);
        }}
      />

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

      {/* ★ Voice Recording Modal ★ */}
      <VoiceSearchModal 
        visible={isVoiceModalVisible}
        onClose={() => setIsVoiceModalVisible(false)}
        onResult={(transcript) => {
          setIsVoiceModalVisible(false);
          router.push({ pathname: '/(shop)/search', params: { voiceQuery: transcript } });
        }}
      />

      <OrderCancelledModal
        visible={!!cancelledNotification}
        notification={cancelledNotification}
        onClose={() => {
          fetch(`${API_URL}/notifications/mark-read`, { method: 'PATCH' }).catch(() => {});
          useNotificationStore.getState().setHasUnread(false);
          setCancelledNotification(null);
        }}
      />
    </View>
  );
}