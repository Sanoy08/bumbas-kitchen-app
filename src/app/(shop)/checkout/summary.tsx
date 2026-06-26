// src/app/(shop)/checkout/summary.tsx

import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Coins,
  MapPin,
  Receipt,
  ShoppingBag,
  Sparkles,
  Ticket,
  Wallet,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

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

  const totalPrice = getTotalPrice();
  const itemCount = getItemCount();

  // অ্যানিমেশন ভ্যালু (কয়েন সেভিংস বক্সের জন্য)
  const savingsOpacity = useRef(new Animated.Value(0)).current;
  const savingsTranslateY = useRef(new Animated.Value(-10)).current;

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

  // Cart empty guard
  if (isInitialized) {
    if (itemCount === 0) {
      return <Redirect href="/(shop)/" />;
    }
  }

  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success(`YAY! You saved ${formatPrice(data.coupon.discountAmount)}`);
      } else {
        setCouponDiscount(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.error(data.error || 'Invalid Coupon');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error('Failed to apply coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCoinToggle = (checked: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  // অ্যানিমেশন কন্ট্রোল (useCoins টগল হলে)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(savingsOpacity, {
        toValue: useCoins && walletBalance > 0 ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(savingsTranslateY, {
        toValue: useCoins && walletBalance > 0 ? 0 : -10,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [useCoins, walletBalance]);

  const maxCoinDiscount = totalPrice * 0.5;
  const coinDiscountAmount = useCoins ? Math.min(walletBalance, Math.floor(maxCoinDiscount)) : 0;
  const finalTotal = Math.max(0, totalPrice - couponDiscount - coinDiscountAmount);

  const handleProceed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCheckoutData({
      couponCode: couponDiscount > 0 ? couponCode : '',
      couponDiscount,
      useCoins,
    });
    router.push('/(shop)/checkout/payment');
  };

  if (!isInitialized)
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );

  const coinGradientColors = walletBalance > 0
    ? ['#eab308', '#f97316', '#dc2626']
    : ['#9ca3af', '#6b7280'];

  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

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
          <Text className="text-xs font-bold text-primary">2. Summary</Text>
          <View className="w-8 h-px bg-gray-300" />
          <Text className="text-xs font-medium text-gray-400">3. Payment</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}  // ★ অ্যাকাউন্ট পেইজের মতো 80
      >
        <Text className="text-2xl font-extrabold text-gray-900 mt-6 mb-6">
          Order Summary
        </Text>

        {/* ─── COIN CARD ─── */}
        <View className="mb-5 rounded-2xl overflow-hidden shadow-xl">
          <LinearGradient
            colors={coinGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 24 }}
          >
            {walletBalance > 0 && (
              <View className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mt-10 -mr-10" />
            )}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-4">
                <View className="h-14 w-14 bg-white/20 rounded-full items-center justify-center border border-white/30">
                  <Coins size={28} color="#fff" />
                </View>
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white font-bold text-xl">Bumba Coins</Text>
                    {walletBalance > 0 && <Sparkles size={14} color="#fef08a" />}
                  </View>
                  <Text className="text-white/90 text-sm font-medium mt-0.5">
                    {walletBalance > 0
                      ? `Available Balance: ${walletBalance}`
                      : 'No coins available yet.'}
                  </Text>
                </View>
              </View>
              <Switch
                value={useCoins}
                onValueChange={handleCoinToggle}
                disabled={walletBalance === 0}
                trackColor={{ false: '#ffffff30', true: '#ffffff90' }}
                thumbColor={useCoins ? '#fbbf24' : '#f3f4f6'}
                ios_backgroundColor="#ffffff20"
              />
            </View>
            <Animated.View
              style={{
                opacity: savingsOpacity,
                transform: [{ translateY: savingsTranslateY }],
              }}
              className="mt-4 pt-4 border-t border-white/20"
            >
              {useCoins && walletBalance > 0 ? (
                <View className="flex-row justify-between items-center">
                  <Text className="text-yellow-50 text-sm font-medium">Savings applied</Text>
                  <Text className="text-2xl font-bold text-white">
                    - {formatPrice(coinDiscountAmount)}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          </LinearGradient>
        </View>

        {/* ─── COUPON CARD ─── */}
        <View className="mb-5 relative">
          <View
            style={{
              position: 'absolute', left: -12, top: '50%', marginTop: -12,
              width: 24, height: 24, borderRadius: 12, backgroundColor: '#f9fafb',
              borderRightWidth: 1, borderColor: '#e5e7eb', zIndex: 10,
            }}
          />
          <View
            style={{
              position: 'absolute', right: -12, top: '50%', marginTop: -12,
              width: 24, height: 24, borderRadius: 12, backgroundColor: '#f9fafb',
              borderLeftWidth: 1, borderColor: '#e5e7eb', zIndex: 10,
            }}
          />
          <View className="bg-white rounded-xl border-2 border-dashed border-gray-200 overflow-hidden p-6">
            <View className="flex-row items-center gap-2 mb-4">
              <Ticket size={20} color="#e11d48" />
              <Text className="font-bold text-gray-800">Apply Coupon</Text>
            </View>

            {couponDiscount > 0 ? (
              <View className="bg-green-50 border border-green-200 rounded-lg p-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="h-8 w-8 bg-green-100 rounded-full items-center justify-center">
                    <CheckCircle2 size={20} color="#16a34a" />
                  </View>
                  <View>
                    <Text className="font-bold text-green-800 text-sm">
                      '{couponCode}' Applied
                    </Text>
                    <Text className="text-xs text-green-600 font-medium">
                      You saved {formatPrice(couponDiscount)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    removeCoupon();
                    toast.info('Coupon removed');
                  }}
                >
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
                  className="flex-1 h-11 bg-gray-50 border border-gray-200 rounded-lg px-3 font-medium uppercase tracking-wider text-sm text-gray-900"
                  textAlignVertical="center"
                  style={{ paddingTop: 0, paddingBottom: 0 }}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  onPress={handleApplyCoupon}
                  disabled={isApplyingCoupon || !couponCode}
                  className={`h-11 px-6 rounded-lg items-center justify-center shadow-sm ${
                    couponCode ? 'bg-primary' : 'bg-gray-300'
                  }`}
                  activeOpacity={0.8}
                >
                  {isApplyingCoupon ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className={`font-bold text-sm ${couponCode ? 'text-white' : 'text-gray-500'}`}>
                      APPLY
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ─── ITEMS LIST ─── */}
        <View className="mb-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-2">
              <ShoppingBag size={20} color="#6b7280" />
              <Text className="font-bold text-lg text-gray-800">Items in Cart</Text>
            </View>
            <Text className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md font-medium">
              {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
            </Text>
          </View>

          {items.map((item, index) => {
            const imageSrc =
              (item.image && Array.isArray(item.image) ? item.image[0]?.url : item.image?.url) ||
              PLACEHOLDER_IMAGE_URL;
            return (
              <View
                key={item.id}
                className={`flex-row items-center gap-4 ${index !== items.length - 1 ? 'mb-8' : ''}`}
              >
                <View className="h-16 w-16 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                  <Image
                    source={{ uri: imageSrc }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-semibold text-sm text-gray-800 truncate">{item.name}</Text>
                  <Text className="text-xs text-gray-500 mt-1 font-medium">
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

        {/* ─── BILL SUMMARY ─── */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden mb-6">
          <View className="bg-gray-900 px-6 py-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Receipt size={18} color="#9ca3af" />
              <Text className="font-bold text-white tracking-wide text-sm">BILL SUMMARY</Text>
            </View>
            <Text className="text-xs text-gray-400 font-mono">
              {formattedDate}
            </Text>
          </View>

          <View className="p-6 space-y-5">
            <View className="flex-row justify-between">
              <Text className="text-gray-600 text-sm">Item Total</Text>
              <Text className="font-medium text-gray-900">{formatPrice(totalPrice)}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600 text-sm">Delivery Fee</Text>
              <View className="flex-row items-center gap-1 bg-orange-50 px-2 py-2 rounded-md">
                <Text className="text-orange-600 font-bold text-xs">Next Step</Text>
                <MapPin size={12} color="#ea580c" />
              </View>
            </View>

            {(couponDiscount > 0 || (useCoins && coinDiscountAmount > 0)) && (
              <View className="bg-green-50 rounded-xl p-4 space-y-3 border border-green-100 mt-2">
                {couponDiscount > 0 && (
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-1.5">
                      <Ticket size={16} color="#16a34a" />
                      <Text className="text-green-700 text-sm font-medium">Coupon Savings</Text>
                    </View>
                    <Text className="text-green-700 text-sm font-medium">
                      - {formatPrice(couponDiscount)}
                    </Text>
                  </View>
                )}
                {useCoins && coinDiscountAmount > 0 && (
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-1.5">
                      <Coins size={16} color="#d97706" />
                      <Text className="text-amber-700 text-sm font-medium">Coin Savings</Text>
                    </View>
                    <Text className="text-amber-700 text-sm font-medium">
                      - {formatPrice(coinDiscountAmount)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={{ borderTopWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed', marginTop: 8, marginBottom: 4 }} />

            <View className="flex-row justify-between items-center pt-2 pb-1">
              <Text className="text-lg font-bold text-gray-900">Total (Excl. Delivery)</Text>
              <Text className="text-2xl font-extrabold text-primary">{formatPrice(finalTotal)}</Text>
            </View>
            <Text className="text-[11px] text-right text-gray-400 font-medium mt-1">
              *Delivery charges will be added at checkout
            </Text>
          </View>
        </View>

        {/* Zigzag edge */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -8, marginBottom: -8, paddingHorizontal: 4 }}>
          {Array.from({ length: 25 }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 10, height: 10, borderRadius: 5, backgroundColor: 'white',
              }}
            />
          ))}
        </View>

        {/* Proceed Button */}
        <TouchableOpacity
          onPress={handleProceed}
          className="bg-primary h-14 rounded-2xl flex-row items-center justify-center gap-4 mb-2 shadow-xl"
          activeOpacity={0.9}
        >
          <Text className="text-white font-bold text-lg">Select Address & Pay</Text>
          <ArrowRight size={20} color="#fff" />
        </TouchableOpacity>

        {/* Trust seals */}
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