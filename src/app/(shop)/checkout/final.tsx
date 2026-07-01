// src/app/(shop)/checkout/final.tsx

import { useAlert } from '@/components/ui/CustomAlert';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { format, isSameDay, startOfDay } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Home,
  Lock,
  MapPin,
  Plus,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

// --- Floating Label Input ---
const FloatingLabelInput = ({
  label,
  value,
  onChangeText,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.length > 0;

  return (
    <View className="relative mb-2">
      <TextInput
        className={`px-4 pb-2.5 pt-6 w-full text-sm text-gray-900 bg-white border rounded-xl ${
          focused ? 'border-primary' : 'border-gray-300'
        } ${multiline ? 'min-h-[100px]' : 'h-[50px]'}`}
        style={{ textAlignVertical: 'top' }}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=""
      />
      <Text
        className={`absolute left-4 text-sm transition-all ${
          isFloating ? 'text-primary -translate-y-1 scale-75' : 'text-gray-500'
        }`}
        style={{
          top: isFloating ? 8 : 14,
          transform: [{ translateY: 0 }],
        }}
      >
        {label}
      </Text>
    </View>
  );
};

// --- Swipeable Calendar ---
const SwipeableCalendar = ({
  selected,
  onSelect,
  viewDate,
  setViewDate,
  onClose,
}: {
  selected?: Date;
  onSelect: (date: Date) => void;
  viewDate: Date;
  setViewDate: (date: Date) => void;
  onClose: () => void;
}) => {
  const [direction, setDirection] = useState(0);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];

  const handleMonthChange = (monthIndex: number) => {
    setDirection(monthIndex > viewDate.getMonth() ? 1 : -1);
    const newDate = new Date(viewDate);
    newDate.setMonth(monthIndex);
    setViewDate(newDate);
  };

  const handleYearChange = (year: number) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(year);
    setViewDate(newDate);
  };

  const generateDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = generateDays();

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      if (translationX < -50) {
        setDirection(1);
        const newDate = new Date(viewDate);
        newDate.setMonth(viewDate.getMonth() + 1);
        setViewDate(newDate);
      } else if (translationX > 50) {
        setDirection(-1);
        const newDate = new Date(viewDate);
        newDate.setMonth(viewDate.getMonth() - 1);
        setViewDate(newDate);
      }
    }
  };

  const renderDay = (date: Date | null, index: number) => {
    if (!date) {
      return <View key={`empty-${index}`} className="h-10 w-10" />;
    }
    const isSelected = selected && isSameDay(date, selected);
    const isToday = isSameDay(date, new Date());
    const isDisabled = date < startOfDay(new Date());

    return (
      <TouchableOpacity
        key={date.toISOString()}
        onPress={() => {
          if (!isDisabled) {
            onSelect(date);
            onClose();
          }
        }}
        disabled={isDisabled}
        className={`h-10 w-10 rounded-xl items-center justify-center ${
          isSelected ? 'bg-primary' : isToday ? 'bg-primary/10 border border-primary/20' : ''
        } ${isDisabled ? 'opacity-30' : ''}`}
      >
        <Text
          className={`text-sm font-medium ${
            isSelected ? 'text-white' : isToday ? 'text-primary font-bold' : 'text-gray-900'
          }`}
        >
          {date.getDate()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="p-4 bg-white rounded-3xl">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity
            onPress={() => handleMonthChange(viewDate.getMonth() - 1)}
            className="p-2 bg-gray-100 rounded-full"
          >
            <ChevronDown size={18} color="#374151" style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
          <Text className="text-base font-bold text-gray-900">
            {months[viewDate.getMonth()]} {viewDate.getFullYear()}
          </Text>
          <TouchableOpacity
            onPress={() => handleMonthChange(viewDate.getMonth() + 1)}
            className="p-2 bg-gray-100 rounded-full"
          >
            <ChevronDown size={18} color="#374151" style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center">
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              onPress={() => handleYearChange(year)}
              className={`px-3 py-1 rounded-full ${
                year === viewDate.getFullYear() ? 'bg-primary' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  year === viewDate.getFullYear() ? 'text-white' : 'text-gray-700'
                }`}
              >
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <PanGestureHandler onHandlerStateChange={onHandlerStateChange}>
        <Animated.View className="w-full">
          <View className="flex-row flex-wrap">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <View key={i} className="h-10 w-10 items-center justify-center">
                <Text className="text-xs text-gray-500 font-medium">{day}</Text>
              </View>
            ))}
          </View>
          <View className="flex-row flex-wrap">
            {days.map((date, idx) => renderDay(date, idx))}
          </View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

