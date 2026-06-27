// src/app/(shop)/checkout/index.tsx
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import { optimizeImageUrl } from '@/lib/imageUtils'; // if available, else replace with direct URL
import { toast } from 'sonner-native';
import * as Haptics from 'expo-haptics';
import {
  Lock,
  ChevronDown,
  ChevronUp,
  MapPin,
  Loader2,
  Ticket,
  Coins,
  Calendar as CalendarIcon,
  AlertCircle,
  Home,
  Briefcase,
  Plus,
  CheckSquare,
  Square,
  ShoppingBag,
  Receipt,
  Sparkles,
  Wallet,
  CheckCircle2,
  X,
  ArrowRight,
} from 'lucide-react-native';
import { Calendar } from 'react-native-calendars'; // or a custom calendar component
import { LinearGradient } from 'expo-linear-gradient';
import { AppState } from 'react-native';

// Note: If you want to use a custom swipeable calendar, you can build one.
// Below I'm using `react-native-calendars` for simplicity, but you can replace it with your own SwipeableCalendar.
import { CalendarList } from 'react-native-calendars';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';
const { width } = Dimensions.get('window');

// Floating label textarea (native)
const FloatingLabelTextarea = ({ value, onChangeText, label }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View className="relative mt-2">
      <TextInput
        placeholder=" "
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        multiline
        numberOfLines={4}
        className="block px-4 pb-2.5 pt-6 w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-xl focus:border-primary min-h-[100px]"
        style={{ textAlignVertical: 'top' }}
      />
      <Text
        style={{
          position: 'absolute',
          top: isFocused || value ? 4 : 18,
          left: 16,
          fontSize: isFocused || value ? 10 : 14,
          color: '#6b7280',
          backgroundColor: 'white',
          paddingHorizontal: 4,
        }}
        pointerEvents="none"
      >
        {label}
      </Text>
    </View>
  );
};

