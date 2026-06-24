// src/app/(shop)/menus/[slug].tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
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
  Star
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { ProductCard } from '@/components/shop/ProductCard';
import { optimizeImageUrl } from '@/lib/imageUtils';
import { formatPrice } from '@/lib/utils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const PLACEHOLDER_IMAGE_URL =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop';
const DESC_LIMIT = 350; // ওয়েবের সাথে মেলানো

export default function ProductDetailsScreen() {
  const searchParams = useLocalSearchParams();
  const slug = searchParams.slug;

  const router = useRouter();
  const insets = useSafeAreaInsets();

  // State
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [randomItems, setRandomItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [quantity, setQuantity] = useState(1);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Sticky bottom bar
  const [showBottomBar, setShowBottomBar] = useState(false);
  const inlineCartRef = useRef<View>(null);
  const cartIconRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const flatListRef = useRef<FlatList>(null);

  // Fly animation
  const [flyVisible, setFlyVisible] = useState(false);
  const flyAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const flyScale = useRef(new Animated.Value(0)).current;
  const flyOpacity = useRef(new Animated.Value(0)).current;
  const [flyImageUrl, setFlyImageUrl] = useState('');

  // Header fade animation
  const headerOpacity = useRef(new Animated.Value(0)).current;

  // Bottom bar slide animation
  const bottomBarTranslateY = useRef(new Animated.Value(200)).current;
  const bottomBarOpacity = useRef(new Animated.Value(0)).current;

  // --- Fetch Product (ONLY FROM CACHE) ---
  useEffect(() => {
    const fetchProductFromCache = async () => {
      if (!slug) return;
      setIsLoading(true);

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
        const shuffled = otherProducts.sort(() => 0.5 - Math.random());
        setRandomItems(shuffled.slice(0, 8));

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
        image: product.images?.[0]?.url || PLACEHOLDER_IMAGE_URL,
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

  // --- Handle Add to Cart with Haptic + Fly ---
  const handleAddToCart = () => {
    if (!product) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toast.success(`Added ${quantity}x ${product.name} to cart! 🛒`);
    startFlyAnimation();
  };

  // --- Fly Animation ---
  const startFlyAnimation = () => {
    const imgUrl = product.images?.[activeSlide]?.url || PLACEHOLDER_IMAGE_URL;
    setFlyImageUrl(optimizeImageUrl(imgUrl));

    if (cartIconRef.current) {
      const handle = findNodeHandle(cartIconRef.current);
      if (handle) {
        UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
          const targetX = pageX + width / 2;
          const targetY = pageY + height / 2;

          const startX = screenWidth / 2;
          const startY = screenHeight / 2;

          flyAnim.setValue({ x: startX, y: startY });
          flyScale.setValue(0.2);
          flyOpacity.setValue(0);

          setFlyVisible(true);

          Animated.parallel([
            Animated.timing(flyOpacity, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(flyScale, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.back(1.5)),
              useNativeDriver: true,
            }),
          ]).start(() => {
            Animated.parallel([
              Animated.timing(flyAnim, {
                toValue: { x: targetX, y: targetY },
                duration: 700,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(flyScale, {
                toValue: 0.2,
                duration: 700,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(flyOpacity, {
                toValue: 0,
                duration: 700,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
              }),
            ]).start(() => {
              setFlyVisible(false);
            });
          });
        });
      }
    }
  };

  // --- Scroll handling for header and bottom bar ---
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    // Header fade: show after 100px scroll
    const headerFadeValue = Math.min(offsetY / 100, 1);
    headerOpacity.setValue(headerFadeValue);

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
      : [{ id: 'fallback', url: PLACEHOLDER_IMAGE_URL }];

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
  const renderImageItem = ({ item }: { item: any }) => {
    const imageUrl = item.url ? optimizeImageUrl(item.url) : PLACEHOLDER_IMAGE_URL;
    return (
      <View
        style={{ width: screenWidth, height: screenWidth }}
        className="bg-gray-100 relative"
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%', opacity: isOutOfStock ? 0.6 : 1 }}
          contentFit="cover"
          transition={200}
          placeholder={PLACEHOLDER_IMAGE_URL}
        />
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
        <FlatList
          ref={flatListRef}
          data={displayImages}
          renderItem={renderImageItem}
          keyExtractor={(item, index) => item.id || index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / screenWidth
            );
            setActiveSlide(index);
          }}
          initialScrollIndex={0}
          getItemLayout={(data, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
        />

        {/* Dots */}
        {displayImages.length > 1 && (
          <View className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none justify-end pb-4">
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

        {/* Thumbnails */}
        {displayImages.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 mt-4"
            contentContainerStyle={{ gap: 12, paddingRight: 32 }}
          >
            {displayImages.map((img: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setActiveSlide(idx);
                  flatListRef.current?.scrollToIndex({ index: idx, animated: true });
                }}
                className={`h-16 w-16 rounded-xl overflow-hidden bg-gray-100 border-2 ${
                  activeSlide === idx ? 'border-primary' : 'border-transparent'
                }`}
              >
                <Image
                  source={{ uri: optimizeImageUrl(img.url) }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
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
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-10 w-10 items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100"
                  >
                    <Minus size={18} color="#374151" />
                  </TouchableOpacity>
                  <Text className="w-10 text-center text-lg font-black text-gray-900 font-sans">
                    {quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setQuantity((q) => q + 1)}
                    className="h-10 w-10 items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100"
                  >
                    <Plus size={18} color="#374151" />
                  </TouchableOpacity>
                </View>

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

          {/* About This Dish */}
          <View className="mb-10">
            <View className="border-b-2 border-gray-900 pb-1 mb-5 self-start">
              <Text className="text-xl font-bold text-gray-900 font-sans">
                About This Dish :
              </Text>
            </View>

            {highlights.length > 0 && (
              <View className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-5 shadow-sm">
                <View className="flex-row items-center gap-2 mb-3">
                  <Star size={16} color="#f97316" fill="#f97316" />
                  <Text className="font-bold text-orange-800 font-sans">
                    Delicious Details :
                  </Text>
                </View>
                <View className="space-y-2.5">
                  {highlights.map((hl, idx) => {
                    const parts = hl.split(':');
                    const key = parts[0]?.trim() || '';
                    const val = parts.slice(1).join(':').trim();
                    return (
                      <View key={idx} className="flex-row items-start pr-2">
                        <CheckCircle2
                          size={16}
                          color="#f97316"
                          className="mt-0.5 mr-2 shrink-0"
                        />
                        <Text className="text-sm text-gray-700 font-sans leading-5">
                          <Text className="font-bold text-gray-900">
                            {key}:{' '}
                          </Text>
                          {val}
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

          {/* Complete Your Meal */}
          {randomItems.length > 0 && (
            <View className="mt-6 pt-8 border-t border-gray-100">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-xl font-bold text-gray-900 font-sans">
                  Complete Your Meal
                </Text>
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
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-10 w-10 items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100"
              >
                <Minus size={18} color="#374151" />
              </TouchableOpacity>
              <Text className="w-10 text-center text-lg font-black text-gray-900 font-sans">
                {quantity}
              </Text>
              <TouchableOpacity
                onPress={() => setQuantity((q) => q + 1)}
                className="h-10 w-10 items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100"
              >
                <Plus size={18} color="#374151" />
              </TouchableOpacity>
            </View>

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
          </View>
        </Animated.View>
      )}

      {/* --- FLY TO CART OVERLAY --- */}
      {flyVisible && (
        <Modal transparent visible={flyVisible} animationType="none">
          <View style={StyleSheet.absoluteFillObject}>
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: screenWidth,
                height: screenHeight,
                backgroundColor: 'rgba(0,0,0,0.3)',
                opacity: flyOpacity,
              }}
            />
            <Animated.Image
              source={{ uri: flyImageUrl }}
              style={{
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: 16,
                transform: [
                  { translateX: Animated.subtract(flyAnim.x, 40) },
                  { translateY: Animated.subtract(flyAnim.y, 40) },
                  { scale: flyScale },
                ],
                opacity: flyOpacity,
              }}
              resizeMode="cover"
            />
          </View>
        </Modal>
      )}
    </View>
  );
}