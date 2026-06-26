// src/app/(shop)/checkout/summary.tsx

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
  Platform,
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
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';
const TOKEN_KEY = 'auth_token';

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

  // 1. Fetch wallet balance
  // 1. Fetch Wallet Balance
useEffect(() => {
  const fetchWallet = async () => {
    try {
      // Wallet পেজের মতই হেডার ছাড়া
      const res = await fetch(`${API_URL}/wallet`);
      const data = await res.json();
      if (data.success && data.wallet) {
        setWalletBalance(data.wallet.balance || 0);
      } else if (data.success && data.balance) {
        // যদি কখনো Next.js স্ট্রাকচার আসে তার জন্য ফলব্যাক
        setWalletBalance(data.balance);
      }
    } catch (e) {
      console.log('Wallet fetch failed', e);
    }
  };
  if (user) fetchWallet();
}, [user]);

  // 2. Auth & cart guard
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

  // Remove coupon
  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
  };

  // 3. Apply coupon
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

  // 4. Coin toggle
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

  // 5. Calculations
  const maxCoinDiscount = totalPrice * 0.5;
  const coinDiscountAmount = useCoins ? Math.min(walletBalance, Math.floor(maxCoinDiscount)) : 0;
  const finalTotal = Math.max(0, totalPrice - couponDiscount - coinDiscountAmount);

  // 6. Proceed
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
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
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
        <Text className="text-2xl font-extrabold text-gray-900 mt-6 mb-6">Order Summary</Text>

        {/* Coin Card */}
        {walletBalance > 0 && (
          <View className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-5 shadow-lg">
            <View className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/20 rounded-full opacity-50" />
            <View className="flex-row items-center justify-between relative z-10">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 bg-white/20 rounded-full items-center justify-center border border-white/30">
                  <Coins size={24} color="#fff" />
                </View>
                <View>
                  <Text className="font-bold text-lg text-white flex-row items-center">
                    Bumba Coins <Sparkles size={14} color="#fef08a" />
                  </Text>
                  <Text className="text-yellow-100 text-sm">Balance: {walletBalance}</Text>
                </View>
              </View>
              <Switch
                value={useCoins}
                onValueChange={handleCoinToggle}
                trackColor={{ false: '#00000033', true: '#ffffff' }}
                thumbColor={useCoins ? '#e11d48' : '#f4f3f4'}
              />
            </View>
            {useCoins && (
              <View className="mt-4 pt-4 border-t border-white/20 flex-row justify-between items-center">
                <Text className="text-yellow-50 text-sm">Savings applied</Text>
                <Text className="text-2xl font-bold text-white">- {formatPrice(coinDiscountAmount)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Coupon Card */}
        <View className="mb-5 bg-white rounded-xl border-2 border-dashed border-gray-200 overflow-hidden">
          <View className="p-5">
            <Text className="font-bold text-gray-800 flex-row items-center gap-1 mb-3">
              <Ticket size={18} color="#e11d48" /> Apply Coupon
            </Text>
            {couponDiscount > 0 ? (
              <View className="bg-green-50 border border-green-200 rounded-lg p-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <CheckCircle2 size={18} color="#16a34a" />
                  <View>
                    <Text className="font-bold text-green-800 text-sm">'{couponCode}' Applied</Text>
                    <Text className="text-xs text-green-600">You saved {formatPrice(couponDiscount)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
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

        {/* Items List */}
        <View className="mb-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-bold text-lg flex-row items-center gap-1">
              <ShoppingBag size={18} color="#6b7280" /> Items in Cart
            </Text>
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

        {/* Bill Summary */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden mb-6">
          {/* Header */}
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

            {/* Savings */}
            {(couponDiscount > 0 || (useCoins && coinDiscountAmount > 0)) && (
              <View className="bg-green-50 rounded-lg p-3 space-y-2 border border-green-100">
                {couponDiscount > 0 && (
                  <View className="flex-row justify-between text-green-700 text-sm font-medium">
                    <Text className="flex-row items-center gap-1">
                      <Ticket size={14} /> Coupon Savings
                    </Text>
                    <Text>- {formatPrice(couponDiscount)}</Text>
                  </View>
                )}
                {useCoins && coinDiscountAmount > 0 && (
                  <View className="flex-row justify-between text-amber-700 text-sm font-medium">
                    <Text className="flex-row items-center gap-1">
                      <Coins size={14} /> Coin Savings
                    </Text>
                    <Text>- {formatPrice(coinDiscountAmount)}</Text>
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

        {/* Footer */}
        <View className="flex-row justify-center items-center gap-4 mt-6 mb-4 opacity-70">
          <Text className="text-xs text-gray-400 flex-row items-center gap-1">
            <Wallet size={12} /> 100% Secure
          </Text>
          <Text className="text-xs text-gray-400 flex-row items-center gap-1">
            <CheckCircle2 size={12} /> Trusted
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}