// --- Main Screen ---
export default function FinalCheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  const { user, isInitialized } = useAuthStore();
  const { items, getTotalPrice, getItemCount, clearCart, checkoutState } = useCartStore();

  const { couponCode, couponDiscount, useCoins, coinDiscount: savedCoinDiscount } = checkoutState;

  // Always delivery – no toggle
  const orderType = 'delivery';

  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [mealTime, setMealTime] = useState<'lunch' | 'dinner'>('lunch');
  const [instructions, setInstructions] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const [timeValidationError, setTimeValidationError] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: '', message: '' });

  const [earnRate, setEarnRate] = useState(2);

  const totalPrice = getTotalPrice();
  const itemCount = getItemCount();
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const currentDeliveryFee = selectedAddress?.deliveryFee || 0;
  const coinDiscountAmount = useCoins ? savedCoinDiscount || 0 : 0;
  const finalTotal = Math.max(0, totalPrice + currentDeliveryFee - couponDiscount - coinDiscountAmount);

  // Fetch addresses and wallet
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const resAddr = await fetch(`${API_URL}/user/addresses`);
        const dataAddr = await resAddr.json();
        if (dataAddr.success && dataAddr.addresses) {
          setAddresses(dataAddr.addresses);
          const defaultAddr = dataAddr.addresses.find((a: any) => a.isDefault) || dataAddr.addresses[0];
          if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        }

        const resWallet = await fetch(`${API_URL}/wallet`);
        const dataWallet = await resWallet.json();
        if (dataWallet.success && dataWallet.wallet) {
          const totalSpent = dataWallet.wallet.totalSpent || 0;
          if (totalSpent >= 15000) setEarnRate(6);
          else if (totalSpent >= 5000) setEarnRate(4);
          else setEarnRate(2);
        }
      } catch (error) {
        console.log('Fetch error', error);
      }
    };
    fetchData();
  }, [user]);

  // Auth & cart checks
  useEffect(() => {
    if (isInitialized && !user) {
      toast.error('Please login to checkout.');
      router.replace('/(auth)/login');
    }
    if (isInitialized && itemCount === 0 && !isSuccess) {
      router.replace('/(shop)');
    }
  }, [isInitialized, user, itemCount, isSuccess]);

  const toggleAddressSelection = (id: string) => {
    setSelectedAddressId(id);
  };

  const handleAddAddress = () => {
    router.push('/(shop)/account/addresses');
  };

  const handleDateSelect = (date: Date) => {
    setPreferredDate(date);
    setIsCalendarOpen(false);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address.');
      return;
    }

    if (!preferredDate) {
      toast.error('Please select a preferred date.');
      return;
    }

    if (!termsAccepted) {
      toast.error('Please agree to the Terms and Conditions.');
      return;
    }

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const selectedDateStr = format(preferredDate, 'yyyy-MM-dd');
    const currentHour = today.getHours();

    if (selectedDateStr === todayStr) {
      if (mealTime === 'lunch' && currentHour >= 9) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeValidationError({
          show: true,
          title: 'Time Limit Exceeded!',
          message: "Today's lunch orders are accepted until 9 AM only. Please select a future date.",
        });
        return;
      }
      if (mealTime === 'dinner' && currentHour >= 18) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeValidationError({
          show: true,
          title: 'Time Limit Exceeded!',
          message: "Today's dinner orders are accepted until 6 PM only. Please select a future date.",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        preferredDate: format(preferredDate, 'yyyy-MM-dd'),
        mealTime,
        instructions,
        terms: termsAccepted,
        name: user?.name || 'Customer',
        altPhone: user?.phone || '',
        items: items,
        subtotal: totalPrice,
        deliveryFee: currentDeliveryFee,
        total: finalTotal,
        discount: couponDiscount + coinDiscountAmount,
        couponCode: couponDiscount > 0 ? couponCode : '',
        useCoins: useCoins,
        orderType: 'delivery',
        address: selectedAddress.address,
        deliveryAddress: selectedAddress.address,
        coordinates: selectedAddress.coordinates,
      };

      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Order placement failed');

      setIsSuccess(true);
      clearCart();

      const orderNum = data.orderId || '0000';
      const eligibleAmountForCoins = Math.max(0, totalPrice - couponDiscount);
      const earnedCoins = Math.floor((eligibleAmountForCoins * earnRate) / 100);

      toast.success(`Order #${orderNum} placed successfully!`);
      if (earnedCoins > 0) {
        toast.info(`You earned ${earnedCoins} coins!`);
      }
      router.push('/(shop)/account/orders');
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  if (itemCount === 0 && !isSuccess) {
    return null;
  }

  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('home')) return <Home size={20} color="#e11d48" />;
    return <MapPin size={20} color="#e11d48" />;
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 font-sans ml-2">Final Checkout</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Order Summary (collapsible) */}
        <View className="lg:hidden mb-6">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Text className="font-bold text-gray-900">Order Summary</Text>
                {isSummaryExpanded ? (
                  <ChevronUp size={18} color="#6b7280" className="ml-2" />
                ) : (
                  <ChevronDown size={18} color="#6b7280" className="ml-2" />
                )}
              </View>
              <Text className="font-bold text-lg text-primary">{formatPrice(finalTotal)}</Text>
            </View>
          </TouchableOpacity>
          {isSummaryExpanded && (
            <View className="bg-white border border-gray-200 rounded-2xl p-4 mt-2 shadow-sm">
              <View className="space-y-2">
                {items.map((item) => (
                  <View key={item.id} className="flex-row justify-between">
                    <Text className="text-sm text-gray-600">
                      {item.quantity}x {item.name}
                    </Text>
                    <Text className="text-sm font-medium text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </Text>
                  </View>
                ))}
                <View className="border-t border-gray-200 my-2" />
                <View className="flex-row justify-between text-gray-500">
                  <Text>Subtotal</Text>
                  <Text>{formatPrice(totalPrice)}</Text>
                </View>
                <View className="flex-row justify-between text-gray-500">
                  <Text>Delivery Fee</Text>
                  <Text
                    className={
                      currentDeliveryFee === 0 ? 'text-green-600 font-medium' : 'font-medium'
                    }
                  >
                    {currentDeliveryFee === 0 ? 'Free' : formatPrice(currentDeliveryFee)}
                  </Text>
                </View>
                {couponDiscount > 0 && (
                  <View className="flex-row justify-between text-green-600">
                    <Text>Coupon</Text>
                    <Text>- {formatPrice(couponDiscount)}</Text>
                  </View>
                )}
                {coinDiscountAmount > 0 && (
                  <View className="flex-row justify-between text-amber-600">
                    <Text>Coins</Text>
                    <Text>- {formatPrice(coinDiscountAmount)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Delivery Address Selection (always visible, no toggle) */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-bold text-gray-900">Select Delivery Address</Text>
            <TouchableOpacity onPress={handleAddAddress} className="flex-row items-center">
              <Plus size={18} color="#e11d48" />
              <Text className="text-primary font-bold ml-1">Add New</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <View className="py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300 items-center">
              <MapPin size={40} color="#9ca3af" />
              <Text className="text-gray-500 mt-3">No saved addresses</Text>
              <TouchableOpacity onPress={handleAddAddress} className="mt-3">
                <Text className="text-primary font-bold">Add your first address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-3">
              {addresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  onPress={() => toggleAddressSelection(addr.id)}
                  activeOpacity={0.7}
                  className={`border rounded-2xl p-4 ${
                    selectedAddressId === addr.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-start">
                    <View
                      className={`h-10 w-10 rounded-xl items-center justify-center mr-3 ${
                        selectedAddressId === addr.id ? 'bg-primary' : 'bg-primary/10'
                      }`}
                    >
                      {getIcon(addr.name)}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center">
                        <Text className="font-bold text-gray-900">{addr.name}</Text>
                        {selectedAddressId === addr.id && (
                          <View className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </View>
                      <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                        {addr.address}
                      </Text>
                      <View className="flex-row mt-2 space-x-2">
                        {addr.distanceText && (
                          <View className="bg-gray-100 px-2 py-0.5 rounded-md">
                            <Text className="text-xs text-gray-600">Dist: {addr.distanceText}</Text>
                          </View>
                        )}
                        <View
                          className={`px-2 py-0.5 rounded-md ${
                            addr.deliveryFee === 0 ? 'bg-green-100' : 'bg-orange-100'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              addr.deliveryFee === 0 ? 'text-green-700' : 'text-orange-700'
                            }`}
                          >
                            Fee: {addr.deliveryFee === 0 ? 'FREE' : formatPrice(addr.deliveryFee)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Preferences */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">Preferences</Text>

          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 ml-1 mb-1">Date</Text>
              <TouchableOpacity
                onPress={() => setIsCalendarOpen(true)}
                className="h-12 bg-white border border-gray-300 rounded-xl px-3 flex-row items-center justify-between"
              >
                <Text className={preferredDate ? 'text-gray-900' : 'text-gray-400'}>
                  {preferredDate ? format(preferredDate, 'MMM do, yyyy') : 'Pick a date'}
                </Text>
                <CalendarIcon size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 ml-1 mb-1">Time</Text>
              <View className="flex-row h-12 bg-white border border-gray-300 rounded-xl overflow-hidden">
                <TouchableOpacity
                  onPress={() => setMealTime('lunch')}
                  className={`flex-1 items-center justify-center ${
                    mealTime === 'lunch' ? 'bg-primary' : ''
                  }`}
                >
                  <Text className={mealTime === 'lunch' ? 'text-white font-bold' : 'text-gray-700'}>
                    Lunch
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMealTime('dinner')}
                  className={`flex-1 items-center justify-center ${
                    mealTime === 'dinner' ? 'bg-primary' : ''
                  }`}
                >
                  <Text className={mealTime === 'dinner' ? 'text-white font-bold' : 'text-gray-700'}>
                    Dinner
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="mt-4">
            <FloatingLabelInput
              label="Cooking Instructions (Optional)"
              value={instructions}
              onChangeText={setInstructions}
              multiline
            />
          </View>
        </View>

        {/* Terms */}
        <View className="flex-row items-start space-x-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 mb-6">
          <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)} className="mt-1">
            <View
              className={`h-5 w-5 rounded border-2 items-center justify-center ${
                termsAccepted ? 'bg-primary border-primary' : 'border-gray-400 bg-white'
              }`}
            >
              {termsAccepted && <Check size={14} color="white" />}
            </View>
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-sm text-gray-600">
              I agree to the{' '}
              <Text
                className="text-primary font-bold underline"
                onPress={() => toast.info('Terms page coming soon')}
              >
                Terms & Conditions
              </Text>{' '}
              and Refund Policy.
            </Text>
          </View>
        </View>

        {/* Place Order Button */}
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={isSubmitting || !selectedAddress}
          className={`h-14 rounded-2xl flex-row items-center justify-center shadow-lg ${
            isSubmitting || !selectedAddress ? 'bg-gray-300' : 'bg-primary'
          }`}
          style={{
            shadowColor: '#e11d48',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Lock size={20} color="white" />
              <Text className="text-white font-bold text-lg ml-2">
                Place Order — {formatPrice(finalTotal)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal visible={isCalendarOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-4 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-900">Select Delivery Date</Text>
              <TouchableOpacity onPress={() => setIsCalendarOpen(false)} className="p-2">
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <SwipeableCalendar
              selected={preferredDate || undefined}
              onSelect={handleDateSelect}
              viewDate={viewDate}
              setViewDate={setViewDate}
              onClose={() => setIsCalendarOpen(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Time Validation Error Modal */}
      <Modal visible={timeValidationError.show} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="h-14 w-14 bg-red-100 rounded-full items-center justify-center">
                <AlertCircle size={28} color="#dc2626" />
              </View>
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {timeValidationError.title}
            </Text>
            <Text className="text-sm text-gray-600 text-center mb-6 leading-relaxed">
              {timeValidationError.message}
            </Text>
            <TouchableOpacity
              onPress={() => setTimeValidationError({ show: false, title: '', message: '' })}
              className="h-12 bg-primary rounded-xl items-center justify-center"
            >
              <Text className="text-white font-bold">I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}