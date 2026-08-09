// src/app/(shop)/checkout/summary.tsx

import { CouponTag, SavingsBanner, useAlert } from '@/shared/components/ui';
import { LOTTIE_PLACEHOLDER } from '@/shared/constants/constants';
import { useAuthStore } from '@/shared/store/authStore';
import { useCartStore } from '@/shared/store/cartStore';
import { formatPrice } from '@/shared/utils/utils';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import {
  ArrowLeft,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Reanimated, { Easing, FadeIn, FadeOut, interpolate, Keyframe, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// Background Success Animation (Diamond Explosion + Blue Aura)
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { toast } from 'sonner-native';

const SuccessEffects = () => {
  const explode = useSharedValue(0);
  const auraScale = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    // Explosion and Aura much faster to match fast ticket entry
    explode.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.2)) });
    auraScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) });
    // Continuous infinite rotation
    spin.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1, false);
  }, []);

  const stars = Array.from({ length: 8 }).map((_, i) => {
    const baseAngle = (i * Math.PI * 2) / 8;
    const distance = 160;
    const color = '#FFFFFF'; // All stars white as requested
    const size = i % 2 === 0 ? 30 : 20;

    const style = useAnimatedStyle(() => {
      // Explode to fixed position, NO orbiting
      const currentDistance = explode.value * distance;
      const tx = Math.cos(baseAngle) * currentDistance;
      const ty = Math.sin(baseAngle) * currentDistance;

      return {
        transform: [
          { translateX: tx },
          { translateY: ty },
          // Spin continuously in place
          { rotateZ: `${spin.value * 360}deg` },
          // Pop out then settle
          { scale: interpolate(explode.value, [0, 0.5, 1], [0, 1.2, 1]) }
        ],
        // Stay fully visible!
        opacity: interpolate(explode.value, [0, 0.2], [0, 1])
      };
    });

    return (
      <Reanimated.View
        key={i}
        exiting={FadeOut.duration(200)}
        style={[style, { position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center', zIndex: 10 }]}
      >
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 0C12 0 12 9.5 24 12C12 14.5 12 24 12 24C12 24 12 14.5 0 12C12 9.5 12 0 12 0Z" fill={color} />
        </Svg>
      </Reanimated.View>
    );
  });

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: auraScale.value }],
    opacity: interpolate(auraScale.value, [0, 1], [0, 0.8])
  }));

  return (
    <Reanimated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(400).delay(200)}
      className="absolute z-0 items-center justify-center pointer-events-none"
      style={{ top: '15%', left: '15%', right: '15%', bottom: '15%' }}
    >
      {/* Massive Soft Blue Aura */}
      <Reanimated.View style={[auraStyle, { position: 'absolute' }]}>
        <Svg width="400" height="400" viewBox="0 0 400 400">
          <Defs>
            <RadialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#f43f5e" stopOpacity="1" />
              <Stop offset="40%" stopColor="#e11d48" stopOpacity="0.7" />
              <Stop offset="100%" stopColor="#be123c" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="200" cy="200" r="200" fill="url(#auraGlow)" />
        </Svg>
      </Reanimated.View>

      {/* 4-Corner Star Particles */}
      <View className="absolute items-center justify-center">
        {stars}
      </View>
    </Reanimated.View>
  );
};


const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

