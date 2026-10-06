import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, ImageBackground, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Minus, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '@/shared/store/cartStore';
import * as Haptics from 'expo-haptics';
import { ShimmerSkeleton } from '@/shared/components/ui/ShimmerSkeleton';


const { width } = Dimensions.get('window');
const CARD_H_PADDING = 16;
const CARD_WIDTH = width - CARD_H_PADDING * 2;
const DEFAULT_IMAGE_HEIGHT = CARD_WIDTH * 0.75; // fallback while ratio unknown

// Category tile size + 50% overlap over the heading image bottom
const CATEGORY_TILE_SIZE = (width - 32 - 32) / 5;
const CATEGORY_OVERLAP = CATEGORY_TILE_SIZE / 2;

export default function MegaCampaignScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0);
  const [isContentReady, setIsContentReady] = useState(false);
  const [prefetchDone, setPrefetchDone] = useState(false);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});

  const loadedImagesRef = useRef<Set<string>>(new Set());
  const totalImagesRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    if (prefetchDone && totalImagesRef.current.size === 0) {
      setIsContentReady(true);
    }
  }, [prefetchDone]);

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

  const handleUpdateQuantity = (itemName: string, itemPrice: number, change: number) => {
    const id = `mega_${itemName.replace(/\s+/g, '_')}_${itemPrice}`;
    const currentQty = getQuantity(itemName, itemPrice);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQuantity(id, currentQty + change);
  };

  const showSkeleton = !isContentReady;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {prefetchDone && campaign && (
        <View style={StyleSheet.absoluteFill}>
          <ImageBackground
            source={{ uri: campaign.pageBgImage || 'https://via.placeholder.com/800x1200' }}
            style={{ flex: 1 }}
            resizeMode="cover"
          >
            <View style={{ position: 'absolute', top: insets.top + 10, left: 16, zIndex: 50 }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}
              >
                <ArrowLeft size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

              {campaign.headingImage && (
                <Image
                  source={{ uri: campaign.headingImage }}
                  style={{ width: '100%', height: width * (2 / 3) }}
                  contentFit="cover"
                  onLoad={() => handleImageLoad(campaign.headingImage)}
                />
              )}

              {/* Category Buttons — centered on the heading image bottom edge (50% overlap) */}
              {campaign.categories && campaign.categories.length > 0 && (
                <View style={{ zIndex: 10, marginTop: -CATEGORY_OVERLAP }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                  >
                    {campaign.categories.map((cat: any, cIdx: number) => (
                      <TouchableOpacity
                        key={cIdx}
                        onPress={() => setSelectedCategoryIdx(cIdx)}
                        style={{
                          borderRadius: 12,
                          overflow: 'hidden',
                          borderWidth: 2,
                          borderColor: selectedCategoryIdx === cIdx ? '#e11d48' : 'transparent',
                          width: CATEGORY_TILE_SIZE,
                          height: CATEGORY_TILE_SIZE,
                          backgroundColor: '#fff',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.15,
                          shadowRadius: 8,
                          elevation: 5,
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
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Selected Category Items — big cards, edge-to-edge image with natural ratio */}
              {campaign.categories && campaign.categories[selectedCategoryIdx] && (
                <View style={{ paddingHorizontal: CARD_H_PADDING, marginTop: 20, gap: 20 }}>
                  {campaign.categories[selectedCategoryIdx].items?.map((item: any, iIdx: number) => {
                    const qty = getQuantity(item.name, item.price);
                    let isExpired = false;
                    if (item.orderCutoffTime) {
                      isExpired = new Date() > new Date(item.orderCutoffTime);
                    }
                    const trackLoad = selectedCategoryIdx === 0;
                    const ratio = item.image ? imageRatios[item.image] : undefined;
                    const imageHeight = ratio ? CARD_WIDTH / ratio : DEFAULT_IMAGE_HEIGHT;

                    return (
                      <View
                        key={iIdx}
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
                          <Image
                            source={{ uri: item.image }}
                            style={{ width: CARD_WIDTH, height: imageHeight }}
                            contentFit="cover"
                            onLoad={(e: any) => {
                              const src = e?.source;
                              handleImageLoad(
                                item.image,
                                src ? { width: src.width, height: src.height } : undefined
                              );
                            }}
                          />
                        )}

                        <View style={{ padding: 16, gap: 10 }}>
                          <Text style={{ fontSize: 20, fontWeight: '800', color: '#111' }}>
                            {item.name}
                          </Text>

                          {item.description ? (
                            <Text style={{ fontSize: 14, color: '#666', lineHeight: 20 }}>
                              {item.description}
                            </Text>
                          ) : null}

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {item.deliveryDate && (
                              <View style={{ backgroundColor: '#fdf2f8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ fontSize: 12, color: '#e11d48', fontWeight: '700' }}>
                                  Delivers: {new Date(item.deliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </Text>
                              </View>
                            )}
                            {item.mealType && (
                              <View style={{ backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ fontSize: 12, color: '#0369a1', fontWeight: '700' }}>{item.mealType}</Text>
                              </View>
                            )}
                          </View>

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

            </ScrollView>
          </ImageBackground>
        </View>
      )}

      {showSkeleton && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }]}>
          <View style={{ position: 'absolute', top: insets.top + 10, left: 16, zIndex: 50 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ShimmerSkeleton width="100%" height={width * (2 / 3)} borderRadius={0} />

          {/* Skeleton tabs — same 50% overlap so layout doesn't jump */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, zIndex: 10, marginTop: -CATEGORY_OVERLAP }}>
            {[...Array(5)].map((_, i) => (
              <ShimmerSkeleton key={i} width={CATEGORY_TILE_SIZE} height={CATEGORY_TILE_SIZE} borderRadius={12} />
            ))}
          </View>

          <View style={{ paddingHorizontal: CARD_H_PADDING, marginTop: 20, gap: 20 }}>
            {[...Array(2)].map((_, i) => (
              <View key={i} style={{ backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 6 }}>
                <ShimmerSkeleton width="100%" height={DEFAULT_IMAGE_HEIGHT} borderRadius={0} />
                <View style={{ padding: 16, gap: 10 }}>
                  <ShimmerSkeleton width="80%" height={22} borderRadius={4} />
                  <ShimmerSkeleton width="60%" height={14} borderRadius={4} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <ShimmerSkeleton width={90} height={22} borderRadius={6} />
                    <ShimmerSkeleton width={70} height={22} borderRadius={6} />
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
    </View>
  );
}