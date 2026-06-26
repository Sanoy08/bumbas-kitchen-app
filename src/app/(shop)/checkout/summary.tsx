// src/app/(shop)/checkout/summary.tsx

import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Switch,
  Image,
  Animated, // ★ অ্যানিমেশনের জন্য
} from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner-native';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Coins,
  Receipt,
  ShoppingBag,
  Sparkles,
  Ticket,
  Wallet,
  X,
} from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';

export default function OrderSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, getTotalPrice, setCheckoutData, getItemCount } = useCartStore();
  const { user, isInitialized } = useAuthStore();

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useCoins, setUseCoins] = useState(false);

  // অ্যানিমেশন ভ্যালু (কয়েন সেভিংস বক্সের জন্য)
  const savingsOpacity = useRef(new Animated.Value(0)).current;
  const savingsTranslateY = useRef(new Animated.Value(-10)).current;

  const totalPrice = getTotalPrice();
  const itemCount = getItemCount();

  // Fetch wallet
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await fetch(`${API_URL}/wallet`);
        const data = await res.json();
        if (data.success && data.wallet) {
          setWalletBalance(data.wallet.balance || 0);
        } else if (data.success && data.balance) {
          setWalletBalance(data.balance);
        }
      } catch (e) {
        console.log('Wallet fetch failed', e);
      }
    };
    if (user) fetchWallet();
  }, [user]);

  // Auth & cart guard
  useEffect(() => {
    if (isInitialized) {
      if (!user) {
        toast.error('Please login to continue.');
        router.replace('/(auth)/login?redirect=/(shop)/checkout/summary');
      } else if (itemCount === 0) {
        router.replace('/(shop)/');
      }
    }
  }, [isInitialized, user, itemCount]);

  // অ্যানিমেশন কন্ট্রোল (useCoins টগল হলে)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(savingsOpacity, {
        toValue: useCoins ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(savingsTranslateY, {
        toValue: useCoins ? 0 : -10,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [useCoins, savingsOpacity, savingsTranslateY]);

  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const res = await fetch(`${API_URL}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, cartTotal: totalPrice }),
      });
      const data = await res.json();
      if (data.success) {
        setCouponDiscount(data.coupon.discountAmount);
        if (useCoins) {
          setUseCoins(false);
          toast.info('Coins removed. You can use either Coupon OR Coins.');
        }
        toast.success(`YAY! You saved ${formatPrice(data.coupon.discountAmount)}`);
      } else {
        setCouponDiscount(0);
        toast.error(data.error || 'Invalid Coupon');
      }
    } catch (error) {
      toast.error('Failed to apply coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCoinToggle = (checked: boolean) => {
    if (checked) {
      if (couponDiscount > 0) {
        removeCoupon();
        toast.info('Coupon removed. You can use either Coupon OR Coins.');
      }
      setUseCoins(true);
    } else {
      setUseCoins(false);
    }
  };

  const maxCoinDiscount = totalPrice * 0.5;
  const coinDiscountAmount = useCoins ? Math.min(walletBalance, Math.floor(maxCoinDiscount)) : 0;
  const finalTotal = Math.max(0, totalPrice - couponDiscount - coinDiscountAmount);

  const handleProceed = () => {
    setCheckoutData({
      couponCode: couponDiscount > 0 ? couponCode : '',
      couponDiscount,
      useCoins,
    });
    router.push('/checkout');
  };

  if (!isInitialized)
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Progress Steps */}
      <View className="bg-white border-b border-gray-200 py-4">
        <View className="flex-row items-center justify-center gap-2">
          <View className="flex-row items-center gap-1">
            <Check size={14} color="#16a34a" />
            <Text className="text-xs font-medium text-green-600">Cart</Text>
          </View>
          <View className="w-8 h-px bg-gray-300" />
          <View className="flex-row items-center gap-1">
            <ShoppingBag size={14} color="#e11d48" />
            <Text className="text-xs font-bold text-primary">Summary</Text>
          </View>
          <View className="w-8 h-px bg-gray-300" />
          <Text className="text-xs font-medium text-gray-400">Payment</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text className="text-2xl font-extrabold text-gray-900 mt-6 mb-6">
          Order Summary
        </Text>

        {/* ─── ★ UPGRADED COIN CARD ★ ─── */}
        <View className="mb-5 rounded-2xl overflow-hidden shadow-xl">
          <LinearGradient
            colors={['#f59e0b', '#f97316', '#dc2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            {/* Background glow effect */}
            <View className="absolute top-0 right-0 w-32 h-32 bg-yellow-300/30 rounded-full -mt-10 -mr-10" />
            <View className="absolute bottom-0 left-0 w-24 h-24 bg-rose-400/20 rounded-full -mb-8 -ml-8" />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-4">
                {/* Coin icon with glow ring */}
                <View className="relative">
                  <View className="absolute -inset-2 bg-yellow-300/30 rounded-full blur-sm" />
                  <View className="h-14 w-14 bg-white/20 rounded-full items-center justify-center border-2 border-white/40">
                    <Coins size={30} color="#fff" />
                  </View>
                  <Sparkles
                    size={16}
                    color="#fef08a"
                    style={{ position: 'absolute', top: -4, right: -4 }}
                  />
                </View>

                <View>
                  <Text className="text-white font-extrabold text-xl tracking-tight">
                    Bumba Coins
                  </Text>
                  <View className="flex-row items-baseline gap-1 mt-0.5">
                    <Text className="text-yellow-200 text-lg font-bold">
                      {walletBalance}
                    </Text>
                    <Text className="text-yellow-200/80 text-xs font-medium">
                      COINS
                    </Text>
                  </View>
                </View>
              </View>

              {/* Custom styled toggle */}
              <View className="bg-black/20 p-0.5 rounded-full">
                <Switch
                  value={useCoins}
                  onValueChange={handleCoinToggle}
                  trackColor={{ false: '#ffffff30', true: '#ffffff90' }}
                  thumbColor={useCoins ? '#fbbf24' : '#f3f4f6'}
                  ios_backgroundColor="#ffffff20"
                />
              </View>
            </View>

            {/* Animated Savings Box */}
            <Animated.View
              style={{
                opacity: savingsOpacity,
                transform: [{ translateY: savingsTranslateY }],
              }}
              className="mt-4 pt-4 border-t border-white/20"
            >
              {useCoins ? (
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-2">
                    <View className="bg-white/20 rounded-full p-1">
                      <Sparkles size={14} color="#fef08a" />
                    </View>
                    <Text className="text-white font-semibold text-sm">
                      Coin Discount Applied
                    </Text>
                  </View>
                  <View className="bg-white/20 px-3 py-1 rounded-full">
                    <Text className="text-white font-extrabold text-lg">
                      - {formatPrice(coinDiscountAmount)}
                    </Text>
                  </View>
                </View>
              ) : walletBalance === 0 ? (
                <Text className="text-white/70 text-xs text-center">
                  You have 0 coins. Place orders to earn!
                </Text>
              ) : (
                <Text className="text-white/50 text-xs text-center">
                  Toggle to use your coins
                </Text>
              )}
            </Animated.View>
          </LinearGradient>
        </View>

        {/* ─── COUPON CARD ─── */}
        <View className="mb-5 bg-white rounded-xl border-2 border-dashed border-gray-200 overflow-hidden">
          <View className="p-5">
            <View className="flex-row items-center gap-2 mb-3">
              <Ticket size={18} color="#e11d48" />
              <Text className="font-bold text-gray-800">Apply Coupon</Text>
            </View>
            {couponDiscount > 0 ? (
              <View className="bg-green-50 border border-green-200 rounded-lg p-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <CheckCircle2 size={18} color="#16a34a" />
                  <View>
                    <Text className="font-bold text-green-800 text-sm">
                      '{couponCode}' Applied
                    </Text>
                    <Text className="text-xs text-green-600">
                      You saved {formatPrice(couponDiscount)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => { removeCoupon(); toast.info('Coupon removed'); }}>
                  <X size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row gap-2">
                <TextInput
                  placeholder="Enter Coupon Code"
                  placeholderTextColor="#9ca3af"
                  value={couponCode}
                  onChangeText={(text) => setCouponCode(text.toUpperCase())}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-medium uppercase tracking-widest text-sm"
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  onPress={handleApplyCoupon}
                  disabled={isApplyingCoupon || !couponCode}
                  className="bg-primary h-11 px-5 rounded-lg items-center justify-center shadow-sm"
                  activeOpacity={0.8}
                >
                  {isApplyingCoupon ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-sm">APPLY</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Items List (fixed icon+text) */}
        <View className="mb-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <ShoppingBag size={18} color="#6b7280" />
              <Text className="font-bold text-lg text-gray-800">Items in Cart</Text>
            </View>
            <Text className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md font-medium">
              {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
            </Text>
          </View>

          {items.map((item) => {
            const imageSrc =
              (item.image && Array.isArray(item.image) ? item.image[0]?.url : item.image?.url) ||
              PLACEHOLDER_IMAGE_URL;
            return (
              <View key={item.id} className="flex-row items-center gap-3 mb-3 last:mb-0">
                <View className="h-14 w-14 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                  <Image
                    source={{ uri: imageSrc }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-semibold text-sm text-gray-800 truncate">{item.name}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    Qty: {item.quantity} × {formatPrice(item.price)}
                  </Text>
                </View>
                <Text className="font-bold text-sm text-gray-900">
                  {formatPrice(item.price * item.quantity)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Bill Summary (fixed icons) */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden mb-6">
          <View className="bg-gray-900 px-5 py-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Receipt size={16} color="#9ca3af" />
              <Text className="font-bold text-white tracking-wide text-sm">BILL SUMMARY</Text>
            </View>
            <Text className="text-xs text-gray-400 font-mono">
              {new Date().toLocaleDateString()}
            </Text>
          </View>

          <View className="p-5 space-y-4">
            <View className="flex-row justify-between">
              <Text className="text-gray-600 text-sm">Item Total</Text>
              <Text className="font-medium text-gray-900">{formatPrice(totalPrice)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 text-sm">Delivery Fee</Text>
              <Text className="text-green-600 font-bold">FREE</Text>
            </View>

            {(couponDiscount > 0 || (useCoins && coinDiscountAmount > 0)) && (
              <View className="bg-green-50 rounded-lg p-3 space-y-2 border border-green-100">
                {couponDiscount > 0 && (
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-1">
                      <Ticket size={14} color="#16a34a" />
                      <Text className="text-green-700 text-sm font-medium">Coupon Savings</Text>
                    </View>
                    <Text className="text-green-700 text-sm font-medium">
                      - {formatPrice(couponDiscount)}
                    </Text>
                  </View>
                )}
                {useCoins && coinDiscountAmount > 0 && (
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-1">
                      <Coins size={14} color="#d97706" />
                      <Text className="text-amber-700 text-sm font-medium">Coin Savings</Text>
                    </View>
                    <Text className="text-amber-700 text-sm font-medium">
                      - {formatPrice(coinDiscountAmount)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View className="border-t border-dashed border-gray-200 pt-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-bold text-gray-900">To Pay</Text>
                <Text className="text-2xl font-extrabold text-primary">{formatPrice(finalTotal)}</Text>
              </View>
              <Text className="text-[10px] text-right text-gray-400 uppercase tracking-wider mt-1">
                Inclusive of all taxes
              </Text>
            </View>
          </View>
        </View>

        {/* Proceed Button */}
        <TouchableOpacity
          onPress={handleProceed}
          className="bg-primary h-14 rounded-2xl flex-row items-center justify-between px-6 mb-2 shadow-xl"
          activeOpacity={0.9}
        >
          <Text className="text-white font-bold text-lg">Proceed to Pay</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-white font-bold">{formatPrice(finalTotal)}</Text>
            <ArrowRight size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        <View className="flex-row justify-center items-center gap-4 mt-6 mb-4 opacity-70">
          <View className="flex-row items-center gap-1">
            <Wallet size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-400">100% Secure</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <CheckCircle2 size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-400">Trusted</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}