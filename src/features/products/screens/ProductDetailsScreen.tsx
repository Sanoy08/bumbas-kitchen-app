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
import React, { useEffect, useRef, useState } from 'react';
import { ShimmerSkeleton } from '@/shared/components/ui/ShimmerSkeleton';
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
import { default as Reanimated, Extrapolation, interpolate, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing as REasing, cancelAnimation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { ProductCard } from '@/shared/components/shop/ProductCard';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';
import { formatPrice } from '@/shared/utils/utils';
import { useCartStore } from '@/shared/store/cartStore';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const LOTTIE_PLACEHOLDER = require('@/assets/animations/Image-Loading.json');
const CART_ANIMATION = require('@/assets/animations/details-Cart.json');
const DESC_LIMIT = 350; // ওয়েবের সাথে মেলানো

const AnimatedDot = ({ index, progressValue, count }: { index: number; progressValue: Animated.SharedValue<number>; count: number }) => {
  const dotStyle = useAnimatedStyle(() => {
    let dist = Math.abs(progressValue.value - index);
    if (dist > count / 2) {
      dist = count - dist; // wrap around
    }
    
    const width = interpolate(dist, [0, 1], [20, 6], Extrapolation.CLAMP);
    const opacity = interpolate(dist, [0, 1], [1, 0.4], Extrapolation.CLAMP);

    return { width, opacity };
  });

  return (
    <Reanimated.View
      style={[{ height: 6, borderRadius: 3, backgroundColor: '#ffffff', marginHorizontal: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1 }, dotStyle]}
    />
  );
};

const ImageWithLottie = ({ uri, style, contentFit = 'cover', transition = 150, opacity = 1 }: any) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <View style={[{ width: '100%', height: '100%' }, style]}>
      {!isLoaded && (
        <LottieView
          source={LOTTIE_PLACEHOLDER}
          autoPlay
          loop
          style={{ width: '100%', height: '100%', position: 'absolute' }}
        />
      )}
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%', opacity }}
        contentFit={contentFit}
        transition={transition}
        onLoad={() => setIsLoaded(true)}
      />
    </View>
  );
};

