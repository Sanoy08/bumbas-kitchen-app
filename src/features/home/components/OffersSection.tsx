// src/features/home/components/OffersSection.tsx
import { useEffect, useState, useRef } from 'react';
import { Image, ScrollView, View, TouchableOpacity, Text, Dimensions, Modal, Animated, StyleSheet, Pressable, PanResponder, Easing } from 'react-native';
import { X, ShoppingCart, Clock } from 'lucide-react-native';
import { useCartStore } from '@/shared/store/cartStore';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { format } from 'date-fns';
import { useAlert } from '@/shared/components/ui';
import { SectionHeading } from './SectionHeading';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = width - 32; // 16px padding on left and right

interface Offer {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  isSpecialOffer?: boolean;
  deliveryDate?: string;
  orderCutoffTime?: string;
  mealType?: string;
}

const OfferImage = ({ uri, width }: { uri: string; width: number }) => {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  useEffect(() => {
    if (uri) {
      Image.getSize(
        uri,
        (w, h) => {
          if (w && h) setAspectRatio(w / h);
        },
        () => {} // Handle failure silently
      );
    }
  }, [uri]);

  return (
    <Image 
      source={{ uri }} 
      style={{ width, aspectRatio, resizeMode: 'cover' }}
    />
  );
};

interface OffersSectionProps {
  offers: Offer[];
}

export const OffersSection = ({ offers }: OffersSectionProps) => {
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const addItem = useCartStore((state) => state.addItem);
  const { showAlert } = useAlert();

  const openModal = (offer: Offer) => {
    setSelectedOffer(offer);
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 26,
      stiffness: 220,
      mass: 1,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setSelectedOffer(null);
      slideAnim.setValue(height);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          closeModal();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            damping: 26,
            stiffness: 220,
            mass: 1,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleAddToCart = () => {
    if (selectedOffer) {
      if (selectedOffer.orderCutoffTime && new Date() > new Date(selectedOffer.orderCutoffTime)) {
        showAlert({
          title: "Time Limit Exceeded",
          message: 'The order deadline for this special offer has passed.',
          cancelText: ""
        });
        return;
      }
      const cartProduct = {
        id: selectedOffer.id,
        name: selectedOffer.title || 'Special Offer',
        slug: selectedOffer.title?.toLowerCase().replace(/\s+/g, '-') || 'special-offer',
        description: selectedOffer.description,
        price: selectedOffer.price,
        image: { id: selectedOffer.id, url: selectedOffer.imageUrl, alt: selectedOffer.title },
        category: { id: 'special', name: 'Special Offers' },
        images: [{ id: selectedOffer.id, url: selectedOffer.imageUrl, alt: selectedOffer.title }],
        rating: 5,
        reviewCount: 0,
        stock: 999,
        reviews: [],
        featured: false,
        isSpecialOffer: true,
        deliveryDate: selectedOffer.deliveryDate,
        orderCutoffTime: selectedOffer.orderCutoffTime,
        mealType: selectedOffer.mealType
      };

      addItem(cartProduct, 1, true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
    }
  };

  if (!offers || offers.length === 0) return null;

  return (
    <View className="px-4 py-8">
      <SectionHeading title="Special Offers" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled>
        {offers.map((offer, index) => (
          <TouchableOpacity 
            key={offer.id} 
            activeOpacity={0.9}
            onPress={() => openModal(offer)}
            style={{ 
              width: ITEM_WIDTH,
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: '#f3f4f6'
            }}
          >
            <OfferImage uri={offer.imageUrl} width={ITEM_WIDTH} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Sheet Modal */}
      <Modal visible={!!selectedOffer} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-end">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          
          <Animated.View 
            className="w-full flex-1 justify-end"
            style={{ transform: [{ translateY: slideAnim }], maxHeight: height * 0.88 }}
          >
            {/* Floating Close Button exactly outside the top */}
            <View className="items-center mb-4">
              <TouchableOpacity 
                onPress={closeModal} 
                activeOpacity={0.7}
                style={{ backgroundColor: '#000000', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
                className="shadow-2xl border-2 border-white/20"
              >
                <X size={28} color="white" />
              </TouchableOpacity>
            </View>

            <View className="bg-white rounded-t-[32px] px-6 pb-8 shadow-2xl flex-shrink">
              {/* Drag Handle for Swipe Down */}
              <View {...panResponder.panHandlers} className="w-full pt-4 pb-6 items-center">
                <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {selectedOffer && (
                <>
                  <View className="w-full rounded-2xl overflow-hidden bg-gray-100 mb-6 shadow-sm">
                    <OfferImage uri={selectedOffer.imageUrl} width={width - 48} />
                  </View>
                  
                  {selectedOffer.isSpecialOffer && (
                    <View className="flex-row items-center gap-2 mb-3 bg-amber-50 self-start px-4 py-1.5 rounded-full border border-amber-200 shadow-sm">
                      <Clock size={16} color="#d97706" />
                      <Text className="text-amber-700 font-bold text-xs uppercase tracking-widest">
                        {selectedOffer.orderCutoffTime 
                          ? `Closes ${format(new Date(selectedOffer.orderCutoffTime), 'MMM d, h:mm a')}`
                          : 'Limited Edition'}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row justify-between items-start mb-3">
                    <Text className="text-3xl font-extrabold text-gray-900 font-sans flex-1 tracking-tight leading-tight">
                      {selectedOffer.title || 'Exclusive Offer'}
                    </Text>
                    {selectedOffer.price ? (
                      <Text className="text-3xl font-black text-primary font-sans ml-4">
                        ₹{selectedOffer.price}
                      </Text>
                    ) : null}
                  </View>
                  
                  {selectedOffer.deliveryDate && (
                    <View className="flex-row items-center gap-2 mb-3">
                      <View className="w-2 h-2 rounded-full bg-red-500" />
                      <Text className="text-sm font-bold text-gray-700 font-sans">
                        Delivery on <Text className="text-red-600">{format(new Date(selectedOffer.deliveryDate), 'EEEE, MMMM d, yyyy')}</Text>
                      </Text>
                    </View>
                  )}
                  
                  {selectedOffer.mealType && selectedOffer.mealType !== 'both' && (
                    <View className="self-start bg-primary/10 px-3 py-1 rounded-md mb-5">
                      <Text className="text-xs font-bold text-primary font-sans uppercase tracking-widest">
                        Available for {selectedOffer.mealType}
                      </Text>
                    </View>
                  )}

                  <Text className="text-base text-gray-600 leading-relaxed font-sans mb-4">
                    {selectedOffer.description}
                  </Text>
                </>
              )}
            </ScrollView>

            {/* Add to Cart Button */}
            {selectedOffer?.isSpecialOffer && (
              <TouchableOpacity 
                onPress={handleAddToCart}
                activeOpacity={0.9}
                className="bg-primary flex-row items-center justify-center py-4 px-6 rounded-2xl shadow-lg shadow-primary/40 mt-2"
              >
                <ShoppingCart size={22} color="white" className="mr-3" />
                <Text className="text-white font-black text-lg font-sans tracking-wide">
                  PRE-ORDER NOW
                </Text>
              </TouchableOpacity>
            )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};
