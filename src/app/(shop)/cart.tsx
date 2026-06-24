// src/app/(shop)/cart.tsx

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import emptyCartAnimation from '../../../assets/animations/empty-cart.json';
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react-native';
import { useCallback } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { optimizeImageUrl } from '@/lib/imageUtils';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useAlert } from '@/components/ui/CustomAlert';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PLACEHOLDER_IMAGE_URL =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore();
  const totalPrice = getTotalPrice();
  const itemCount = items.length;

  const handleQuantityChange = (id: string, newQty: number) => {
    if (newQty < 1) {
      confirmRemove(id);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      updateQuantity(id, newQty);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const confirmRemove = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    showAlert({
      title: 'Remove Item?',
      message: `Are you sure you want to remove “${item.name}” from your cart?`,
      confirmText: 'Remove',
      cancelText: 'Keep',
      confirmButtonStyle: 'destructive',
      onConfirm: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        removeItem(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  const confirmClearAll = () => {
    showAlert({
      title: 'Clear Cart?',
      message: 'All items will be permanently removed. This cannot be undone.',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      confirmButtonStyle: 'destructive',
      onConfirm: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        clearCart();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      },
    });
  };

  // সোয়াইপ করলে ছোট লাল আইকন আসবে (পুরো উচ্চতা দখল করবে না)
  const renderRightActions = (id: string) => (
    <TouchableOpacity
      onPress={() => confirmRemove(id)}
      className="items-center justify-center"
      style={{
        width: 60,               // ছোট প্রস্থ
        height: '100%',          // উচ্চতা কার্ডের মতো, কিন্তু ব্যাকগ্রাউন্ড ট্রান্সপারেন্ট
        justifyContent: 'center',
        alignItems: 'center',
      }}
      accessibilityLabel={`Delete ${items.find((i) => i.id === id)?.name}`}
      accessibilityRole="button"
    >
      <View className="w-10 h-10 bg-red-500 rounded-full items-center justify-center">
        <Trash2 size={20} color="#fff" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-white pb-2 shadow-sm"
        style={{
          paddingTop: insets.top + 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <View className="flex-row items-center px-4 py-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 bg-gray-100 rounded-full items-center justify-center mr-3"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-2xl font-extrabold text-gray-900 font-sans tracking-tight">
            Your Cart
          </Text>
          {itemCount > 0 && (
            <View className="ml-auto flex-row items-center gap-2">
              <TouchableOpacity
                onPress={confirmClearAll}
                className="bg-red-50 px-3 py-1.5 rounded-full border border-red-200"
                accessibilityLabel="Clear all items from cart"
                accessibilityRole="button"
              >
                <Text className="text-xs font-bold text-red-600">Clear All</Text>
              </TouchableOpacity>
              <View className="bg-primary/10 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-primary font-sans">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {itemCount > 0 ? (
        <>
          <ScrollView
            className="flex-1 px-4 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            {items.map((item) => {
              const rawUrl =
                (item.image && Array.isArray(item.image)
                  ? item.image[0]?.url
                  : item.image?.url) || PLACEHOLDER_IMAGE_URL;

              return (
                <Swipeable
                  key={item.id}
                  renderRightActions={() => renderRightActions(item.id)}
                  overshootRight={false}
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push(`/(shop)/menus/${item.slug}`)}
                    className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 8,
                      elevation: 3,
                      position: 'relative', // ডিলিট বাটনের জন্য প্রয়োজন
                    }}
                    accessibilityLabel={`View details of ${item.name}`}
                    accessibilityRole="button"
                  >
                    {/* ★ Top-Right Delete Button ★ */}
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation(); // কার্ডের onPress যেন ট্রিগার না হয়
                        confirmRemove(item.id);
                      }}
                      className="absolute top-3 right-3 z-10 w-8 h-8 bg-red-50 rounded-full items-center justify-center"
                      accessibilityLabel={`Delete ${item.name} from cart`}
                      accessibilityRole="button"
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>

                    <View className="flex-row">
                      <View className="h-20 w-20 rounded-xl bg-gray-100 overflow-hidden border border-gray-100 mr-4">
                        <Image
                          source={{ uri: optimizeImageUrl(rawUrl) }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                          transition={200}
                        />
                      </View>
                      <View className="flex-1 justify-between">
                        <View>
                          <Text
                            className="text-base font-bold text-gray-900 font-sans leading-snug"
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                          <Text className="text-sm font-medium text-gray-500 font-sans mt-0.5">
                            {formatPrice(item.price)} each
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between mt-3">
                          {/* Quantity Controls */}
                          <View className="flex-row items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            <TouchableOpacity
                              onPress={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="h-9 w-9 items-center justify-center bg-white"
                              accessibilityLabel={`Decrease quantity of ${item.name}`}
                              accessibilityRole="button"
                            >
                              <Minus size={18} color="#374151" />
                            </TouchableOpacity>
                            <Text className="w-10 text-center text-sm font-bold text-gray-900 font-sans">
                              {item.quantity}
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="h-9 w-9 items-center justify-center bg-white"
                              accessibilityLabel={`Increase quantity of ${item.name}`}
                              accessibilityRole="button"
                            >
                              <Plus size={18} color="#374151" />
                            </TouchableOpacity>
                          </View>
                          <Text className="text-base font-extrabold text-gray-900 font-sans">
                            {formatPrice(item.price * item.quantity)}
                          </Text>
                          {/* নিচের ডিলিট বাটন সরিয়ে দেওয়া হয়েছে */}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              );
            })}
          </ScrollView>

          {/* Floating Checkout Bar */}
          <View
            className="absolute left-4 right-4 bg-white/90 backdrop-blur-xl rounded-3xl px-5 py-4 flex-row items-center justify-between border border-white/20"
            style={{
              bottom: insets.bottom + 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 15,
            }}
          >
            <View>
              <Text className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">
                Total
              </Text>
              <Text className="text-2xl font-extrabold text-gray-900">
                {formatPrice(totalPrice)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(shop)/checkout/summary')}
              className="bg-primary flex-row items-center px-6 py-3.5 rounded-2xl shadow-lg"
              style={{
                shadowColor: '#e11d48',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 10,
              }}
              activeOpacity={0.9}
              accessibilityLabel="Proceed to checkout"
              accessibilityRole="button"
            >
              <Text className="text-white font-bold text-base mr-2">Proceed</Text>
              <ArrowRight size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Empty State */
        <View className="flex-1 bg-white justify-center items-center px-8" style={{ paddingBottom: 100 }}>
          <View className="w-64 h-64 mb-4">
            <LottieView
              source={emptyCartAnimation}
              autoPlay
              loop
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              onError={(error) => console.log('Lottie Error:', error)}
            />
          </View>
          <Text className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-sans mb-2 text-center tracking-tight">
            Your cart is empty
          </Text>
          <Text className="text-sm sm:text-base text-gray-500 font-sans text-center mb-8 leading-relaxed px-4">
            Looks like you haven't added anything yet.{'\n'}
            Let's fix that and get you some delicious food!
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(shop)/')}
            className="bg-primary w-full h-14 rounded-2xl items-center justify-center shadow-xl"
            style={{
              shadowColor: '#e11d48',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
            }}
            activeOpacity={0.85}
            accessibilityLabel="Start shopping"
            accessibilityRole="button"
          >
            <View className="flex-row items-center gap-2">
              <ShoppingBag size={20} color="#fff" />
              <Text className="text-white font-bold text-lg font-sans">
                Start Shopping
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}