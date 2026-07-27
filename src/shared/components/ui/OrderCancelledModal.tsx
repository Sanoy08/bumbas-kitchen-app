import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  TouchableOpacity,
  Modal, 
  Animated, 
  Dimensions, 
  PanResponder, 
  StyleSheet, 
  Easing,
  Linking
} from 'react-native';
import { X, HeadphonesIcon, Info } from 'lucide-react-native';
import LottieView from 'lottie-react-native';

const { height } = Dimensions.get('window');

type OrderCancelledModalProps = {
  visible: boolean;
  notification: any | null;
  onClose: () => void;
};

export function OrderCancelledModal({ visible, notification, onClose }: OrderCancelledModalProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 26,
          stiffness: 220,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      slideAnim.setValue(height);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      onClose();
      slideAnim.setValue(height);
      fadeAnim.setValue(0);
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
          handleClose();
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

  if (!visible) return null;

  const getOrderId = () => {
    if (!notification || !notification.message) return null;
    const match = notification.message.match(/#(BK-[A-Z0-9]+)/i);
    return match ? match[1] : null;
  };

  const orderId = getOrderId();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)', opacity: fadeAnim }]} className="justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View 
          className="w-full flex-1 justify-end"
          style={{ transform: [{ translateY: slideAnim }], maxHeight: height * 0.9 }}
        >
          {/* Floating Close Button exactly outside the top */}
          <View className="items-center mb-4">
            <TouchableOpacity 
              onPress={handleClose} 
              activeOpacity={0.7}
              style={{ backgroundColor: '#000000', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
              className="shadow-2xl border-2 border-white/20"
            >
              <X size={28} color="white" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-t-[32px] px-6 pb-8 shadow-2xl flex-shrink">
            {/* Drag Handle for Swipe Down */}
            <View {...panResponder.panHandlers} className="w-full pt-4 pb-6 items-center">
              <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </View>

            {/* Header Lottie Animation */}
            <View className="items-center mb-6 mt-0">
              <LottieView
                source={require('@/../assets/animations/sorry.json')}
                autoPlay
                loop
                style={{ width: 110, height: 110, marginBottom: -5 }}
              />
              <Text className="text-[26px] font-bold text-gray-900 text-center font-sans tracking-tight mb-2">
                Order Cancelled
              </Text>
              
              <Text className="text-[15px] text-gray-500 text-center font-sans px-4 leading-6">
                We're really sorry! Your recent order couldn't be fulfilled and was cancelled by the restaurant.
              </Text>
            </View>

            {/* Details Box - Themed */}
            <View className="bg-red-50/40 border border-red-100/60 rounded-3xl p-5 mb-8">
              {orderId && (
                <View className="mb-4">
                  <Text className="text-[11px] font-bold text-primary uppercase mb-2 font-sans tracking-widest">
                    Order ID
                  </Text>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-primary mr-2.5" />
                    <Text className="text-[16px] text-gray-900 font-sans font-bold tracking-wide" numberOfLines={1}>
                      {orderId}
                    </Text>
                  </View>
                </View>
              )}
              
              {orderId && <View className="h-[1px] w-full bg-red-100 mb-4" />}

              <View>
                <View className="flex-row items-start">
                  <Info size={18} color="#e11d48" className="mt-0.5 mr-2.5" />
                  <Text className="text-[13.5px] font-medium text-gray-700 font-sans flex-1 leading-5">
                    If you paid online, the full amount will be <Text className="font-bold text-primary">refunded automatically</Text> very soon.
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View className="flex-row gap-4">
              <Pressable 
                onPress={() => Linking.openURL('tel:8240690254')} 
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                className="flex-[1] py-4 rounded-[18px] bg-white items-center justify-center border-2 border-gray-100 flex-row shadow-sm shadow-gray-100"
              >
                <HeadphonesIcon size={20} color="#4b5563" className="mr-2" />
                <Text className="text-gray-700 font-bold font-sans text-[15.5px]">Support</Text>
              </Pressable>
              
              <Pressable 
                onPress={handleClose}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                className="flex-[1.5] py-4 rounded-[18px] bg-primary items-center justify-center shadow-lg shadow-primary/30"
              >
                <Text className="text-white font-bold font-sans text-[15.5px]">I Understand</Text>
              </Pressable>
            </View>

          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
