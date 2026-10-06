import React, { useMemo } from 'react';
import { View, Text, ScrollView, ImageBackground, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Minus, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '@/shared/store/cartStore';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function MegaCampaignScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
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

  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  if (!campaign) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Error loading campaign data.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 10, backgroundColor: '#e11d48', borderRadius: 8 }}>
          <Text style={{ color: 'white' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleAddToCart = (item: any) => {
    // Check order cutoff time
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
      mealType: item.mealType
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

  return (
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
          />
        )}

        <View style={{ paddingHorizontal: 16, marginTop: 20, gap: 30 }}>
          {campaign.categories?.map((cat: any, cIdx: number) => (
            <View key={cIdx} style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
              
              {cat.image && (
                <Image 
                  source={{ uri: cat.image }} 
                  style={{ width: '100%', height: 120 }}
                  contentFit="cover"
                />
              )}

              <View style={{ padding: 16, gap: 16 }}>
                {cat.items?.map((item: any, iIdx: number) => {
                  const qty = getQuantity(item.name, item.price);
                  let isExpired = false;
                  if (item.orderCutoffTime) {
                    isExpired = new Date() > new Date(item.orderCutoffTime);
                  }

                  return (
                    <View key={iIdx} style={{ flexDirection: 'row', gap: 12, borderBottomWidth: iIdx === cat.items.length - 1 ? 0 : 1, borderBottomColor: '#eee', paddingBottom: iIdx === cat.items.length - 1 ? 0 : 16 }}>
                      {item.image && (
                        <Image 
                          source={{ uri: item.image }} 
                          style={{ width: 90, height: 90, borderRadius: 12 }}
                          contentFit="cover"
                        />
                      )}
                      
                      <View style={{ flex: 1, justifyContent: 'space-between' }}>
                        <View>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{item.name}</Text>
                          {item.description ? (
                            <Text style={{ fontSize: 13, color: '#666', marginTop: 4 }} numberOfLines={2}>{item.description}</Text>
                          ) : null}
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                            {item.deliveryDate && (
                              <View style={{ backgroundColor: '#fdf2f8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10, color: '#e11d48', fontWeight: '600' }}>
                                  Delivers: {new Date(item.deliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </Text>
                              </View>
                            )}
                            {item.mealType && (
                              <View style={{ backgroundColor: '#f0f9ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10, color: '#0369a1', fontWeight: '600' }}>{item.mealType}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#e11d48' }}>₹{item.price}</Text>
                          
                          {isExpired ? (
                            <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                              <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '600' }}>Closed</Text>
                            </View>
                          ) : (
                            qty > 0 ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e11d48', borderRadius: 20 }}>
                                <TouchableOpacity onPress={() => handleUpdateQuantity(item.name, item.price, -1)} style={{ padding: 8 }}>
                                  <Minus size={16} color="white" />
                                </TouchableOpacity>
                                <Text style={{ color: 'white', fontWeight: '700', marginHorizontal: 8 }}>{qty}</Text>
                                <TouchableOpacity onPress={() => handleUpdateQuantity(item.name, item.price, 1)} style={{ padding: 8 }}>
                                  <Plus size={16} color="white" />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity 
                                onPress={() => handleAddToCart(item)}
                                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e11d48', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 }}
                              >
                                <Text style={{ color: '#e11d48', fontWeight: '700', fontSize: 13 }}>ADD</Text>
                              </TouchableOpacity>
                            )
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </ImageBackground>
  );
}