// Simple month/year picker modal
const MonthYearPicker = ({ visible, currentDate, onSelect, onClose }: any) => {
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({ length: 2 }, (_, i) => new Date().getFullYear() + i);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6">
          <Text className="text-lg font-bold mb-4 text-center">Select Month & Year</Text>
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1">
              <Text className="text-sm text-gray-500 mb-2">Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {months.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setSelectedMonth(i)}
                    className={`px-4 py-2 mr-2 rounded-full ${i === selectedMonth ? 'bg-primary' : 'bg-gray-100'}`}
                  >
                    <Text className={i === selectedMonth ? 'text-white font-medium' : 'text-gray-700'}>{m.slice(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500 mb-2">Year</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setSelectedYear(y)}
                    className={`px-4 py-2 mr-2 rounded-full ${y === selectedYear ? 'bg-primary' : 'bg-gray-100'}`}
                  >
                    <Text className={y === selectedYear ? 'text-white font-medium' : 'text-gray-700'}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              onSelect(new Date(selectedYear, selectedMonth, 1));
              onClose();
            }}
            className="bg-primary py-3 rounded-xl items-center"
          >
            <Text className="text-white font-bold">Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="py-3 mt-2 items-center">
            <Text className="text-gray-500">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Auth & Cart stores
  const { user, token, isInitialized } = useAuthStore();
  const {
    items,
    getTotalPrice,
    checkoutState,
    clearCart,
    getItemCount,
  } = useCartStore();

  const { couponCode, couponDiscount, useCoins, coinDiscount } = checkoutState;
  const totalPrice = getTotalPrice();
  const itemCount = getItemCount();

  // States
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [earnRate, setEarnRate] = useState(2);

  // Form
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [mealTime, setMealTime] = useState<'lunch' | 'dinner'>('lunch');
  const [instructions, setInstructions] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Error modal
  const [timeValidationError, setTimeValidationError] = useState({ show: false, title: '', message: '' });

  // Animations
  const savingsOpacity = useRef(new Animated.Value(0)).current;
  const savingsTranslateY = useRef(new Animated.Value(-10)).current;

  // Auth & cart guards
  useEffect(() => {
    if (isInitialized) {
      if (!user || !token) {
        toast.error('Please login to checkout.');
        router.push('/login');
      } else if (itemCount === 0) {
        router.push('/(shop)/');
      }
    }
  }, [isInitialized, user, token, itemCount, router]);

  // Fetch addresses & wallet
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !token) return;
      try {
        // Addresses
        const addrRes = await fetch(`${API_URL}/user/addresses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const addrData = await addrRes.json();
        if (addrData.success && addrData.addresses) {
          setAddresses(addrData.addresses);
          const defaultAddr = addrData.addresses.find((a: any) => a.isDefault) || addrData.addresses;
          if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        }

        // Wallet
        const walletRes = await fetch(`${API_URL}/wallet`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const walletData = await walletRes.json();
        if (walletData.success && walletData.wallet) {
          const totalSpent = walletData.wallet.totalSpent || 0;
          if (totalSpent >= 15000) setEarnRate(6);
          else if (totalSpent >= 5000) setEarnRate(4);
          else setEarnRate(2);
        }
      } catch (error) {
        console.log('Fetch error:', error);
      }
    };
    fetchData();
  }, [user, token]);

  // Animation for coin toggle
  useEffect(() => {
    Animated.parallel([
      Animated.timing(savingsOpacity, {
        toValue: useCoins ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(savingsTranslateY, {
        toValue: useCoins ? 0 : -10,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [useCoins]);

  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('home')) return <Home size={20} color="#fff" />;
    if (n.includes('work') || n.includes('office')) return <Briefcase size={20} color="#fff" />;
    return <MapPin size={20} color="#fff" />;
  };

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);
  const currentDeliveryFee = orderType === 'delivery' ? (selectedAddress?.deliveryFee || 0) : 0;
  const coinDiscountAmount = useCoins ? (coinDiscount || 0) : 0;
  const finalTotal = Math.max(0, totalPrice + currentDeliveryFee - couponDiscount - coinDiscountAmount);

  const handleSubmit = async () => {
    // Validation
    if (orderType === 'delivery' && !selectedAddress) {
      toast.error('Please select a delivery address.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!selectedDate) {
      toast.error('Please select a preferred date.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!agreedToTerms) {
      toast.error('You must agree to the Terms and Conditions.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Time cut-off
    const now = new Date();
    const isToday =
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate();
    if (isToday) {
      const hour = now.getHours();
      if (mealTime === 'lunch' && hour >= 9) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeValidationError({
          show: true,
          title: 'Time Limit Exceeded!',
          message: "Today's lunch orders are accepted until 9 AM only. Please select a future date.",
        });
        return;
      }
      if (mealTime === 'dinner' && hour >= 18) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
        preferredDate: format(selectedDate, 'yyyy-MM-dd'),
        mealTime,
        instructions,
        terms: agreedToTerms,
        name: user?.name || 'Customer',
        altPhone: user?.phone || '',
        items,
        subtotal: totalPrice,
        deliveryFee: currentDeliveryFee,
        total: finalTotal,
        discount: couponDiscount + coinDiscountAmount,
        couponCode,
        useCoins,
        orderType,
        address: selectedAddress ? selectedAddress.address : 'Store Pickup',
        deliveryAddress: selectedAddress ? selectedAddress.address : undefined,
        coordinates: selectedAddress ? selectedAddress.coordinates : null,
      };

      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearCart();

      // Navigate to orders page
      router.replace('/(shop)/account/orders');
      toast.success('Order placed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized || !user || itemCount === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  // Date display string
  const dateDisplay = selectedDate
    ? format(selectedDate, 'MMM do, yyyy')
    : 'Select Date';

  // Marked dates for calendar
  const markedDates: any = {};
  if (selectedDate) {
    markedDates[format(selectedDate, 'yyyy-MM-dd')] = {
      selected: true,
      selectedColor: '#e11d48',
      selectedTextColor: 'white',
    };
  }

  // Disable past dates
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Time validation error modal */}
      <Modal visible={timeValidationError.show} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <View className="flex-row items-center gap-2 mb-3">
              <AlertCircle size={24} color="#ef4444" />
              <Text className="text-red-500 font-bold text-lg">{timeValidationError.title}</Text>
            </View>
            <Text className="text-gray-600 mb-6">{timeValidationError.message}</Text>
            <TouchableOpacity
              onPress={() => setTimeValidationError({ show: false, title: '', message: '' })}
              className="bg-primary py-3 rounded-xl items-center"
            >
              <Text className="text-white font-bold">I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
      >
        <Text className="text-3xl font-extrabold text-gray-900 mt-6 mb-6 text-center">
          Final Checkout
        </Text>

        {/* Collapsible Order Summary (mobile) */}
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="flex-row items-center justify-between p-4 bg-gray-50"
          >
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold text-gray-900 text-base">Order Summary</Text>
              {isSummaryExpanded ? (
                <ChevronUp size={16} color="#4b5563" />
              ) : (
                <ChevronDown size={16} color="#4b5563" />
              )}
            </View>
            <Text className="font-bold text-lg text-primary">{formatPrice(finalTotal)}</Text>
          </TouchableOpacity>
          {isSummaryExpanded && (
            <View className="p-4 border-t border-gray-100">
              {items.map((item) => (
                <View key={item.id} className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 flex-1" numberOfLines={1}>
                    {item.quantity}x {item.name}
                  </Text>
                  <Text className="font-medium">{formatPrice(item.price * item.quantity)}</Text>
                </View>
              ))}
              <View className="h-px bg-gray-100 my-3" />
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500">Subtotal</Text>
                <Text>{formatPrice(totalPrice)}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500">
                  Delivery Fee {orderType === 'pickup' && '(Pickup)'}
                </Text>
                <Text className={currentDeliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                  {orderType === 'pickup'
                    ? 'Free'
                    : currentDeliveryFee === 0
                    ? 'Free'
                    : formatPrice(currentDeliveryFee)}
                </Text>
              </View>
              {couponDiscount > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-green-600">
                    <Ticket size={12} color="#16a34a" /> Coupon
                  </Text>
                  <Text className="text-green-600">-{formatPrice(couponDiscount)}</Text>
                </View>
              )}
              {coinDiscountAmount > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-amber-600">
                    <Coins size={12} color="#d97706" /> Coins
                  </Text>
                  <Text className="text-amber-600">-{formatPrice(coinDiscountAmount)}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Delivery Method Selection */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">Delivery Method</Text>
          <View className="flex-row bg-gray-200/60 p-1 rounded-2xl border border-gray-200">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setOrderType('delivery')}
              className={`flex-1 h-12 justify-center items-center rounded-xl ${
                orderType === 'delivery' ? 'bg-white shadow-sm border border-primary/10' : ''
              }`}
            >
              <Text
                className={`font-semibold ${
                  orderType === 'delivery' ? 'text-primary' : 'text-gray-500'
                }`}
              >
                Delivery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setOrderType('pickup')}
              className={`flex-1 h-12 justify-center items-center rounded-xl ${
                orderType === 'pickup' ? 'bg-white shadow-sm border border-primary/10' : ''
              }`}
            >
              <Text
                className={`font-semibold ${
                  orderType === 'pickup' ? 'text-primary' : 'text-gray-500'
                }`}
              >
                Pickup
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Selection (Delivery) */}
        {orderType === 'delivery' ? (
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-900">Select Delivery Address</Text>
              <TouchableOpacity
                onPress={() => router.push('/account/addresses')}
                className="flex-row items-center"
              >
                <Plus size={16} color="#e11d48" />
                <Text className="text-primary font-medium text-sm ml-1">Add New</Text>
              </TouchableOpacity>
            </View>

            {addresses.length === 0 ? (
              <View className="py-8 bg-gray-100 rounded-2xl border border-dashed border-gray-300 items-center">
                <MapPin size={40} color="#9ca3af" />
                <Text className="text-gray-500 mt-3 mb-3">No saved addresses found.</Text>
                <TouchableOpacity
                  onPress={() => router.push('/account/addresses')}
                  className="bg-primary px-6 py-2 rounded-lg"
                >
                  <Text className="text-white font-bold">Add Address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-3">
                {addresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedAddressId(addr.id);
                    }}
                    className={`flex-row border rounded-2xl p-4 ${
                      selectedAddressId === addr.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <View
                      className={`h-10 w-10 rounded-xl items-center justify-center mr-4 ${
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
                      <View className="mt-2 flex-row items-center gap-2">
                        <View className="bg-gray-100 px-2 py-0.5 rounded">
                          <Text className="text-xs text-gray-600 font-medium">
                            Dist: {addr.distanceText}
                          </Text>
                        </View>
                        <View
                          className={`px-2 py-0.5 rounded ${
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
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View className="mb-6 p-5 border border-blue-100 rounded-xl bg-blue-50/50 items-center">
            <Text className="font-medium text-blue-900 text-center mb-2">
              Store Location: Janai, Garbagan, Hooghly (PIN: 712304)
            </Text>
            <View className="flex-row items-center gap-1">
              <MapPin size={16} color="#e11d48" />
              <Text className="text-primary font-medium underline">Pickup from Store</Text>
            </View>
          </View>
        )}

        {/* Preferred Date & Meal Time */}
        <Text className="text-lg font-bold text-gray-900 mb-3">Preferences</Text>
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-xs text-gray-500 ml-1 mb-1 font-medium">Date</Text>
            <TouchableOpacity
              onPress={() => setShowCalendar(true)}
              className="h-12 border border-gray-200 bg-white rounded-xl flex-row items-center px-4 justify-between"
            >
              <Text className={selectedDate ? 'text-gray-900' : 'text-gray-400'}>
                {dateDisplay}
              </Text>
              <CalendarIcon size={16} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            <Text className="text-xs text-gray-500 ml-1 mb-1 font-medium">Time</Text>
            <View className="flex-row bg-gray-200/60 p-1 rounded-xl border border-gray-200">
              <TouchableOpacity
                onPress={() => setMealTime('lunch')}
                className={`flex-1 h-9 justify-center items-center rounded-lg ${
                  mealTime === 'lunch' ? 'bg-white shadow-sm border border-gray-100' : ''
                }`}
              >
                <Text
                  className={`font-medium text-sm ${
                    mealTime === 'lunch' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  Lunch
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMealTime('dinner')}
                className={`flex-1 h-9 justify-center items-center rounded-lg ${
                  mealTime === 'dinner' ? 'bg-white shadow-sm border border-gray-100' : ''
                }`}
              >
                <Text
                  className={`font-medium text-sm ${
                    mealTime === 'dinner' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  Dinner
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Calendar Modal */}
        <Modal visible={showCalendar} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl p-4 h-3/4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold">Select Delivery Date</Text>
                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Month/Year Quick Select */}
              <TouchableOpacity
                onPress={() => setShowMonthPicker(true)}
                className="flex-row items-center justify-center mb-4 bg-gray-100 py-2 px-4 rounded-xl"
              >
                <Text className="text-base font-medium">
                  {format(currentMonth, 'MMMM yyyy')}
                </Text>
                <ChevronDown size={16} color="#4b5563" className="ml-2" />
              </TouchableOpacity>

              <CalendarList
                // Use CalendarList for horizontal swipe
                current={format(currentMonth, 'yyyy-MM-dd')}
                minDate={todayStr}
                onDayPress={(day: any) => {
                  const picked = new Date(day.dateString);
                  setSelectedDate(picked);
                  setShowCalendar(false);
                }}
                markedDates={{
                  ...markedDates,
                  [todayStr]: { disabled: true, disableTouchEvent: true },
                }}
                monthFormat={'MMMM yyyy'}
                hideDayNames={false}
                pastScrollRange={0}
                futureScrollRange={12}
                scrollEnabled={true}
                horizontal={true}
                pagingEnabled={true}
                style={{ flex: 1 }}
                theme={{
                  todayTextColor: '#e11d48',
                  selectedDayBackgroundColor: '#e11d48',
                  arrowColor: '#e11d48',
                }}
                onVisibleMonthsChange={(months: any) => {
                  if (months.length > 0) {
                    setCurrentMonth(new Date(months[0].dateString));
                  }
                }}
              />
            </View>
          </View>
        </Modal>

        {/* Month/Year Picker Modal */}
        <MonthYearPicker
          visible={showMonthPicker}
          currentDate={currentMonth}
          onSelect={(date: Date) => {
            setCurrentMonth(date);
            setShowMonthPicker(false);
          }}
          onClose={() => setShowMonthPicker(false)}
        />

        {/* Instructions */}
        <View className="mb-6">
          <FloatingLabelTextarea
            value={instructions}
            onChangeText={setInstructions}
            label="Cooking Instructions (Optional)"
          />
        </View>

        {/* Terms & Conditions */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAgreedToTerms(!agreedToTerms);
          }}
          className="flex-row items-center gap-3 p-4 bg-gray-100 rounded-xl border border-gray-200 mb-8"
        >
          {agreedToTerms ? (
            <CheckSquare size={24} color="#e11d48" />
          ) : (
            <Square size={24} color="#9ca3af" />
          )}
          <Text className="flex-1 text-sm text-gray-600">
            I agree to the{' '}
            <Text className="text-primary underline font-medium">Terms & Conditions</Text> and Refund
            Policy.
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting || (orderType === 'delivery' && !selectedAddress)}
          activeOpacity={0.9}
          className={`h-14 rounded-xl flex-row items-center justify-center shadow-lg ${
            isSubmitting || (orderType === 'delivery' && !selectedAddress)
              ? 'bg-primary/60'
              : 'bg-primary shadow-primary/30'
          }`}
        >
          {isSubmitting ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#fff" size="small" />
              <Text className="text-white font-bold text-lg">Placing Order...</Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-lg">
              Place Order — {formatPrice(finalTotal)}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}