export function SummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, setCheckoutData } = useCartStore();
  const { user, isInitialized } = useAuthStore();
  const { showAlert } = useAlert();

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useCoins, setUseCoins] = useState(false);

  // Popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);

  // Timeout refs to prevent ghost popups
  const successPopupTimeout = useRef<NodeJS.Timeout | null>(null);
  const alertPopupTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (successPopupTimeout.current) clearTimeout(successPopupTimeout.current);
      if (alertPopupTimeout.current) clearTimeout(alertPopupTimeout.current);
    };
  }, []);

  // Use explicit shared values for the complex custom animation
  const animIsVisible = useSharedValue(false);

  // Custom Ticket Entering Animation (Extremely Fast Pop & Swing)
  const ticketEnter = new Keyframe({
    0: {
      transform: [{ scale: 0.2 }, { rotateZ: '-25deg' }],
      opacity: 0,
      easing: Easing.out(Easing.back(1.8)), // Springy overshoot for pop + swing
    },
    100: {
      transform: [{ scale: 1 }, { rotateZ: '0deg' }],
      opacity: 1,
    }
  }).duration(250); // Much faster!

  const ticketExit = new Keyframe({
    0: {
      transform: [{ translateY: 0 }, { translateX: 0 }, { scale: 1 }, { rotateZ: '0deg' }],
      opacity: 1,
    },
    30: {
      transform: [{ translateY: 15 }, { translateX: 10 }, { scale: 1.05 }, { rotateZ: '5deg' }],
      opacity: 1,
      easing: Easing.out(Easing.quad),
    },
    100: {
      // Swing away to the Top-Left corner!
      transform: [{ translateY: -400 }, { translateX: -300 }, { scale: 0.1 }, { rotateZ: '-45deg' }],
      opacity: 0,
      easing: Easing.in(Easing.back(1.2)),
    }
  }).duration(600);

  // Physics-based Exit for Yellow Back Ticket (Heavy Drag & Trail)
  const backTicketExit = new Keyframe({
    0: {
      transform: [{ translateY: 0 }, { translateX: 0 }, { scale: 1 }, { rotateZ: '0deg' }],
      opacity: 1,
    },
    35: {
      // Swings heavily in the opposite direction due to inertia
      transform: [{ translateY: 25 }, { translateX: 15 }, { scale: 1.05 }, { rotateZ: '15deg' }],
      opacity: 1,
      easing: Easing.out(Easing.quad),
    },
    100: {
      // Trails behind the blue ticket with massive rotation
      transform: [{ translateY: -380 }, { translateX: -250 }, { scale: 0.1 }, { rotateZ: '-80deg' }],
      opacity: 0,
      easing: Easing.in(Easing.back(1.2)),
    }
  }).duration(600);


  // Idle Floating Animation for Ticket
  const floatY = useSharedValue(0);
  const floatRotate = useSharedValue(0);

  // Separate Idle Animation for Yellow Back Ticket (Slightly larger swing)
  const backFloatY = useSharedValue(0);
  const backFloatRotate = useSharedValue(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccessPopup) {
      timer = setTimeout(() => {
        if (showSuccessPopup) {
          // Front ticket swing
          floatY.value = withRepeat(
            withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
          floatRotate.value = withRepeat(
            withTiming(4, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );

          // Back ticket swing (slightly more extreme and out of sync for layered feel)
          backFloatY.value = withRepeat(
            withTiming(-12, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
          backFloatRotate.value = withRepeat(
            withTiming(6, { duration: 1250, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
        }
      }, 350); // Start floating sooner
    } else {
      floatY.value = 0;
      floatRotate.value = 0;
      backFloatY.value = 0;
      backFloatRotate.value = 0;
    }
    return () => clearTimeout(timer);
  }, [showSuccessPopup]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { rotateZ: `${floatRotate.value}deg` }
    ],
    // The hole is exactly at ~15% from the top of the 310px height ticket
    transformOrigin: ['50%', '15%', 0]
  }));

  const backFloatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: backFloatY.value },
      { rotateZ: `${backFloatRotate.value}deg` }
    ],
    transformOrigin: ['50%', '15%', 0]
  }));
  // ★ Calculate total directly to ensure 100% reactivity
  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0);
  }, [items]);

  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // ★ Calculate total directly to ensure 100% reactivity
  useFocusEffect(
    useCallback(() => {

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
    }, [user])
  );

  // 2. Auth & Cart Check (Next.js er moto)
  useEffect(() => {
    if (isInitialized) {
      if (!user) {
        showAlert({
          title: "Login Required",
          message: "You need to sign in or create an account to place an order.",
          confirmText: "Login Now",
          onConfirm: () => router.push('/(auth)/login')
        });
      }
    }
  }, [isInitialized, user, itemCount, router]);

  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
  };

  const handleApplyCoupon = async () => {
    Keyboard.dismiss();
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

        // Show awesome popup
        setSuccessAmount(data.coupon.discountAmount);
        setShowSuccessPopup(true);

        // Auto-hide popup after 3 seconds
        successPopupTimeout.current = setTimeout(() => setShowSuccessPopup(false), 3000);

        if (useCoins) {
          setUseCoins(false);
          // Wait for the popup (3000ms) + exit animation (600ms) to finish before showing alert
          alertPopupTimeout.current = setTimeout(() => {
            showAlert({
              title: "Coins Removed",
              message: "You can use either a Coupon OR BK Coins for an order.",
              cancelText: ""
            });
          }, 4200);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (checked) {
      if (couponDiscount > 0) {
        removeCoupon();
        showAlert({
          title: "Coupon Removed",
          message: "You can use either BK Coins OR a Coupon for an order.",
          cancelText: ""
        });
      }
      setUseCoins(true);
    } else {
      setUseCoins(false);
    }
  };



  const maxCoinDiscount = totalPrice * 0.5;
  const coinDiscountAmount = useCoins ? Math.min(walletBalance, Math.floor(maxCoinDiscount)) : 0;
  const finalTotal = Math.max(0, totalPrice - couponDiscount - coinDiscountAmount);

  // 3. Checkout Data (Next.js er moto coinDiscount pathano holo)
  const handleProceed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCheckoutData({
      couponCode: couponDiscount > 0 ? couponCode : '',
      couponDiscount,
      useCoins,
      coinDiscount: coinDiscountAmount // ★ Added missing property
    });
    router.push('/(checkout)/final');
  };

  if (!isInitialized || !user || itemCount === 0)
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );

  const coinGradientColors = walletBalance > 0
    ? (['#f43f5e', '#e11d48', '#be123c'] as const)
    : (['#9ca3af', '#6b7280'] as const);

  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // ... (বাকি UI কোড সম্পূর্ণ একই থাকবে) ...
  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      {/* Header */}
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100" style={{ zIndex: 50 }}>
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 font-sans ml-2">Order Summary</Text>
      </View>



      <SavingsBanner amount={couponDiscount + (useCoins ? coinDiscountAmount : 0)} />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── COIN CARD ─── */}
        <View className="mb-5 rounded-2xl overflow-hidden shadow-xl" style={{ shadowColor: coinGradientColors[0], shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }}>
          <LinearGradient
            colors={coinGradientColors as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            {/* Magical Background Ornaments */}
            {walletBalance > 0 && (
              <>
                <View className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mt-12 -mr-12" />
                <View className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -mb-8 -ml-8" />
                <View className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full transform -translate-x-16 -translate-y-16" />
              </>
            )}
            
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="items-center justify-center -ml-2 mr-2 z-10" style={{
                  shadowColor: '#fbbf24',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                }}>
                  <LottieView 
                    source={require('../../../../assets/animations/coin.json')} 
                    autoPlay 
                    loop 
                    style={{ width: 80, height: 80 }} 
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Text className="text-white font-black text-2xl tracking-wide font-sans">BK Coins</Text>
                    {walletBalance > 0 && <Sparkles size={16} color="#fef08a" style={{ marginBottom: 4 }} />}
                  </View>
                  <Text className="text-white/90 text-sm font-semibold font-sans">
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
                style={{ transform: [{ scale: 1.1 }] }}
              />
            </View>
            
            {useCoins && walletBalance > 0 && (
              <View className="mt-2">
                <View className="flex-row justify-between items-center bg-black/10 px-4 py-3 rounded-xl mt-2 border border-white/20">
                  <View className="flex-row items-center gap-2">
                    <Sparkles size={16} color="#fef08a" />
                    <Text className="text-yellow-50 text-sm font-bold font-sans tracking-wide">SAVINGS APPLIED</Text>
                  </View>
                  <Text className="text-2xl font-black text-white font-sans">
                    - {formatPrice(coinDiscountAmount)}
                  </Text>
                </View>
              </View>
            )}
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
                  className={`h-11 px-6 rounded-lg items-center justify-center shadow-sm ${couponCode ? 'bg-primary' : 'bg-gray-300'
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
            const rawUrl =
              (item.image && Array.isArray(item.image) ? item.image[0]?.url : item.image?.url);
            return (
              <View
                key={item.id}
                className={`flex-row items-center gap-4 ${index !== items.length - 1 ? 'mb-8' : ''}`}
              >
                <View className="h-16 w-16 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                  {rawUrl ? (
                    <Image
                      source={{ uri: rawUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <LottieView
                      source={LOTTIE_PLACEHOLDER}
                      autoPlay
                      loop
                      style={{ width: '100%', height: '100%' }}
                    />
                  )}
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

      {/* Zomato-style Coupon Success Popup (Absolute Overlay to allow exit animations) */}
      {showSuccessPopup && (
        <View className="absolute inset-0 z-[100] items-center justify-center p-4">
          <Reanimated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(400).delay(200)}
            className="absolute inset-0 bg-[#0f172a]/80"
          />

          <View className="items-center justify-center w-full relative">

            {/* Custom Success Aura & Diamond Explosion */}
            {showSuccessPopup && <SuccessEffects />}

            {/* YELLOW BACK TICKET (Independent Physics Layer) */}
            <Reanimated.View
              entering={ticketEnter}
              exiting={backTicketExit}
              style={{ position: 'absolute', top: 0, zIndex: 5, transformOrigin: ['50%', '15%', 0] }}
              className="w-full relative items-center justify-center"
            >
              <Reanimated.View style={backFloatStyle} className="items-center">
                <CouponTag
                  width={230}
                  height={310}
                  fillColor="#FFC400"
                  borderColor="transparent"
                  borderWidth={0}
                  offsetLayer={true}
                  showHangingRing={false}
                />
              </Reanimated.View>
            </Reanimated.View>

            {/* BLUE FRONT TICKET */}
            <Reanimated.View
              entering={ticketEnter}
              exiting={ticketExit}
              style={{ zIndex: 10, transformOrigin: ['50%', '15%', 0] }}
              className="w-full relative items-center justify-center"
            >
              <Reanimated.View style={floatStyle} className="items-center">
                <CouponTag
                  width={230}
                  height={310}
                  fillColor="#FFFFFF"
                  borderColor="#e11d48"
                  borderWidth={7}
                  offsetLayer={false}
                  showHangingRing={true}
                >
                  <View className="flex-1 w-full h-full justify-between items-center relative overflow-hidden pb-5">

                    {/* Premium Watermark */}
                    <View className="absolute inset-0 items-center justify-center opacity-20 pointer-events-none">
                      <Text
                        className="text-[#ffe4e6] font-black"
                        style={{ fontSize: 240, transform: [{ translateY: 30 }, { rotate: '-12deg' }] }}
                      >
                        %
                      </Text>
                    </View>

                    {/* TOP SECTION */}
                    <View className="items-center w-full mt-3">
                      <View className="bg-[#fff1f2] border border-[#fecdd3] px-3 py-1.5 rounded-full flex-row items-center mb-1.5 shadow-sm">
                        <Sparkles size={10} color="#e11d48" className="mr-1.5" />
                        <Text className="text-[#e11d48] font-black text-[9px] tracking-[2px] uppercase mt-0.5">
                          Awesome!
                        </Text>
                        <Sparkles size={10} color="#e11d48" className="ml-1.5" />
                      </View>
                      <Text className="text-[#f43f5e] font-semibold text-[9px] text-center leading-[12px] px-2">
                        You found the best deal today.
                      </Text>
                    </View>

                    {/* MIDDLE SECTION (The Hero) */}
                    <View className="items-center w-full flex-1 justify-center relative my-2">
                      <Text className="text-[#fb7185] font-bold text-[10px] tracking-[4px] uppercase mb-1">
                        Total Savings
                      </Text>

                      <View className="flex-row items-start justify-center relative mt-1 w-full px-4">
                        <Text className="text-[#e11d48] font-black text-3xl mt-3 mr-1">₹</Text>
                        <Text 
                          className="text-[#e11d48] font-black text-[72px] leading-[80px] tracking-tighter shrink"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.4}
                        >
                          {successAmount}
                        </Text>
                      </View>
                    </View>

                    {/* BOTTOM SECTION */}
                    <View className="w-full px-1">
                      <View className="bg-[#e11d48] px-3 py-2.5 rounded-2xl flex-row items-center justify-center shadow-sm w-full border-t border-[#fb7185]/30">
                        <View className="w-4 h-4 bg-white rounded-full items-center justify-center mr-2 shadow-sm">
                          <Check size={10} color="#e11d48" strokeWidth={4} />
                        </View>
                        <Text className="text-white font-extrabold text-[9px] tracking-widest uppercase mt-0.5">
                          Offer Applied
                        </Text>
                      </View>
                    </View>

                  </View>
                </CouponTag>
              </Reanimated.View>
            </Reanimated.View>
          </View>
        </View>
      )}

    </View>
  );
}