const ProductSkeleton = () => {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      {/* Header Skeleton */}
      <View 
        className="absolute top-0 left-0 right-0 z-50 flex-row justify-between items-center px-4 pb-2.5"
        style={{ paddingTop: insets.top + 10 }}
      >
        <ShimmerSkeleton width={40} height={40} borderRadius={20} />
        <View className="flex-row gap-2">
          <ShimmerSkeleton width={40} height={40} borderRadius={20} />
          <ShimmerSkeleton width={40} height={40} borderRadius={20} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} scrollEnabled={false}>
        {/* Main Image */}
        <ShimmerSkeleton width={screenWidth} height={screenWidth} borderRadius={0} />

        {/* Content */}
        <View className="px-4 pt-6">
          {/* Tags & Rating */}
          <View className="flex-row items-center justify-between mb-3">
            <ShimmerSkeleton width={64} height={22} borderRadius={4} />
            <ShimmerSkeleton width={42} height={22} borderRadius={4} />
          </View>

          {/* Title */}
          <ShimmerSkeleton width="75%" height={32} borderRadius={6} style={{ marginBottom: 6 }} />
          {/* Category */}
          <ShimmerSkeleton width="30%" height={16} borderRadius={4} style={{ marginBottom: 16 }} />

          {/* Badges */}
          <View className="flex-row gap-2 mb-6">
            <ShimmerSkeleton width={70} height={20} borderRadius={4} />
            <ShimmerSkeleton width={90} height={20} borderRadius={4} />
          </View>

          <View className="h-[1px] bg-gray-100 w-full mb-6" />

          {/* Price & Taxes */}
          <View className="mb-8">
            <ShimmerSkeleton width={110} height={36} borderRadius={6} style={{ marginBottom: 8 }} />
            <ShimmerSkeleton width={130} height={14} borderRadius={4} />
          </View>

          {/* Action Buttons (Quantity & Add) */}
          <View className="flex-row w-full gap-3 mb-8">
            <ShimmerSkeleton width={135} height={56} borderRadius={12} />
            <ShimmerSkeleton style={{ flex: 1, height: 56, borderRadius: 12 }} />
          </View>

          {/* Description Lines */}
          <ShimmerSkeleton width="40%" height={24} borderRadius={6} style={{ marginBottom: 16 }} />
          <ShimmerSkeleton width="100%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
          <ShimmerSkeleton width="90%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
          <ShimmerSkeleton width="95%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
          <ShimmerSkeleton width="70%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
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
  const carouselRef = useRef<ICarouselInstance>(null);

  // Header fade animation
  const headerOpacity = useRef(new Animated.Value(0)).current;

  // Bottom bar slide animation
  const bottomBarTranslateY = useRef(new Animated.Value(200)).current;
  const bottomBarOpacity = useRef(new Animated.Value(0)).current;

  // Header visibility tracker
  const isHeaderVisible = useRef(false);
  const outerY = useRef<number>(0);
  const inlineCartY = useRef<number>(0);
  const progressValue = useSharedValue<number>(0);

  // Cart Animation Ref
  const cartAnimRef = useRef<LottieView>(null);
  
  // Favorite Animation Ref
  const favAnimRef = useRef<LottieView>(null);

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
      isHeaderVisible.current = false;
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
      const isFav = savedFavs.some(
        (fav: any) => fav.id === product.id || fav.slug === product.slug
      );
      setIsFavorite(isFav);
      if (isFav) {
        // Set to last frame if already favorite
        setTimeout(() => favAnimRef.current?.play(100, 100), 100);
      }
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
      favAnimRef.current?.reset();
      favAnimRef.current?.play(0, 0);
    } else {
      savedFavs.push({
        id: product.id || product._id,
        slug: product.slug,
        name: product.name,
        image: product.images?.[0]?.url || '',
        price: product.price,
      });
      toast.success('Added to favorites! ❤️');
      
      // Play heart animation to the end
      favAnimRef.current?.reset();
      favAnimRef.current?.play();
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
    cartAnimRef.current?.reset();
    cartAnimRef.current?.play();
  };

  // --- Scroll handling for header and bottom bar ---
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    // Header background fade: show smoothly after scrolling past the image
    if (offsetY > screenWidth - 100) {
      if (!isHeaderVisible.current) {
        isHeaderVisible.current = true;
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    } else {
      if (isHeaderVisible.current) {
        isHeaderVisible.current = false;
        Animated.timing(headerOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    }

    // Bottom bar: show when inline cart is out of view
    // Since inlineCart is nested inside an outer View, its absolute Y is outerY + inlineCartY
    const absoluteCartY = outerY.current + inlineCartY.current;
    if (absoluteCartY > 0) {
      const cartTop = absoluteCartY;
      
      // The header exactly takes (insets.top + 60) pixels at the top.
      const headerHeight = insets.top + 60;
      const effectiveScreenTop = offsetY + headerHeight;
      const screenBottom = offsetY + screenHeight;

      // The user wants it to trigger as soon as it TOUCHES the header (cartTop < effectiveScreenTop)
      // or if it goes completely below the screen (cartTop > screenBottom)
      const isCartOutOfView = cartTop < effectiveScreenTop || cartTop > screenBottom;
      
      if (isCartOutOfView && !showBottomBar) {
        setShowBottomBar(true);
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
      } else if (!isCartOutOfView && showBottomBar) {
        setShowBottomBar(false);
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
      {/* --- HEADER --- */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        pointerEvents="box-none"
      >
        {/* Animated Background */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
            opacity: headerOpacity,
          }}
          pointerEvents="none"
        />

        {/* Title */}
        <Animated.View 
          style={{ 
            position: 'absolute', 
            left: 60, 
            right: 60,
            bottom: 10, // aligns with paddingBottom
            height: 40, // aligns with icon height
            justifyContent: 'center',
            alignItems: 'center',
            opacity: headerOpacity 
          }} 
          pointerEvents="none"
        >
          <Text className="text-lg font-bold text-gray-900 font-sans text-center" numberOfLines={1}>
            {product.name}
          </Text>
        </Animated.View>

        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 rounded-full items-center justify-center bg-gray-100"
        >
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => router.push('/(shop)/cart')}
            className="h-10 w-10 rounded-full items-center justify-center bg-gray-100"
            ref={cartIconRef}
          >
            <LottieView
               ref={cartAnimRef}
               source={CART_ANIMATION}
               autoPlay={false}
               loop={false}
               style={{ width: 34, height: 34 }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleFavorite}
            className="h-10 w-10 rounded-full items-center justify-center bg-gray-100"
          >
            <LottieView
              ref={favAnimRef}
              source={require('../../../../assets/animations/fav.json')}
              autoPlay={false}
              loop={false}
              style={{ width: 44, height: 44 }}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Main Content --- */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 70 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Image Slider (Swipeable Hero Style) */}
        <View style={{ width: screenWidth, height: screenWidth, backgroundColor: '#f9fafb' }}>
          <Carousel
            ref={carouselRef}
            loop={displayImages.length > 1}
            enabled={displayImages.length > 1}
            width={screenWidth}
            height={screenWidth}
            autoPlay={false}
            autoPlayInterval={4000}
            data={displayImages}
            scrollAnimationDuration={400}
            onSnapToItem={(index) => setActiveSlide(index)}
            onProgressChange={(_, absoluteProgress) => {
              progressValue.value = absoluteProgress;
            }}
            customAnimation={(value: number) => {
              "worklet";
              const translateX = interpolate(
                value,
                [-1, 0, 1],
                [-screenWidth * 0.25, 0, screenWidth],
                Extrapolation.CLAMP
              );

              const zIndex = Math.round(interpolate(
                value, 
                [-1, 0, 1], 
                [0, 1, 2],
                Extrapolation.CLAMP
              ));

              const opacity = interpolate(
                value,
                [-2, -1, 0, 1, 2],
                [0, 1, 1, 1, 0],
                Extrapolation.CLAMP
              );

              return {
                transform: [{ translateX }],
                zIndex,
                opacity,
              };
            }}
            renderItem={({ item }) => (
              <View style={{ width: screenWidth, height: screenWidth, overflow: 'hidden' }}>
                {item.isPlaceholder ? (
                    <LottieView
                      source={LOTTIE_PLACEHOLDER}
                      autoPlay
                      loop
                      style={{ width: '100%', height: '100%' }}
                    />
                ) : (
                  <ImageWithLottie
                    uri={optimizeImageUrl(item.url)}
                    opacity={1}
                    transition={150}
                  />
                )}
              </View>
            )}
          />

          {/* Animated Dots */}
          {displayImages.length > 1 && (
            <View style={{ position: 'absolute', bottom: 14, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
              {displayImages.map((_: any, idx: number) => (
                <AnimatedDot key={idx} index={idx} progressValue={progressValue} count={displayImages.length} />
              ))}
            </View>
          )}
        </View>



        <View className="px-4 pt-6" onLayout={(e) => { outerY.current = e.nativeEvent.layout.y; }}>
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
          <View onLayout={(e) => { inlineCartY.current = e.nativeEvent.layout.y; }} ref={inlineCartRef} className="mb-8">
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
                      cartAnimRef.current?.reset();
                      cartAnimRef.current?.play();
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
                    <ShoppingCart size={20} color="#ffffff" />
                    <Text className="text-white font-bold text-base font-sans ml-4">
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
                    <ShoppingCart size={20} color="#ffffff" />
                    <Text className="text-white font-bold text-base font-sans ml-4">
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
                <Ban size={20} color="#9ca3af" />
                <Text className="text-gray-500 font-bold text-lg font-sans ml-2">
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
                    style={{ width: screenWidth * 0.45 }}
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
                      <View style={{ width: cardWidth }}>
                        <ProductCard product={left} />
                      </View>
                    )}
                    {right && (
                      <View style={{ width: cardWidth }}>
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
                <ShoppingCart size={20} color="#ffffff" />
                <Text className="text-white font-bold text-base font-sans ml-4">
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
                <ShoppingCart size={20} color="#ffffff" />
                <Text className="text-white font-bold text-base font-sans ml-4">
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