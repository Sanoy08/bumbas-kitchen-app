import { ShimmerSkeleton } from '@/shared/components/ui/ShimmerSkeleton';
import { useCartStore } from '@/shared/store/cartStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const { width } = Dimensions.get('window');
const CARD_H_PADDING = 16;
const CARD_WIDTH = width - CARD_H_PADDING * 2;
const DEFAULT_IMAGE_HEIGHT = CARD_WIDTH * 0.75;
const CATEGORY_TILE_SIZE = (width - 32 - 32) / 5;
const CATEGORY_OVERLAP = CATEGORY_TILE_SIZE / 2;
const HEADING_HEIGHT = width * (2 / 3);

const AUTOSCROLL_OFFSET = -10;
const CATEGORY_BOTTOM_PADDING = 30;

const SELECTED_SCALE = 1.08;
const UNSELECTED_OPACITY = 0.55;

export default function MegaCampaignScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const STICKY_TOP = insets.top + 8;
  const STICKY_THRESHOLD = Math.max(0, HEADING_HEIGHT - CATEGORY_OVERLAP - STICKY_TOP);
  const AUTOSCROLL_Y = Math.max(0, STICKY_THRESHOLD - AUTOSCROLL_OFFSET);

  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0);
  const [isContentReady, setIsContentReady] = useState(false);
  const [prefetchDone, setPrefetchDone] = useState(false);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
  const [loadedItemImages, setLoadedItemImages] = useState<Record<string, boolean>>({});

  const cartLottieRef = useRef<LottieView>(null);
  const [animationKey, setAnimationKey] = useState(0);

  const loadedImagesRef = useRef<Set<string>>(new Set());
  const totalImagesRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<any>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const stickyBgOpacity = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD - 6, STICKY_THRESHOLD + 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const stickyBorderOpacity = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD - 6, STICKY_THRESHOLD + 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const campaign = useMemo(() => {
    if (params.data && typeof params.data === 'string') {
      try {
        return JSON.parse(params.data);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [params.data]);

  const allImageUrls = useMemo(() => {
    if (!campaign) return [];
    const urls = new Set<string>();
    if (campaign.headingImage) urls.add(campaign.headingImage);
    if (campaign.pageBgImage) urls.add(campaign.pageBgImage);
    campaign.categories?.forEach((cat: any) => {
      if (cat.image) urls.add(cat.image);
      cat.items?.forEach((item: any) => {
        if (item.image) urls.add(item.image);
      });
    });
    return Array.from(urls);
  }, [campaign]);

  useEffect(() => {
    if (!campaign) return;
    const set = new Set<string>();
    if (campaign.headingImage) set.add(campaign.headingImage);
    campaign.categories?.forEach((cat: any) => {
      if (cat.image) set.add(cat.image);
    });
    campaign.categories?.[0]?.items?.forEach((item: any) => {
      if (item.image) set.add(item.image);
    });
    totalImagesRef.current = set;
    loadedImagesRef.current = new Set();
  }, [campaign]);

  useEffect(() => {
    if (!campaign) {
      setPrefetchDone(true);
      setIsContentReady(true);
    }
  }, [campaign]);

  useEffect(() => {
    if (!campaign) return;
    let isMounted = true;
    (async () => {
      try {
        if (allImageUrls.length > 0) {
          await Promise.all(allImageUrls.map((url) => Image.prefetch(url)));
        }
      } catch (error) {
        console.error('Error prefetching images:', error);
      } finally {
        if (isMounted) setPrefetchDone(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [campaign, allImageUrls]);

  const handleImageLoad = useCallback((url?: string, source?: { width?: number; height?: number }) => {
    if (!url) return;
    if (source?.width && source?.height) {
      const ratio = source.width / source.height;
      setImageRatios((prev) => (prev[url] === ratio ? prev : { ...prev, [url]: ratio }));
    }
    loadedImagesRef.current.add(url);
    const total = totalImagesRef.current.size;
    if (total > 0 && loadedImagesRef.current.size >= total) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsContentReady(true));
      });
    }
  }, []);

  // Handle item image load: save ratio, mark loaded, and (for first category) feed into initial-load tracker
  const handleItemImageLoad = useCallback((
    url: string,
    source: { width?: number; height?: number } | undefined,
    trackInitialLoad: boolean
  ) => {
    if (source?.width && source?.height) {
      const ratio = source.width / source.height;
      setImageRatios((prev) => (prev[url] === ratio ? prev : { ...prev, [url]: ratio }));
    }
    setLoadedItemImages((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
    if (trackInitialLoad) {
      handleImageLoad(url, source);
    } else {
      loadedImagesRef.current.add(url);
    }
  }, [handleImageLoad]);

  useEffect(() => {
    if (prefetchDone && totalImagesRef.current.size === 0) {
      setIsContentReady(true);
    }
  }, [prefetchDone]);

  const handleSelectCategory = useCallback((idx: number) => {
    setSelectedCategoryIdx(idx);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: AUTOSCROLL_Y, animated: true });
    });
  }, [AUTOSCROLL_Y]);

  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const handleAddToCart = (item: any) => {
    if (item.orderCutoffTime) {
      const cutoffDate = new Date(item.orderCutoffTime);
      if (new Date() > cutoffDate) {
        alert('Order cutoff time for this item has passed.');
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const product = {
      id: `mega_${item.name.replace(/\s+/g, '_')}_${item.price}`,
      name: item.name,
      price: Number(item.price),
      description: item.description,
      stock: 100,
      images: item.image ? [{ id: 'img1', url: item.image }] : [],
      category: { id: 'mega', name: 'Mega Offer' },
      type: item.type || 'veg',
      isSpecialOffer: true,
      deliveryDate: item.deliveryDate,
      orderCutoffTime: item.orderCutoffTime,
      mealType: item.mealType ? item.mealType.toLowerCase() : undefined
    };

    addItem(product as any);
  };

  const getQuantity = (itemName: string, itemPrice: number) => {
    const id = `mega_${itemName.replace(/\s+/g, '_')}_${itemPrice}`;
    const cartItem = cartItems.find((ci: any) => ci.id === id);
    return cartItem ? cartItem.quantity : 0;
  };

  const totalQuantity = cartItems.reduce((acc: any, item: any) => acc + item.quantity, 0);
  const prevQuantity = useRef(totalQuantity);

  useEffect(() => {
    if (totalQuantity > prevQuantity.current) {
      setAnimationKey(prev => prev + 1);
    }
    prevQuantity.current = totalQuantity;
  }, [totalQuantity]);

  const handleUpdateQuantity = (itemName: string, itemPrice: number, change: number) => {
    const id = `mega_${itemName.replace(/\s+/g, '_')}_${itemPrice}`;
    const currentQty = getQuantity(itemName, itemPrice);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQuantity(id, currentQty + change);
  };

  const showSkeleton = !isContentReady;
  const hasCategories = !!(campaign?.categories && campaign.categories.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {prefetchDone && campaign && (
        <View style={StyleSheet.absoluteFill}>
          <ImageBackground
            source={{ uri: campaign.pageBgImage || 'https://via.placeholder.com/800x1200' }}
            style={{ flex: 1 }}
            resizeMode="cover"
          >
            <Animated.ScrollView
              ref={scrollRef}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
              stickyHeaderIndices={hasCategories ? [1] : undefined}
            >
              {/* Child 0: heading */}
              <View style={{ marginBottom: -(CATEGORY_OVERLAP + STICKY_TOP) }}>
                {campaign.headingImage && (
                  <Image
                    source={{ uri: campaign.headingImage }}
                    style={{ width: '100%', height: HEADING_HEIGHT }}
                    contentFit="cover"
                    onLoad={() => handleImageLoad(campaign.headingImage)}
                  />
                )}
              </View>

              {/* Child 1: sticky category row */}
              <View
                pointerEvents="box-none"
                style={{
                  paddingTop: STICKY_TOP,
                  paddingBottom: CATEGORY_BOTTOM_PADDING,
                }}
              >
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: STICKY_TOP + 20,
                    opacity: stickyBgOpacity,
                    backgroundColor: '#ffffff',
                  }}
                />
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: 'rgba(0,0,0,0.08)',
                    opacity: stickyBorderOpacity,
                  }}
                />

                {hasCategories && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      paddingHorizontal: 16,
                      gap: 8,
                      alignItems: 'center',
                      paddingVertical: 4,
                    }}
                  >
                    {campaign.categories.map((cat: any, cIdx: number) => {
                      const isSelected = selectedCategoryIdx === cIdx;
                      return (
                        <TouchableOpacity
                          key={cIdx}
                          onPress={() => handleSelectCategory(cIdx)}
                          activeOpacity={0.85}
                          style={{
                            width: CATEGORY_TILE_SIZE,
                            height: CATEGORY_TILE_SIZE,
                            borderRadius: 14,
                            opacity: isSelected ? 1 : UNSELECTED_OPACITY,
                            transform: [{ scale: isSelected ? SELECTED_SCALE : 1 }],
                            shadowColor: isSelected ? '#e11d48' : '#000',
                            shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                            shadowOpacity: isSelected ? 0.35 : 0.12,
                            shadowRadius: isSelected ? 8 : 4,
                            elevation: isSelected ? 10 : 2,
                          }}
                        >
                          <View
                            style={{
                              flex: 1,
                              borderRadius: 14,
                              borderWidth: isSelected ? 2.5 : 0,
                              borderColor: isSelected ? '#e11d48' : 'transparent',
                              padding: isSelected ? 2 : 0,
                              backgroundColor: isSelected ? '#ffffff' : 'transparent',
                            }}
                          >
                            <View
                              style={{
                                flex: 1,
                                borderRadius: isSelected ? 10 : 14,
                                overflow: 'hidden',
                                backgroundColor: '#fff',
                              }}
                            >
                              {cat.image ? (
                                <Image
                                  source={{ uri: cat.image }}
                                  style={{ width: '100%', height: '100%' }}
                                  contentFit="cover"
                                  onLoad={() => handleImageLoad(cat.image)}
                                />
                              ) : (
                                <View style={{ flex: 1, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Category</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* Child 2: items */}
              <View>
                {campaign.categories && campaign.categories[selectedCategoryIdx] && (
                  <View style={{ paddingHorizontal: CARD_H_PADDING, marginTop: 20, gap: 20 }}>
                    {campaign.categories[selectedCategoryIdx].items?.map((item: any, iIdx: number) => {
                      const qty = getQuantity(item.name, item.price);
                      let isExpired = false;
                      if (item.orderCutoffTime) {
                        isExpired = new Date() > new Date(item.orderCutoffTime);
                      }
                      const trackInitialLoad = selectedCategoryIdx === 0;
                      const ratio = item.image ? imageRatios[item.image] : undefined;
                      // Start square (1:1) until ratio is known; then adjust to natural aspect
                      const imageHeight = ratio ? CARD_WIDTH / ratio : CARD_WIDTH;
                      const itemImageLoaded = item.image ? !!loadedItemImages[item.image] : true;

                      return (
                        <View
                          key={`${selectedCategoryIdx}_${iIdx}`}
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.97)',
                            borderRadius: 24,
                            overflow: 'hidden',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.12,
                            shadowRadius: 14,
                            elevation: 6,
                          }}
                        >
                          {item.image && (
                            <View style={{ width: CARD_WIDTH, height: imageHeight, backgroundColor: '#f3f4f6' }}>
                              <Image
                                source={{ uri: item.image }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                                onLoad={(e: any) => {
                                  const src = e?.source;
                                  handleItemImageLoad(
                                    item.image,
                                    src ? { width: src.width, height: src.height } : undefined,
                                    trackInitialLoad
                                  );
                                }}
                              />
                              {!itemImageLoaded && (
                                <ShimmerSkeleton
                                  width="100%"
                                  height="100%"
                                  borderRadius={0}
                                  style={StyleSheet.absoluteFill as any}
                                />
                              )}
                            </View>
                          )}

                          <View style={{ padding: 16, gap: 10 }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111' }}>
                              {item.name}
                            </Text>

                            {item.deliveryDate && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                <View style={{ backgroundColor: '#fdf2f8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 12, color: '#e11d48', fontWeight: '700' }}>
                                    Delivers: {new Date(item.deliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                  </Text>
                                </View>
                              </View>
                            )}

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                              <Text style={{ fontSize: 22, fontWeight: '800', color: '#e11d48' }}>₹{item.price}</Text>

                              {isExpired ? (
                                <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 }}>
                                  <Text style={{ fontSize: 13, color: '#9ca3af', fontWeight: '700' }}>Closed</Text>
                                </View>
                              ) : qty > 0 ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e11d48', borderRadius: 24 }}>
                                  <TouchableOpacity onPress={() => handleUpdateQuantity(item.name, item.price, -1)} style={{ padding: 10 }}>
                                    <Minus size={18} color="white" />
                                  </TouchableOpacity>
                                  <Text style={{ color: 'white', fontWeight: '800', marginHorizontal: 10, fontSize: 16 }}>{qty}</Text>
                                  <TouchableOpacity onPress={() => handleUpdateQuantity(item.name, item.price, 1)} style={{ padding: 10 }}>
                                    <Plus size={18} color="white" />
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  onPress={() => handleAddToCart(item)}
                                  style={{ backgroundColor: '#e11d48', paddingHorizontal: 28, paddingVertical: 10, borderRadius: 24 }}
                                >
                                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>ADD</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </Animated.ScrollView>

            {/* Top white strip */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: STICKY_TOP,
                backgroundColor: '#ffffff',
                opacity: stickyBgOpacity,
                zIndex: 5,
              }}
            />
          </ImageBackground>
        </View>
      )}

      {showSkeleton && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }]}>
          <ShimmerSkeleton width="100%" height={HEADING_HEIGHT} borderRadius={0} />

          <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, zIndex: 10, marginTop: -CATEGORY_OVERLAP }}>
            {[...Array(5)].map((_, i) => (
              <ShimmerSkeleton key={i} width={CATEGORY_TILE_SIZE} height={CATEGORY_TILE_SIZE} borderRadius={12} />
            ))}
          </View>

          <View style={{ paddingHorizontal: CARD_H_PADDING, marginTop: 20, gap: 20 }}>
            {[...Array(2)].map((_, i) => (
              <View key={i} style={{ backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 6 }}>
                <ShimmerSkeleton width="100%" height={CARD_WIDTH} borderRadius={0} />
                <View style={{ padding: 16, gap: 10 }}>
                  <ShimmerSkeleton width="80%" height={22} borderRadius={4} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <ShimmerSkeleton width={90} height={22} borderRadius={6} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <ShimmerSkeleton width={70} height={24} borderRadius={4} />
                    <ShimmerSkeleton width={90} height={40} borderRadius={24} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {!campaign && prefetchDone && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Error loading campaign data.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 10, backgroundColor: '#e11d48', borderRadius: 8 }}>
            <Text style={{ color: 'white' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {cartItems && cartItems.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/cart')}
          style={{
            position: 'absolute',
            bottom: insets.bottom > 0 ? insets.bottom : 20,
            left: 16,
            right: 16,
            backgroundColor: '#f4bbc7',
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#e11d48',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            overflow: 'hidden'
          }}
        >
          <View style={{ backgroundColor: 'rgba(225,29,72,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ color: '#e11d48', fontWeight: 'bold', fontSize: 14 }}>
              {cartItems.reduce((acc: any, item: any) => acc + item.quantity, 0)} {cartItems.reduce((acc: any, item: any) => acc + item.quantity, 0) > 1 ? 'items' : 'item'}
            </Text>
          </View>

          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
            <LottieView
              ref={cartLottieRef}
              key={`cart-anim-${animationKey}`}
              source={require('../../assets/animations/cart.json')}
              loop={false}
              autoPlay={animationKey > 0}
              onAnimationFinish={() => {
                cartLottieRef.current?.reset();
              }}
              style={{ width: 60, height: 60 }}
            />
          </View>

          <Text style={{ color: '#e11d48', fontWeight: 'bold', fontSize: 16 }}>View Cart</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}