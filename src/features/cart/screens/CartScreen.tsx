// src/app/(shop)/cart.tsx
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { FlatList, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import emptyCartAnimation from '../../../../assets/animations/empty-cart.json';

import { useAlert } from '@/shared/components/ui';
import { optimizeImageUrl } from '@/shared/utils/imageUtils';
import { formatPrice } from '@/shared/utils/utils';
import { useCartStore } from '@/shared/store/cartStore';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
}

const LOTTIE_PLACEHOLDER = require('@/assets/animations/Image-Loading.json');

// ---------------------- Cart Item Component ----------------------
type CartItemProps = {
  item: any;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, newQty: number) => void;
  simultaneousHandlers?: React.Ref<any>;
  isRemoving?: boolean;
};

const CartItem = React.memo(
  ({ item, onRemove, onQuantityChange, simultaneousHandlers, isRemoving }: CartItemProps) => {
    const router = useRouter();
    const swipeableRef = useRef<Swipeable>(null);
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    useEffect(() => {
      if (isRemoving) {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }, [isRemoving, opacity]);

    const handleQuantityChange = useCallback(
      (newQty: number) => {
        if (newQty < 1) {
          onRemove(item.id);
        } else {
          onQuantityChange(item.id, newQty);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      [item.id, onRemove, onQuantityChange]
    );

    const handleDelete = useCallback(() => {
      onRemove(item.id);
    }, [item.id, onRemove]);

    const handleSwipeOpen = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [scaleAnim]);

    const handleSwipeClose = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 0.8,
        friction: 4,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    const renderLeftActions = useCallback(
      (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const scale = dragX.interpolate({
          inputRange: [0, 60],
          outputRange: [0.8, 1],
          extrapolate: 'clamp',
        });
        return (
          <TouchableOpacity
            onPress={handleDelete}
            style={{ width: 60, height: '100%', justifyContent: 'center', alignItems: 'center' }}
            accessibilityLabel={`Delete ${item.name}`}
            accessibilityRole="button"
          >
            <Animated.View
              className="w-10 h-10 bg-red-500 rounded-full items-center justify-center"
              style={{ transform: [{ scale }] }}
            >
              <Trash2 size={20} color="#fff" />
            </Animated.View>
          </TouchableOpacity>
        );
      },
      [handleDelete, item.name]
    );

    const rawUrl =
      (item.image && Array.isArray(item.image)
        ? item.image[0]?.url
        : item.image?.url);

    return (
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        overshootLeft={false}
        friction={2}
        onSwipeableOpen={handleSwipeOpen}
        onSwipeableClose={handleSwipeClose}
        simultaneousHandlers={simultaneousHandlers}
      >
        <Animated.View style={{ opacity }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push(`/menus/${item.slug}`)}
            className="bg-white rounded-2xl p-4 mb-4 border border-gray-100"
            accessibilityLabel={`View details of ${item.name}`}
            accessibilityRole="button"
            disabled={isRemoving}
          >
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 10,
              }}
              accessibilityLabel={`Delete ${item.name} from cart`}
              accessibilityRole="button"
              disabled={isRemoving}
            >
              <View className="w-9 h-9 bg-red-50 rounded-full items-center justify-center border border-red-200">
                <Trash2 size={17} color="#ef4444" />
              </View>
            </TouchableOpacity>

            <View className="flex-row">
              <View className="h-20 w-20 rounded-xl bg-gray-100 overflow-hidden border border-gray-100 mr-4">
                {!rawUrl ? (
                  <LottieView
                    source={LOTTIE_PLACEHOLDER}
                    autoPlay
                    loop
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <View style={{ width: '100%', height: '100%' }}>
                    {!isImageLoaded && (
                      <LottieView
                        source={LOTTIE_PLACEHOLDER}
                        autoPlay
                        loop
                        style={{ width: '100%', height: '100%', position: 'absolute' }}
                      />
                    )}
                    <Image
                      source={{ uri: optimizeImageUrl(rawUrl, 200, 200) }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                      onLoad={() => setIsImageLoaded(true)}
                    />
                  </View>
                )}
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
                  <View className="flex-row items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    <TouchableOpacity
                      onPress={() => handleQuantityChange(item.quantity - 1)}
                      className="h-9 w-9 items-center justify-center bg-white"
                      accessibilityLabel={`Decrease quantity of ${item.name}`}
                      accessibilityRole="button"
                      disabled={isRemoving}
                    >
                      <Minus size={18} color="#374151" />
                    </TouchableOpacity>
                    <Text className="w-10 text-center text-sm font-bold text-gray-900 font-sans">
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleQuantityChange(item.quantity + 1)}
                      className="h-9 w-9 items-center justify-center bg-white"
                      accessibilityLabel={`Increase quantity of ${item.name}`}
                      accessibilityRole="button"
                      disabled={isRemoving}
                    >
                      <Plus size={18} color="#374151" />
                    </TouchableOpacity>
                  </View>
                  <Text className="text-base font-extrabold text-gray-900 font-sans">
                    {formatPrice(item.price * item.quantity)}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Swipeable>
    );
  }
);

