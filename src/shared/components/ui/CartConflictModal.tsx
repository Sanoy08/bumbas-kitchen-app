import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  Animated, 
  Dimensions, 
  PanResponder, 
  StyleSheet, 
  Pressable,
  Easing
} from 'react-native';
import { Clock, X } from 'lucide-react-native';
import { useCartStore } from '@/shared/store/cartStore';

const { height } = Dimensions.get('window');

export function CartConflictModal() {
  const pendingProduct = useCartStore((state) => state.pendingConflictProduct);
  const resolveConflict = useCartStore((state) => state.resolveConflict);
  const existingItems = useCartStore((state) => state.items);
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const isVisible = !!pendingProduct;

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 26,
        stiffness: 220,
        mass: 1,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(height);
    }
  }, [isVisible, slideAnim]);

  const closeModal = (confirm: boolean) => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      resolveConflict(confirm);
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
          closeModal(false);
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

  if (!isVisible) return null;

  // Find the existing offer to show its details in the warning
  const existingOffer = existingItems.find(i => i.isSpecialOffer);
  
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => closeModal(false)}
    >
      <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeModal(false)} />

        <Animated.View 
          className="w-full flex-1 justify-end"
          style={{ transform: [{ translateY: slideAnim }], maxHeight: height * 0.88 }}
        >
          {/* Floating Close Button exactly outside the top */}
          <View className="items-center mb-4">
            <TouchableOpacity 
              onPress={() => closeModal(false)} 
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

            <View className="items-center mb-5">
              <View className="w-16 h-16 bg-orange-50 rounded-full items-center justify-center mb-4 relative">
                <Clock size={28} color="#ea580c" />
              </View>
              <Text className="text-xl font-black text-gray-900 text-center font-sans mb-1 tracking-tight">
                Different Time Slot
              </Text>
              <Text className="text-sm text-gray-500 text-center font-sans px-4">
                You can only order offers for one time slot at a time. Do you want to replace your previous offer?
              </Text>
            </View>

            <View className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-8">
              {existingOffer && (
                <View className="mb-4">
                  <Text className="text-[11px] font-bold text-gray-400 uppercase mb-2 font-sans tracking-widest">
                    Already in Cart
                  </Text>
                  <View className="flex-row items-center">
                    <View className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2" />
                    <Text className="text-sm text-gray-700 font-sans flex-1 font-medium" numberOfLines={1}>
                      {existingOffer.name} <Text className="font-bold">({existingOffer.mealType} • {existingOffer.deliveryDate})</Text>
                    </Text>
                  </View>
                </View>
              )}
              
              <View className="h-[1px] w-full bg-gray-200 mb-4" />

              <View>
                <Text className="text-[11px] font-bold text-primary uppercase mb-2 font-sans tracking-widest">
                  You are adding
                </Text>
                <View className="flex-row items-center">
                  <View className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  <Text className="text-sm font-bold text-gray-900 font-sans flex-1" numberOfLines={1}>
                    {pendingProduct?.name} <Text className="text-primary">({pendingProduct?.mealType} • {pendingProduct?.deliveryDate})</Text>
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => closeModal(false)}
                activeOpacity={0.8}
                className="flex-1 py-4 rounded-xl bg-gray-100 items-center justify-center border border-gray-200"
              >
                <Text className="text-gray-700 font-bold font-sans text-[15px]">Keep Old Offer</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => closeModal(true)}
                activeOpacity={0.8}
                className="flex-1 py-4 rounded-xl bg-primary items-center justify-center shadow-sm"
              >
                <Text className="text-white font-bold font-sans text-[15px]">Replace Offer</Text>
              </TouchableOpacity>
            </View>

          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
