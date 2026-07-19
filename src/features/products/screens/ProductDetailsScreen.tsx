// src/app/(shop)/menus/[slug].tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Heart,
  Info,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  ArrowRight
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  findNodeHandle,
  FlatList,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';
import { default as Reanimated, Extrapolation, interpolate, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing as REasing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { ProductCard } from '@/shared/components/shop/ProductCard';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';
import { formatPrice } from '@/shared/utils/utils';
import { useCartStore } from '@/shared/store/cartStore';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const LOCAL_PLACEHOLDER = require('@/assets/images/loading.jpg');
const LOTTIE_PLACEHOLDER = require('@/assets/animations/Image-Loading.json');
const DESC_LIMIT = 350; // ওয়েবের সাথে মেলানো

const ProductSkeleton = () => {
  const opacity = useSharedValue(0.4);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 800, easing: REasing.inOut(REasing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const THUMBNAIL_GAP = 12;
  const THUMBNAIL_WIDTH = (screenWidth - 32 - (THUMBNAIL_GAP * 3)) / 4;

  return (
    <View className="flex-1 bg-white">
      {/* Header Skeleton */}
      <View className="absolute top-0 left-0 right-0 z-50 flex-row justify-between px-4 pt-12 pb-4">
        <View className="w-10 h-10 rounded-full bg-gray-200" />
        <View className="w-10 h-10 rounded-full bg-gray-200" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} scrollEnabled={false}>
        {/* Main Image */}
        <Reanimated.View style={[{ width: screenWidth, height: screenWidth, backgroundColor: '#e5e7eb' }, animatedStyle]} />
        
        {/* Thumbnails */}
        <View className="px-4 mt-4 flex-row gap-3">
          {[1, 2, 3, 4].map(i => (
            <Reanimated.View key={i} style={[{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_WIDTH, backgroundColor: '#e5e7eb', borderRadius: 12 }, animatedStyle]} />
          ))}
        </View>

        {/* Content */}
        <View className="px-4 pt-6">
          {/* Tags */}
          <View className="flex-row items-center justify-between mb-3">
            <Reanimated.View style={[{ width: 80, height: 24, backgroundColor: '#e5e7eb', borderRadius: 4 }, animatedStyle]} />
            <Reanimated.View style={[{ width: 50, height: 24, backgroundColor: '#e5e7eb', borderRadius: 4 }, animatedStyle]} />
          </View>

          {/* Title */}
          <Reanimated.View style={[{ width: '80%', height: 32, backgroundColor: '#e5e7eb', borderRadius: 6, marginBottom: 8 }, animatedStyle]} />
          {/* Category */}
          <Reanimated.View style={[{ width: '40%', height: 16, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 24 }, animatedStyle]} />

          <View className="h-[1px] bg-gray-100 w-full mb-6" />

          {/* Price */}
          <View className="mb-8">
            <Reanimated.View style={[{ width: 120, height: 40, backgroundColor: '#e5e7eb', borderRadius: 6, marginBottom: 8 }, animatedStyle]} />
            <Reanimated.View style={[{ width: 150, height: 14, backgroundColor: '#e5e7eb', borderRadius: 4 }, animatedStyle]} />
          </View>

          {/* Inline Cart buttons skeleton */}
          <View className="flex-row w-full gap-3 mb-8">
            <Reanimated.View style={[{ flex: 1, height: 56, backgroundColor: '#e5e7eb', borderRadius: 12 }, animatedStyle]} />
            <Reanimated.View style={[{ flex: 2, height: 56, backgroundColor: '#e5e7eb', borderRadius: 12 }, animatedStyle]} />
          </View>

          {/* Description Lines */}
          <Reanimated.View style={[{ width: '100%', height: 16, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12 }, animatedStyle]} />
          <Reanimated.View style={[{ width: '90%', height: 16, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12 }, animatedStyle]} />
          <Reanimated.View style={[{ width: '95%', height: 16, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12 }, animatedStyle]} />
          <Reanimated.View style={[{ width: '70%', height: 16, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12 }, animatedStyle]} />
        </View>
      </ScrollView>
    </View>
  );
};

export function ProductDetailsScreen() {
  const searchParams = useLocalSearchParams();
  const slug = searchParams.slug;

  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  // State
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [randomItems, setRandomItems] = useState<any[]>([]);
  const [moreItems, setMoreItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [quantity, setQuantity] = useState(1);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const cartItem = product ? items.find((item: any) => item.id === product.id) : null;
  const inCart = !!cartItem;

  // Sticky bottom bar
  const [showBottomBar, setShowBottomBar] = useState(false);
  const inlineCartRef = useRef<View>(null);
  const cartIconRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const flatListRef = useRef<FlatList>(null);

  // Header fade animation
  const headerOpacity = useRef(new Animated.Value(0)).current;

  // Bottom bar slide animation
  const bottomBarTranslateY = useRef(new Animated.Value(200)).current;
  const bottomBarOpacity = useRef(new Animated.Value(0)).current;

  // Header visibility tracker
  const isHeaderVisible = useRef(false);

  // --- Fetch Product (ONLY FROM CACHE) ---
  useEffect(() => {
    const fetchProductFromCache = async () => {
      if (!slug) return;

      // Immediately clear previous product so old UI never flashes
      setProduct(null);
      setRelatedProducts([]);
      setRandomItems([]);
      setMoreItems([]);
      setActiveSlide(0);
      setShowFullDesc(false);
      setIsLoading(true);

      // Reset scroll position and animated values for new screen load
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      headerOpacity.setValue(0);
      bottomBarTranslateY.setValue(200);
      bottomBarOpacity.setValue(0);
      setShowBottomBar(false);

      try {
        const cachedData = await AsyncStorage.getItem('bumbas_home_data');
        if (!cachedData) {
          toast.error('No cached data. Please sync the app.');
          setIsLoading(false);
          return;
        }

        const homeData = JSON.parse(cachedData);
        const allProducts = homeData.allProducts || [];

        const foundProduct = allProducts.find((p: any) => p.slug === slug);
        if (!foundProduct) {
          toast.error('Dish not found.');
          setIsLoading(false);
          return;
        }

        const related = allProducts
          .filter(
            (p: any) =>
              p.category?.name === foundProduct.category?.name &&
              p.id !== foundProduct.id
          )
          .slice(0, 4);

        setProduct(foundProduct);
        setRelatedProducts(related);

        const otherProducts = allProducts.filter(
          (p: any) => p.id !== foundProduct.id
        );
        const shuffled = [...otherProducts].sort(() => 0.5 - Math.random());
        setRandomItems(shuffled.slice(0, 8));
        
        // Take next 12 items for the grid
        setMoreItems(shuffled.slice(8, 20));

        setIsLoading(false);
      } catch (error) {
        console.error('Cache fetch error:', error);
        toast.error('Failed to load details.');
        setIsLoading(false);
      }
    };

    fetchProductFromCache();
  }, [slug]);

  // --- Favorite ---
  useEffect(() => {
    if (!product) return;
    const checkFav = async () => {
      const savedFavs = JSON.parse(
        (await AsyncStorage.getItem('bumbas_favorites')) || '[]'
      );
      setIsFavorite(
        savedFavs.some(
          (fav: any) => fav.id === product.id || fav.slug === product.slug
        )
      );
    };
    checkFav();
  }, [product]);

  const toggleFavorite = async () => {
    if (!product) return;
    let savedFavs = JSON.parse(
      (await AsyncStorage.getItem('bumbas_favorites')) || '[]'
    );

    if (isFavorite) {
      savedFavs = savedFavs.filter(
        (fav: any) => fav.id !== product.id && fav.slug !== product.slug
      );
      toast.info('Removed from favorites');
    } else {
      savedFavs.push({
        id: product.id || product._id,
        slug: product.slug,
        name: product.name,
        image: product.images?.[0]?.url || '',
        price: product.price,
      });
      toast.success('Added to favorites! ❤️');
    }
    await AsyncStorage.setItem('bumbas_favorites', JSON.stringify(savedFavs));
    setIsFavorite(!isFavorite);
  };

  // --- Share ---
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product?.name} on Bumba's Kitchen! Order now.`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  // --- Handle Add to Cart with Haptic ---
  const handleAddToCart = () => {
    if (!product) return;
    
    addItem(product, quantity, false);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // --- Scroll handling for header and bottom bar ---
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    // Header fade: show abruptly with a smooth animation after scrolling 10px
    if (offsetY > 10) {
      if (!isHeaderVisible.current) {
        isHeaderVisible.current = true;
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
    } else {
      if (isHeaderVisible.current) {
        isHeaderVisible.current = false;
        Animated.timing(headerOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
    }

    // Bottom bar: show when inline cart is out of view
    if (offsetY > 200) {
      if (inlineCartRef.current) {
        const handle = findNodeHandle(inlineCartRef.current);
        if (handle) {
          UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
            const isVisible = pageY + height > 0 && pageY < screenHeight;
            if (!isVisible && !showBottomBar) {
              setShowBottomBar(true);
              // Animate bottom bar slide up
              Animated.parallel([
                Animated.timing(bottomBarTranslateY, {
                  toValue: 0,
                  duration: 300,
                  easing: Easing.out(Easing.ease),
                  useNativeDriver: true,
                }),
                Animated.timing(bottomBarOpacity, {
                  toValue: 1,
                  duration: 300,
                  easing: Easing.out(Easing.ease),
                  useNativeDriver: true,
                }),
              ]).start();
            }
          });
        }
      }
    } else {
      if (showBottomBar) {
        setShowBottomBar(false);
        // Animate bottom bar slide down
        Animated.parallel([
          Animated.timing(bottomBarTranslateY, {
            toValue: 200,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bottomBarOpacity, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // --- Format Description (same as web) ---
  const formatDescription = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const match = line.match(/^(\s*•\s*)([^:]+)(:.*)$/);
      if (match) {
        return (
          <Text key={idx} className="text-sm text-gray-600 font-sans leading-relaxed">
            {match[1]}
            <Text className="font-bold text-gray-900">{match[2]}</Text>
            {match[3]}
            {'\n'}
          </Text>
        );
      }
      return (
        <Text key={idx} className="text-sm text-gray-600 font-sans leading-relaxed">
          {line}
          {'\n'}
        </Text>
      );
    });
  };

  // --- Loading & Error ---
  // Show loader if loading OR if cached product doesn't match current slug (stale state from component reuse)
  if (isLoading || (product && product.slug !== slug)) {
    return <ProductSkeleton />;
  }

  if (!product) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-4">
        <Text className="text-xl font-bold text-gray-800 mb-4 font-sans">
          Dish not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-6 py-3 bg-primary rounded-xl"
        >
          <Text className="text-white font-bold font-sans">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Data ---
  const validImages =
    product.images?.filter((img: any) => img.url && img.url.trim() !== '') ||
    [];
  const displayImages =
    validImages.length > 0
      ? validImages
      : [{ id: 'fallback', isPlaceholder: true }];

  const isOutOfStock = product.stock <= 0 || product.stock === 0;
  const isNonVeg = ['Chicken', 'Mutton', 'Egg', 'Fish'].includes(
    product.category?.name || product.category || ''
  );

  // Description
  const rawDescription = (
    product.description ||
    'A delicious delicacy prepared with authentic spices and fresh ingredients.'
  ).replace(/\\n/g, '\n');
  let highlights: string[] = [];
  let cleanDescriptionText = rawDescription;

  const highlightPrefix = '(Top Highlights:-';
  if (rawDescription.startsWith(highlightPrefix)) {
    const closingBracketIndex = rawDescription.indexOf(')');
    if (closingBracketIndex !== -1) {
      const highlightStr = rawDescription.substring(
        highlightPrefix.length,
        closingBracketIndex
      );
      highlights = highlightStr
        .split(';')
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);
      cleanDescriptionText = rawDescription
        .substring(closingBracketIndex + 1)
        .trim();
    }
  }

  const isLongDescription = cleanDescriptionText.length > DESC_LIMIT;
  const displayedDescription = showFullDesc
    ? cleanDescriptionText
    : cleanDescriptionText.substring(0, DESC_LIMIT) +
      (isLongDescription ? '...' : '');

  // --- Render Item for FlatList ---
  // (Not used directly, FlatList uses inline renderItem, but kept for reference if needed elsewhere)
  const renderImageItem = ({ item }: { item: any }) => {
    return (
      <View
        style={{ width: screenWidth, height: screenWidth }}
        className="bg-gray-100 relative"
      >
        {item.isPlaceholder ? (
          <LottieView
            source={LOTTIE_PLACEHOLDER}
            autoPlay
            loop
            style={{ width: '100%', height: '100%', opacity: isOutOfStock ? 0.6 : 1 }}
          />
        ) : (
          <Image
            source={{ uri: optimizeImageUrl(item.url) }}
            style={{ width: '100%', height: '100%', opacity: isOutOfStock ? 0.6 : 1 }}
            contentFit="cover"
            transition={200}
          />
        )}
        {isOutOfStock && (
          <View className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
            <View
              className="bg-red-600 px-6 py-2 rounded-lg shadow-lg"
              style={{ transform: [{ rotate: '-10deg' }] }}
            >
              <Text className="text-white font-black text-xl font-sans tracking-widest uppercase">
                Sold Out
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* --- HEADER (fades in on scroll) --- */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: 'white',
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
          opacity: headerOpacity,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 rounded-full items-center justify-center bg-gray-100"
        >
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 font-sans" numberOfLines={1}>
          {product.name}
        </Text>
        <View className="flex-row gap-2">
  <TouchableOpacity
  onPress={() => router.push('/(shop)/cart')}
  className="h-10 w-10 rounded-full items-center justify-center bg-gray-100"
  ref={cartIconRef}   // ★ এই লাইন যোগ করো
>
  <ShoppingCart size={18} color="#374151" />
</TouchableOpacity>
  <TouchableOpacity
    onPress={toggleFavorite}
    className="h-10 w-10 rounded-full items-center justify-center bg-gray-100"
  >
    <Heart
      size={20}
      color={isFavorite ? '#ef4444' : '#374151'}
      fill={isFavorite ? '#ef4444' : 'transparent'}
    />
  </TouchableOpacity>
</View>
      </Animated.View>

      {/* --- Main Content --- */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 70 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Image Slider (Swipeable) */}
        <View style={{ width: screenWidth, height: screenWidth, backgroundColor: '#f9fafb' }}>
          <FlatList
            ref={flatListRef}
            data={displayImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setActiveSlide(newIndex);
            }}
            keyExtractor={(_, index) => index.toString()}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            renderItem={({ item }) => {
              return (
                <View style={{ width: screenWidth, height: screenWidth, overflow: 'hidden' }}>
                  {item.isPlaceholder ? (
                    <LottieView
                      source={LOTTIE_PLACEHOLDER}
                      autoPlay
                      loop
                      style={{ width: '100%', height: '100%', opacity: isOutOfStock ? 0.6 : 1 }}
                    />
                  ) : (
                    <Image
                      source={{ uri: optimizeImageUrl(item.url) }}
                      style={{ width: '100%', height: '100%', opacity: isOutOfStock ? 0.6 : 1 }}
                      contentFit="cover"
                      transition={150}
                    />
                  )}
                  {isOutOfStock && (
                    <View className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
                      <View
                        className="bg-red-600 px-6 py-2 rounded-lg shadow-lg"
                        style={{ transform: [{ rotate: '-10deg' }] }}
                      >
                        <Text className="text-white font-black text-xl font-sans tracking-widest uppercase">
                          Sold Out
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            }}
          />

          {/* Dots */}
          {displayImages.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 pointer-events-none justify-end">
              <View className="flex-row justify-center gap-1.5 z-20">
                {displayImages.map((_: any, idx: number) => (
                  <View
                    key={idx}
                    className={`h-1.5 rounded-full transition-all shadow-sm ${
                      activeSlide === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
                    }`}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Thumbnails */}
        {displayImages.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 mt-4"
            contentContainerStyle={{ gap: 12, paddingRight: 32 }}
          >
            {displayImages.map((img: any, idx: number) => {
              const THUMBNAIL_GAP = 12;
              const THUMBNAIL_WIDTH = (screenWidth - 32 - (THUMBNAIL_GAP * 3)) / 4;
              
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    if (activeSlide !== idx) {
                      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
                      setActiveSlide(idx);
                    }
                  }}
                  style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_WIDTH }}
                  className={`rounded-xl overflow-hidden bg-gray-100 border-2 ${
                    activeSlide === idx ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  {img.isPlaceholder ? (
                    <LottieView
                      source={LOTTIE_PLACEHOLDER}
                      autoPlay
                      loop
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Image
                      source={{ uri: optimizeImageUrl(img.url) }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  )}
              </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View className="px-4 pt-6">
          {/* Tags & Rating */}
          <View className="flex-row items-center justify-between mb-3">
            <View
              className={`flex-row items-center px-2 py-1 rounded border ${
                isNonVeg
                  ? 'border-red-200 bg-red-50'
                  : 'border-green-200 bg-green-50'
              }`}
            >
              <View
                className={`w-3 h-3 border flex items-center justify-center mr-1.5 ${
                  isNonVeg ? 'border-red-600' : 'border-green-600'
                }`}
              >
                <View
                  className={`w-1.5 h-1.5 rounded-full ${
                    isNonVeg ? 'bg-red-600' : 'bg-green-600'
                  }`}
                />
              </View>
              <Text
                className={`text-[10px] font-bold uppercase tracking-wider font-sans ${
                  isNonVeg ? 'text-red-700' : 'text-green-700'
                }`}
              >
                {isNonVeg ? 'Non-Veg' : 'Veg'}
              </Text>
            </View>

            {product.rating > 0 ? (
              <View className="flex-row items-center bg-green-50 px-2 py-1 rounded border border-green-100">
                <Text className="text-xs font-bold text-green-700 mr-1 font-sans">
                  {product.rating}
                </Text>
                <Star size={12} color="#15803d" fill="#15803d" />
              </View>
            ) : (
              <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded border border-amber-100">
                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                <Text className="text-xs font-bold text-amber-600 ml-1 font-sans">
                  4.5
                </Text>
              </View>
            )}
          </View>

          {/* Title & Category */}
          <Text className="text-2xl sm:text-3xl font-bold text-gray-900 font-sans leading-tight mb-1">
            {product.name}
          </Text>
          <Text className="text-sm text-gray-500 font-medium font-sans mb-4">
            {product.category?.name || product.category || 'Special Dish'}
          </Text>

          {/* Badges */}
          <View className="flex-row flex-wrap gap-2 mb-6">
            {product.featured && (
              <View className="bg-amber-100 px-2.5 py-0.5 rounded-md">
                <Text className="text-xs font-bold text-amber-800 font-sans">
                  Bestseller
                </Text>
              </View>
            )}
            {product.isDailySpecial && (
              <View className="bg-primary/10 px-2.5 py-0.5 rounded-md">
                <Text className="text-xs font-bold text-primary font-sans">
                  Today's Special
                </Text>
              </View>
            )}
          </View>

          <View className="h-[1px] bg-gray-100 w-full mb-6" />

          {/* Price & Taxes */}
          <View className="mb-8">
            <Text className="text-4xl font-black text-gray-900 font-sans">
              {formatPrice(product.price)}
            </Text>
            <View className="flex-row items-center mt-1.5">
              <Info size={14} color="#6b7280" />
              <Text className="text-xs text-gray-500 ml-1 font-sans">
                Inclusive of all taxes
              </Text>
            </View>
          </View>

          {/* INLINE CART (ref for visibility check) */}
          <View ref={inlineCartRef} className="mb-8">
            {!isOutOfStock ? (
              <View className="flex-row w-full gap-3">
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl h-14 px-1.5">
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (inCart) {
                        if (cartItem.quantity > 1) {
                          updateQuantity(product.id, cartItem.quantity - 1);
                        } else {
                          removeItem(product.id);
                        }
                      } else {
                        setQuantity((q) => Math.max(1, q - 1));
                      }
                    }}
                    className="h-10 w-10 items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100"
                  >
                    <Minus size={18} color="#374151" />
                  </TouchableOpacity>
                  <Text className="w-10 text-center text-lg font-black text-gray-900 font-sans">
                    {inCart ? cartItem.quantity : quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (inCart) {
                        updateQuantity(product.id, cartItem.quantity + 1);
                      } else {
                        setQuantity((q) => q + 1);
                      }
                    }}
                    className="h-10 w-10 items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100"
                  >
                    <Plus size={18} color="#374151" />
                  </TouchableOpacity>
                </View>

                {inCart ? (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push('/(shop)/cart');
                    }}
                    className="flex-1 h-14 bg-green-600 rounded-xl flex-row items-center justify-center shadow-md px-2"
                    style={{
                      shadowColor: '#16a34a',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 5,
                    }}
                  >
                    <ShoppingCart size={20} color="#ffffff" className="mr-2" />
                    <Text className="text-white font-bold text-base font-sans">
                      View Cart
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleAddToCart}
                    className="flex-1 h-14 bg-primary rounded-xl flex-row items-center justify-center shadow-md px-2"
                    style={{
                      shadowColor: '#e11d48',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 5,
                    }}
                  >
                    <ShoppingCart size={20} color="#ffffff" className="mr-2" />
                    <Text className="text-white font-bold text-base font-sans">
                      Add
                    </Text>
                    <Text className="text-white font-black text-base ml-2 font-sans opacity-90">
                      • {formatPrice(product.price * quantity)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="w-full h-14 bg-gray-100 rounded-xl flex-row items-center justify-center border border-gray-200">
                <Ban size={20} color="#9ca3af" className="mr-2" />
                <Text className="text-gray-500 font-bold text-lg font-sans">
                  Item Sold Out
                </Text>
              </View>
            )}
          </View>

          {/* Complete Your Meal */}
          {randomItems.length > 0 && (
            <View className="mb-10">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-xl font-bold text-gray-900 font-sans">
                  Complete Your Meal
                </Text>
                <View className="flex-row items-center bg-gray-100 px-2.5 py-1 rounded-full">
                  <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mr-1 font-sans">Swipe</Text>
                  <ArrowRight size={12} color="#6b7280" />
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-4 px-4 pb-4"
                contentContainerStyle={{ gap: 16, paddingRight: 32 }}
              >
                {randomItems.map((p) => (
                  <View
                    key={p.id || p._id}
                    style={{ width: screenWidth * 0.45, height: 230 }}
                  >
                    <ProductCard product={p} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* About This Dish */}
          <View className="mt-4 pt-6 border-t border-gray-100">
            <Text className="text-lg font-extrabold text-gray-900 font-sans mb-4">
              About This Dish
            </Text>

            {highlights.length > 0 && (
              <View className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-4 mb-5">
                <View className="flex-row items-center gap-2 mb-3">
                  <Star size={16} color="#e11d48" fill="#e11d48" />
                  <Text className="font-bold text-rose-700 font-sans tracking-wide">
                    Top Highlights
                  </Text>
                </View>
                <View className="space-y-3">
                  {highlights.map((hl, idx) => {
                    const hasColon = hl.includes(':');
                    const parts = hl.split(':');
                    const key = hasColon ? parts[0]?.trim() || '' : hl.trim();
                    const val = hasColon ? parts.slice(1).join(':').trim() : '';
                    
                    return (
                      <View key={idx} className="flex-row items-start pr-2">
                        <View className="mt-1.5 mr-2.5 h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                        <Text className="text-sm text-gray-700 font-sans leading-5 flex-1 flex-wrap">
                          {hasColon ? (
                            <>
                              <Text className="font-bold text-gray-900">
                                {key}:{' '}
                              </Text>
                              {val}
                            </>
                          ) : (
                            <Text className="text-gray-800 font-medium">{key}</Text>
                          )}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ডেসক্রিপশন টেক্সট – এখন formatDescription ব্যবহার করছে */}
            <Text className="text-sm text-gray-600 font-sans leading-relaxed">
              {formatDescription(
                isLongDescription && !showFullDesc
                  ? `${cleanDescriptionText.substring(0, DESC_LIMIT)}...`
                  : cleanDescriptionText
              )}
            </Text>

            {isLongDescription && (
              <TouchableOpacity
                onPress={() => setShowFullDesc(!showFullDesc)}
                className="mt-2"
              >
                <Text className="text-primary font-bold text-sm font-sans">
                  {showFullDesc ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* More to Explore Grid (12 items, fixed-height 2-column grid) */}
          {moreItems.length > 0 && (
            <View className="mt-4 pt-8 border-t border-gray-100">
              <Text className="text-xl font-bold text-gray-900 font-sans mb-5">
                More to Explore
              </Text>
              {/* Use rows of 2 with explicit heights to prevent layout jumps */}
              {Array.from({ length: Math.ceil(moreItems.length / 2) }).map((_, rowIdx) => {
                const left = moreItems[rowIdx * 2];
                const right = moreItems[rowIdx * 2 + 1];
                const cardWidth = (screenWidth - 32 - 12) / 2;
                return (
                  <View key={rowIdx} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                    {left && (
                      <View style={{ width: cardWidth, height: 240 }}>
                        <ProductCard product={left} />
                      </View>
                    )}
                    {right && (
                      <View style={{ width: cardWidth, height: 240 }}>
                        <ProductCard product={right} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- STICKY BOTTOM ACTION BAR (Smooth slide up/down) --- */}
      {!isOutOfStock && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 5,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
            transform: [{ translateY: bottomBarTranslateY }],
            opacity: bottomBarOpacity,
          }}
        >
          <View className="flex-row w-full gap-3">
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl h-14 px-1.5">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (inCart) {
                    if (cartItem.quantity > 1) {
                      updateQuantity(product.id, cartItem.quantity - 1);
                    } else {
                      removeItem(product.id);
                    }
                  } else {
                    setQuantity((q) => Math.max(1, q - 1));
                  }
                }}
                className="h-10 w-10 items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100"
              >
                <Minus size={18} color="#374151" />
              </TouchableOpacity>
              <Text className="w-10 text-center text-lg font-black text-gray-900 font-sans">
                {inCart ? cartItem.quantity : quantity}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (inCart) {
                    updateQuantity(product.id, cartItem.quantity + 1);
                  } else {
                    setQuantity((q) => q + 1);
                  }
                }}
                className="h-10 w-10 items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100"
              >
                <Plus size={18} color="#374151" />
              </TouchableOpacity>
            </View>

            {inCart ? (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/(shop)/cart');
                }}
                className="flex-1 h-14 bg-green-600 rounded-xl flex-row items-center justify-center shadow-md px-2"
                style={{
                  shadowColor: '#16a34a',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                }}
              >
                <ShoppingCart size={20} color="#ffffff" className="mr-2" />
                <Text className="text-white font-bold text-base font-sans">
                  View Cart
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleAddToCart}
                className="flex-1 h-14 bg-primary rounded-xl flex-row items-center justify-center shadow-md px-2"
                style={{
                  shadowColor: '#e11d48',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                }}
              >
                <ShoppingCart size={20} color="#ffffff" className="mr-2" />
                <Text className="text-white font-bold text-base font-sans">
                  Add
                </Text>
                <Text className="text-white font-black text-base ml-2 font-sans opacity-90">
                  • {formatPrice(product.price * quantity)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

    </View>
  );
}