// ---------------------- Main Cart Screen ----------------------
export function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const scrollIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const isScrollIndicatorVisible = useRef(false);
  const listHeight = useRef(0);

  const checkScrollability = useCallback((contentHeight: number, layoutHeight: number, offsetY: number) => {
    const isScrollable = contentHeight > layoutHeight + 10;
    const isBottom = layoutHeight + offsetY >= contentHeight - 20;

    if (isScrollable && !isBottom) {
      if (!isScrollIndicatorVisible.current) {
        isScrollIndicatorVisible.current = true;
        Animated.timing(scrollIndicatorOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else {
      if (isScrollIndicatorVisible.current) {
        isScrollIndicatorVisible.current = false;
        Animated.timing(scrollIndicatorOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [scrollIndicatorOpacity]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    checkScrollability(contentSize.height, layoutMeasurement.height, contentOffset.y);
  }, [checkScrollability]);

  const handleContentSizeChange = useCallback((w: number, h: number) => {
    checkScrollability(h, listHeight.current, 0);
  }, [checkScrollability]);

  // ★ Calculate total directly to ensure 100% reactivity
  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0);
  }, [items]);

  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const flatListRef = useRef<FlatList>(null);

  const handleQuantityChange = useCallback(
    (id: string, newQty: number) => {
      updateQuantity(id, newQty);
    },
    [updateQuantity]
  );

  const handleAnimatedRemove = useCallback(
    (id: string) => {
      if (removingIds.includes(id)) return;

      setRemovingIds((prev) => [...prev, id]);

      setTimeout(() => {
        LayoutAnimation.configureNext({
          duration: 350,
          update: {
            type: LayoutAnimation.Types.easeInEaseOut,
            property: LayoutAnimation.Properties.opacity,
          },
        });
        removeItem(id);
        setRemovingIds((prev) => prev.filter((x) => x !== id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 320);
    },
    [removeItem, removingIds]
  );

  const confirmRemove = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      showAlert({
        title: 'Remove Item?',
        message: `Are you sure you want to remove “${item.name}” from your cart?`,
        confirmText: 'Remove',
        cancelText: 'Keep',
        confirmButtonStyle: 'destructive',
        onConfirm: () => {
          handleAnimatedRemove(id);
        },
      });
    },
    [items, handleAnimatedRemove, showAlert]
  );

  const confirmClearAll = useCallback(() => {
    showAlert({
      title: 'Clear Cart?',
      message: 'All items will be permanently removed. This cannot be undone.',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      confirmButtonStyle: 'destructive',
      onConfirm: () => {
        clearCart();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      },
    });
  }, [clearCart, showAlert]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      // 👇 আইটেমের চারপাশে px-4 দেওয়া হচ্ছে, যাতে স্পেসিং ঠিক থাকে
      <View className="px-4">
        <CartItem
          item={item}
          onRemove={confirmRemove}
          onQuantityChange={handleQuantityChange}
          simultaneousHandlers={flatListRef}
          isRemoving={removingIds.includes(item.id)}
        />
      </View>
    ),
    [confirmRemove, handleQuantityChange, removingIds]
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  const ListFooter = () => (
    <View
      className="bg-white pt-4 pb-8 border-t border-gray-100"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 5,
      }}
    >
      <View className="flex-row items-center justify-between px-5">
        <View>
          <Text className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">
            Total
          </Text>
          <Text className="text-2xl font-extrabold text-gray-900">
            {formatPrice(totalPrice)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(checkout)/summary');
          }}
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
    </View>
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
          <FlatList
            ref={flatListRef}
            data={items}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            className="flex-1 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            onLayout={(e) => {
              listHeight.current = e.nativeEvent.layout.height;
            }}
            onContentSizeChange={handleContentSizeChange}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          />
          
          <Animated.View 
            style={{
              position: 'absolute',
              bottom: 100,
              alignSelf: 'center',
              backgroundColor: 'rgba(255,255,255,0.95)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 5,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#ffe4e6',
              opacity: scrollIndicatorOpacity
            }}
            pointerEvents="none"
          >
            <Text className="text-primary font-bold text-xs mr-1">Scroll for more items</Text>
            <ArrowDown size={14} color="#e11d48" />
          </Animated.View>

          <ListFooter />
        </>
      ) : (
        <View
          className="flex-1 bg-white justify-center items-center px-8"
          style={{ paddingBottom: 20 }}
        >
          <View className="w-64 h-64 mb-4">
            <LottieView
              source={emptyCartAnimation}
              autoPlay
              loop
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              
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
            onPress={() => router.push('/')}
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