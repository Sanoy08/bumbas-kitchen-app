// src/app/(shop)/checkout/final.tsx

import { useAlert, SavingsBanner } from '@/shared/components/ui';
import { formatPrice, cleanAddress } from '@/shared/utils/utils';
import { useAuthStore } from '@/shared/store/authStore';
import { useCartStore } from '@/shared/store/cartStore';
import { format, isSameDay, startOfDay } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,

  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Lock,
  MapPin,
  Plus,
  X,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef, memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Easing,
  Dimensions,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolateColor,
  withSequence,
} from 'react-native-reanimated';
import { toast } from 'sonner-native';

const { width: screenWidth } = Dimensions.get('window');

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

// --- Floating Label Input ---
const FloatingLabelInput = ({
  label,
  value,
  onChangeText,
  multiline = false,
  onFocus,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  onFocus?: () => void;
}) => {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.length > 0;
  
  const animatedFloat = useRef(new Animated.Value(isFloating ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedFloat, {
      toValue: isFloating ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFloating]);

  const labelStyle = {
    top: animatedFloat.interpolate({
      inputRange: [0, 1],
      outputRange: [14, 4], // Moved higher up to 4px instead of 8px so it sits better
    }),
    fontSize: animatedFloat.interpolate({
      inputRange: [0, 1],
      outputRange: [14, 11], // 14px to 11px
    }),
    color: animatedFloat.interpolate({
      inputRange: [0, 1],
      outputRange: ['#6b7280', '#e11d48'], // gray-500 to primary
    }),
  };

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
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        placeholder=""
      />
      <Animated.Text
        className="absolute left-4"
        style={labelStyle}
      >
        {label}
      </Animated.Text>
    </View>
  );
};

// --- SwipeableCalendar ---
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
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 5, 1);

  const isPrevDisabled = 
    viewDate.getFullYear() === today.getFullYear() && 
    viewDate.getMonth() === today.getMonth();

  const isNextDisabled = 
    viewDate.getFullYear() > maxDate.getFullYear() || 
    (viewDate.getFullYear() === maxDate.getFullYear() && viewDate.getMonth() >= maxDate.getMonth());

  const handleMonthChange = (monthIndex: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(monthIndex);
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

    // Pad the end to always have exactly 42 cells (6 rows) so the calendar height never jumps
    while (days.length < 42) {
      days.push(null);
    }

    return days;
  };

  const days = generateDays();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const renderDay = (date: Date | null, index: number) => {
    if (!date) {
      return <View key={`empty-${index}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
    }
    const isSelected = selected && isSameDay(date, selected);
    const isToday = isSameDay(date, new Date());
    const isDisabled = date < startOfDay(new Date());

    return (
      <View key={date.toISOString()} style={{ width: '14.28%', aspectRatio: 1, padding: 4 }}>
        <TouchableOpacity
          onPress={() => {
            if (!isDisabled) {
              onSelect(date);
              onClose();
            }
          }}
          disabled={isDisabled}
          activeOpacity={0.7}
          className={`flex-1 rounded-full items-center justify-center ${
            isSelected ? 'bg-primary shadow-sm' : isToday ? 'bg-primary/10 border border-primary/20' : 'bg-gray-50'
          } ${isDisabled ? 'opacity-20' : ''}`}
          style={isSelected ? { shadowColor: '#e11d48', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 } : {}}
        >
          <Text
            className={`text-[15px] font-bold font-sans ${
              isSelected ? 'text-white' : isToday ? 'text-primary' : 'text-gray-800'
            }`}
          >
            {date.getDate()}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="w-full">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6 pt-2">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => !isPrevDisabled && handleMonthChange(viewDate.getMonth() - 1)}
          disabled={isPrevDisabled}
          className={`w-10 h-10 bg-gray-100 rounded-full items-center justify-center ${isPrevDisabled ? 'opacity-30' : ''}`}
        >
          <ChevronLeft size={20} color="#374151" />
        </TouchableOpacity>

        <Text className="text-xl font-extrabold text-gray-900 font-sans tracking-tight">
          {months[viewDate.getMonth()]} {viewDate.getFullYear()}
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => !isNextDisabled && handleMonthChange(viewDate.getMonth() + 1)}
          disabled={isNextDisabled}
          className={`w-10 h-10 bg-gray-100 rounded-full items-center justify-center ${isNextDisabled ? 'opacity-30' : ''}`}
        >
          <ChevronRight size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <View className="w-full">
        {/* Days of Week */}
        <View className="flex-row w-full mb-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
            <View key={i} style={{ width: '14.28%' }} className="items-center justify-center py-2">
              <Text className="text-[11px] text-gray-400 font-extrabold uppercase tracking-wider font-sans">{day}</Text>
            </View>
          ))}
        </View>
        
        {/* Calendar Grid */}
        <View className="flex-row flex-wrap w-full">
          {days.map((date, idx) => renderDay(date, idx))}
        </View>
      </View>
    </View>
  );
};

// --- Swipe To Order Button ---
const SWIPE_BUTTON_WIDTH = screenWidth - 64; // px-4 on ScrollView (32) + p-4 on wrapper (32)
const SWIPE_KNOB_SIZE = 56;
const MAX_SWIPE = SWIPE_BUTTON_WIDTH - SWIPE_KNOB_SIZE - 8; // 8 for padding

const SwipeToOrderButton = ({ onSwipeComplete, isSubmitting, total }: { onSwipeComplete: (reset: () => void) => void, isSubmitting: boolean, total: number }) => {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const resetSlider = () => {
    translateX.value = withSpring(0);
  };

  const panGesture = Gesture.Pan()
    .enabled(!isSubmitting)
    .onStart(() => {
      startX.value = translateX.value;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((event) => {
      let nextX = startX.value + event.translationX;
      if (nextX < 0) nextX = 0;
      if (nextX > MAX_SWIPE) nextX = MAX_SWIPE;
      translateX.value = nextX;
    })
    .onEnd(() => {
      if (translateX.value > MAX_SWIPE * 0.8) {
        translateX.value = withSpring(MAX_SWIPE, { overshootClamping: true });
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(onSwipeComplete)(resetSlider);
      } else {
        translateX.value = withSpring(0);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Rigid);
      }
    });

  const animatedKnobStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedTrackStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value + SWIPE_KNOB_SIZE + 4,
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: 1 - translateX.value / (MAX_SWIPE * 0.5),
    };
  });

  return (
    <View className="h-[64px] bg-gray-50 rounded-full justify-center px-1 border border-gray-200 overflow-hidden relative shadow-inner" style={{ elevation: 1 }}>
      {/* Background Track when swiped */}
      <Reanimated.View className="absolute left-1 top-1 bottom-1 bg-primary/10 rounded-full" style={animatedTrackStyle} />
      
      {/* Background Text */}
      <Reanimated.View className="absolute inset-0 items-center justify-center pointer-events-none flex-row" style={animatedTextStyle}>
        <Text className="text-primary font-bold text-base ml-8">Swipe to Place Order</Text>
        <ChevronRight size={20} color="#e11d48" className="ml-1 opacity-50" />
        <ChevronRight size={20} color="#e11d48" className="-ml-2 opacity-30" />
      </Reanimated.View>

      {/* Draggable Knob */}
      <GestureDetector gesture={panGesture}>
        <Reanimated.View 
          className={`h-[56px] w-[56px] rounded-full items-center justify-center shadow-md z-10 ${isSubmitting ? 'bg-gray-300' : 'bg-primary'}`}
          style={animatedKnobStyle}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <ChevronRight size={28} color="white" />
          )}
        </Reanimated.View>
      </GestureDetector>
    </View>
  );
};

// --- Segmented Control ---
const SegmentedControl = ({ value, onChange, disabled, lunchDisabled, dinnerDisabled, onDisabledPress }: { value: 'lunch' | 'dinner', onChange: (val: 'lunch' | 'dinner') => void, disabled?: boolean, lunchDisabled?: boolean, dinnerDisabled?: boolean, onDisabledPress?: (type: 'lunch' | 'dinner') => void }) => {
  const animatedStylePercent = useAnimatedStyle(() => {
    return {
      left: withTiming(value === 'lunch' ? '1%' : '51%', { duration: 250 }),
    };
  });

  return (
    <View className={`flex-row h-12 bg-gray-100 rounded-xl p-1 relative ${disabled ? 'opacity-50' : ''}`}>
      <Reanimated.View className="absolute top-1 bottom-1 w-[48%] bg-white rounded-lg shadow-sm" style={[animatedStylePercent, { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }]} />
      
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (disabled || lunchDisabled) {
            onDisabledPress?.('lunch');
          } else {
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            onChange('lunch');
          }
        }}
        className="flex-1 items-center justify-center z-10"
      >
        <Text className={`font-bold ${value === 'lunch' ? 'text-gray-900' : 'text-gray-500'}`}>Lunch</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (disabled || dinnerDisabled) {
            onDisabledPress?.('dinner');
          } else {
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            onChange('dinner');
          }
        }}
        className="flex-1 items-center justify-center z-10"
      >
        <Text className={`font-bold ${value === 'dinner' ? 'text-gray-900' : 'text-gray-500'}`}>Dinner</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- Helper for Icons ---
const getIcon = (name: string, isSelected: boolean) => {
  const color = isSelected ? '#ffffff' : '#e11d48';
  const n = name.toLowerCase();
  if (n.includes('home')) return <Home size={20} color={color} />;
  return <MapPin size={20} color={color} />;
};

// --- Compact Address Card (Main Screen) ---
const CompactAddressCard = ({ addr, onPress, getIcon }: { addr: any, onPress: () => void, getIcon: (name: string, isSelected: boolean) => React.ReactNode }) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={onPress}
      className="bg-rose-50/40 rounded-[20px] p-4 flex-row items-center justify-between border border-rose-100"
    >
      <View className="flex-row items-center flex-1">
        <View className="h-10 w-10 rounded-full items-center justify-center bg-white shadow-sm mr-3">
          {getIcon(addr?.name || '', false)}
        </View>
        <View className="flex-1 mr-2">
          <Text className="font-bold text-gray-900 text-base">{addr?.name || 'Select Address'}</Text>
          <Text className="text-xs text-gray-600 mt-0.5" numberOfLines={1}>
            {addr?.address ? cleanAddress(addr.address) : 'Choose a delivery location'}
          </Text>
        </View>
      </View>
      <View className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
        <Text className="text-xs font-bold text-primary">Change</Text>
      </View>
    </TouchableOpacity>
  );
};

// --- Modal Address Item ---
const ModalAddressItem = ({ addr, isSelected, onPress, getIcon }: { addr: any, isSelected: boolean, onPress: (id: string) => void, getIcon: (name: string, isSelected: boolean) => React.ReactNode }) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(addr.id); }}
      className={`flex-row items-center p-4 mb-3 rounded-[20px] border ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white'}`}
    >
      <View className={`h-12 w-12 rounded-full items-center justify-center mr-4 ${isSelected ? 'bg-primary' : 'bg-gray-50'}`}>
        {getIcon(addr.name, isSelected)}
      </View>
      <View className="flex-1">
        <Text className={`font-bold text-base ${isSelected ? 'text-primary' : 'text-gray-900'}`}>{addr.name}</Text>
        <Text className="text-xs text-gray-500 mt-1 leading-relaxed" numberOfLines={2}>{cleanAddress(addr.address)}</Text>
        
        {/* Badges */}
        <View className="flex-row mt-2 space-x-2">
          {addr.distanceText && (
            <View className="bg-gray-100 px-2 py-0.5 rounded-md">
              <Text className="text-[10px] text-gray-600 font-medium">{addr.distanceText}</Text>
            </View>
          )}
          <View className={`px-2 py-0.5 rounded-md ${addr.deliveryFee === 0 ? 'bg-green-100' : 'bg-orange-100'}`}>
            <Text className={`text-[10px] font-bold ${addr.deliveryFee === 0 ? 'text-green-700' : 'text-orange-700'}`}>
              {addr.deliveryFee === 0 ? 'FREE' : formatPrice(addr.deliveryFee)}
            </Text>
          </View>
        </View>
      </View>
      {isSelected && (
        <View className="h-6 w-6 rounded-full bg-primary items-center justify-center ml-2">
          <Check size={14} color="#ffffff" strokeWidth={3} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// --- Simple Checkbox ---
const SimpleCheckbox = ({ checked, onPress }: { checked: boolean, onPress: () => void }) => {
  return (
    <TouchableOpacity 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }} 
      activeOpacity={0.8}
      className={`h-6 w-6 rounded-md border-2 items-center justify-center ${checked ? 'bg-primary border-primary' : 'bg-white border-gray-400'}`}
    >
      {checked && <Check size={14} color="white" strokeWidth={3} />}
    </TouchableOpacity>
  );
};

// --- Main Screen ---
export function FinalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  const { user, isInitialized } = useAuthStore();
  const { items, getTotalPrice, getItemCount, checkoutState } = useCartStore();

  const { couponCode, couponDiscount, useCoins, coinDiscount: savedCoinDiscount } = checkoutState;

  // Always delivery – no toggle
  const orderType = 'delivery';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [mealTime, setMealTime] = useState<'lunch' | 'dinner'>('lunch');
  const [instructions, setInstructions] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const specialOfferItem = items.find((item) => item.isSpecialOffer);

  useEffect(() => {
    if (specialOfferItem) {
      if (specialOfferItem.deliveryDate) {
        setPreferredDate(new Date(specialOfferItem.deliveryDate));
      }
      if (specialOfferItem.mealType === 'lunch' || specialOfferItem.mealType === 'dinner') {
        setMealTime(specialOfferItem.mealType);
      }
    }
  }, [specialOfferItem]);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const calendarSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const addressSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  const openCalendar = () => {
    setIsCalendarOpen(true);
    calendarSlideAnim.setValue(Dimensions.get('window').height);
    Animated.timing(calendarSlideAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  };

  const closeCalendar = () => {
    Animated.timing(calendarSlideAnim, {
      toValue: Dimensions.get('window').height,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setIsCalendarOpen(false));
  };

  const openAddressModal = () => {
    setIsAddressModalOpen(true);
    addressSlideAnim.setValue(Dimensions.get('window').height);
    Animated.timing(addressSlideAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  };

  const closeAddressModal = () => {
    Animated.timing(addressSlideAnim, {
      toValue: Dimensions.get('window').height,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease),
    }).start(() => {
      setIsAddressModalOpen(false);
      addressSlideAnim.setValue(Dimensions.get('window').height);
    });
  };

  const toggleAddressSelection = useCallback((id: string) => {
    setSelectedAddressId(id);
    closeAddressModal();
  }, [addressSlideAnim]);

  const handleAddAddress = () => {
    router.push('/account/addresses');
  };

  const handleDateSelect = (date: Date) => {
    setPreferredDate(date);
    closeCalendar();
  };

  // --- Glow Animations for Validation ---
  const addressGlow = useSharedValue(0);
  const dateGlow = useSharedValue(0);
  const termsGlow = useSharedValue(0);

  const triggerGlow = (val: any) => {
    val.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 300 }),
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );
  };

  const createGlowStyle = (val: any, defaultBorder: string) => {
    return useAnimatedStyle(() => {
      // Interpolate isn't easily done with string hexes in reanimated v2 without processColor, 
      // but we can just use opacity of a red border.
      // Easiest is to add a wrapper or just change background color.
      // Let's change the background color slightly to red.
      return {
        backgroundColor: interpolateColor(
          val.value,
          [0, 1],
          ['#ffffff', '#fee2e2'] // white to light red
        ),
        borderColor: interpolateColor(
          val.value,
          [0, 1],
          [defaultBorder, '#ef4444']
        )
      };
    });
  };

  const addressGlowStyle = createGlowStyle(addressGlow, 'transparent');
  const dateGlowStyle = createGlowStyle(dateGlow, 'transparent');
  const termsGlowStyle = createGlowStyle(termsGlow, '#e5e7eb');

  const [timeValidationError, setTimeValidationError] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: '', message: '' });

  const [baseTotalSpent, setBaseTotalSpent] = useState(0);

  const totalPrice = getTotalPrice();
  const itemCount = getItemCount();
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const currentDeliveryFee = selectedAddress?.deliveryFee || 0;
  const coinDiscountAmount = useCoins ? savedCoinDiscount || 0 : 0;
  const finalTotal = Math.max(0, totalPrice + currentDeliveryFee - couponDiscount - coinDiscountAmount);

  // Dynamically calculate earnRate including current order amount (Matches backend logic)
  const currentTotalSpent = baseTotalSpent + finalTotal;
  let earnRate = 2;
  if (currentTotalSpent >= 15000) earnRate = 6;
  else if (currentTotalSpent >= 5000) earnRate = 4;

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
          setBaseTotalSpent(dataWallet.wallet.totalSpent || 0);
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
      showAlert({
        title: 'Login Required',
        message: 'Please login to checkout.',
        confirmText: 'Login Now',
        cancelText: '',
        onConfirm: () => router.replace('/(auth)/login')
      });
    }
    if (isInitialized && itemCount === 0 && !isSuccess) {
      router.replace('/(shop)');
    }
  }, [isInitialized, user, itemCount, isSuccess]);

  const handlePlaceOrder = async (resetSlider?: () => void) => {
    // Validate special offers cutoff times and meal types
    for (const item of items) {
      if (item.isSpecialOffer) {
        if (item.orderCutoffTime && new Date() > new Date(item.orderCutoffTime)) {
          resetSlider?.();
          showAlert({
            title: "Time Limit Exceeded",
            message: `The order deadline for ${item.name} has passed. Please remove it from your cart.`,
            cancelText: ""
          });
          return;
        }
        if (item.mealType && item.mealType !== 'both' && item.mealType !== mealTime) {
          resetSlider?.();
          showAlert({
            title: "Invalid Meal Time",
            message: `${item.name} is only available for ${item.mealType}. Please change your meal time selection or remove the item.`,
            cancelText: ""
          });
          return;
        }
      }
    }

    if (!selectedAddress) {
      resetSlider?.();
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setTimeout(() => triggerGlow(addressGlow), 300);
      showAlert({
        title: 'Address Missing',
        message: 'Please select a delivery address.',
        confirmText: 'OK',
        cancelText: ''
      });
      return;
    }

    if (!preferredDate) {
      resetSlider?.();
      scrollViewRef.current?.scrollTo({ y: 150, animated: true });
      setTimeout(() => triggerGlow(dateGlow), 300);
      showAlert({
        title: 'Date Missing',
        message: 'Please select a preferred date.',
        confirmText: 'OK',
        cancelText: ''
      });
      return;
    }

    if (!termsAccepted) {
      resetSlider?.();
      scrollViewRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => triggerGlow(termsGlow), 300);
      showAlert({
        title: 'Terms & Conditions',
        message: 'Please agree to the Terms and Conditions.',
        confirmText: 'OK',
        cancelText: ''
      });
      return;
    }

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const selectedDateStr = format(preferredDate, 'yyyy-MM-dd');
    const currentHour = today.getHours();

    if (selectedDateStr === todayStr) {
      if (mealTime === 'lunch' && currentHour >= 9) {
        resetSlider?.();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeValidationError({
          show: true,
          title: 'Time Limit Exceeded!',
          message: "Today's lunch orders are accepted until 9 AM only. Please select a future date.",
        });
        return;
      }
      if (mealTime === 'dinner' && currentHour >= 18) {
        resetSlider?.();
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
      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error('Server error occurred');
      }

      if (!res.ok) throw new Error(data.error || 'Order placement failed');

      setIsSuccess(true);

      const orderNum = data.orderId || '0000';
      const eligibleAmountForCoins = Math.max(0, totalPrice - couponDiscount);
      const earnedCoins = Math.floor((eligibleAmountForCoins * earnRate) / 100);

      router.replace({
        pathname: '/(checkout)/success',
        params: {
          orderId: orderNum,
          name: user?.name || 'Guest',
          amount: finalTotal.toString(),
          coins: earnedCoins.toString(),
        },
      });
    } catch (error: any) {
      showAlert({
        title: 'Order Failed',
        message: error.message || 'Failed to place order.',
        confirmText: 'OK',
        cancelText: ''
      });
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

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <View className="flex-1 bg-gray-50">
        {/* Header */}
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100" style={{ zIndex: 50 }}>
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 font-sans ml-2">Final Checkout</Text>
      </View>

      <SavingsBanner amount={couponDiscount + savedCoinDiscount} staticDisplay={true} />

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >


        {/* Delivery Address Selection (Minimalist UI) */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3 px-1">Delivering To</Text>
          
          <Reanimated.View style={[addressGlowStyle, { borderRadius: 20 }]}>
            {addresses.length === 0 ? (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleAddAddress}
                className="py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 items-center justify-center flex-row space-x-2"
              >
                <Plus size={20} color="#e11d48" />
                <Text className="text-primary font-bold text-base">Add Delivery Address</Text>
              </TouchableOpacity>
            ) : (
              <CompactAddressCard 
                addr={selectedAddress} 
                onPress={openAddressModal} 
                getIcon={getIcon} 
              />
            )}
          </Reanimated.View>
        </View>

        {/* Preferences (Bento Box) */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3 px-1">Preferences</Text>
          <View className="bg-white rounded-[24px] p-1 shadow-sm border border-gray-100">
            <View className="p-4 flex-row space-x-4">
              <Reanimated.View style={[dateGlowStyle, { borderRadius: 12, flex: 1, borderWidth: 1 }]}>
                <Text className="text-xs text-gray-500 ml-1 mb-1 mt-1">Date</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (specialOfferItem && specialOfferItem.deliveryDate) {
                      showAlert({
                        title: "Action Disabled",
                        message: `Date is fixed to ${format(new Date(specialOfferItem.deliveryDate), 'MMM do')} for ${specialOfferItem.name}`,
                        cancelText: ""
                      });
                    } else {
                      openCalendar();
                    }
                  }}
                  className={`h-12 rounded-xl px-3 flex-row items-center justify-between ${
                    specialOfferItem && specialOfferItem.deliveryDate 
                      ? 'bg-gray-100' 
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Text className={preferredDate ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {preferredDate ? format(preferredDate, 'MMM do, yyyy') : 'Pick a date'}
                  </Text>
                  <CalendarIcon size={18} color="#9ca3af" />
                </TouchableOpacity>
              </Reanimated.View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 ml-1 mb-1 mt-1">Time</Text>
                <SegmentedControl
                  value={mealTime}
                  onChange={(val) => setMealTime(val)}
                  lunchDisabled={specialOfferItem && specialOfferItem.mealType === 'dinner'}
                  dinnerDisabled={specialOfferItem && specialOfferItem.mealType === 'lunch'}
                  onDisabledPress={(type) => {
                    showAlert({
                      title: "Action Disabled",
                      message: `${specialOfferItem?.name} is a ${type === 'lunch' ? 'dinner' : 'lunch'} special.`,
                      cancelText: ""
                    });
                  }}
                />
              </View>
            </View>

            <View className="p-4 border-t border-gray-100">
              <FloatingLabelInput
                label="Cooking Instructions (Optional)"
                value={instructions}
                onChangeText={setInstructions}
                multiline
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 250);
                }}
              />
            </View>
          </View>
        </View>

        {/* Terms */}
        <Reanimated.View 
          className="flex-row items-center p-4 rounded-2xl mb-6" 
          style={[termsGlowStyle, { borderWidth: 1, backgroundColor: '#f9fafb' }]}
        >
          <SimpleCheckbox checked={termsAccepted} onPress={() => setTermsAccepted(!termsAccepted)} />
          <View className="flex-1 ml-4">
            <Text className="text-sm text-gray-600">
              I agree to the{' '}
              <Text
                className="text-primary font-bold underline"
                onPress={() => router.push('/terms')}
              >
                Terms & Conditions
              </Text>
            </Text>
          </View>
        </Reanimated.View>

        {/* Swipe to Order (Non-floating) */}
        <View className="bg-white rounded-3xl p-4 mt-2 mb-8 shadow-sm border border-gray-100">
          <View className="flex-row justify-between mb-4 px-2">
            <Text className="text-gray-500 font-medium text-lg">Total to pay</Text>
            <Text className="text-2xl font-extrabold text-gray-900">{formatPrice(finalTotal)}</Text>
          </View>
          <SwipeToOrderButton onSwipeComplete={handlePlaceOrder} isSubmitting={isSubmitting} total={finalTotal} />
        </View>
      </ScrollView>

      {/* Premium Calendar Bottom Sheet Modal */}
      <Modal visible={isCalendarOpen} animationType="fade" transparent onRequestClose={closeCalendar}>
        <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-end">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCalendar} />
          
          <Animated.View 
            className="w-full flex-1 justify-end"
            style={{ transform: [{ translateY: calendarSlideAnim }], maxHeight: Dimensions.get('window').height * 0.88 }}
          >
            {/* Floating Close Button exactly outside the top */}
            <View className="items-center mb-4">
              <TouchableOpacity 
                onPress={closeCalendar} 
                activeOpacity={0.7}
                style={{ backgroundColor: '#000000', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
                className="shadow-2xl border-2 border-white/20"
              >
                <X size={28} color="white" />
              </TouchableOpacity>
            </View>

            <View className="bg-white rounded-t-[32px] pt-6 shadow-2xl flex-shrink" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
              <View className="mb-4 px-5">
                <Text className="text-xl font-extrabold text-gray-900 font-sans tracking-tight">Delivery Date</Text>
              </View>

              <SwipeableCalendar
                selected={preferredDate || undefined}
                onSelect={handleDateSelect}
                viewDate={viewDate}
                setViewDate={setViewDate}
                onClose={closeCalendar}
              />
            </View>
          </Animated.View>
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
                onPress={() => setTimeValidationError((prev) => ({ ...prev, show: false }))}
                className="w-full bg-gray-900 rounded-xl py-4 items-center"
              >
                <Text className="text-white font-bold text-base">Okay, got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      {/* Premium Address Selector Bottom Sheet */}
      <Modal visible={isAddressModalOpen} animationType="fade" transparent onRequestClose={closeAddressModal}>
        <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-end">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAddressModal} />
          
          <Animated.View 
            className="w-full flex-1 justify-end"
            style={{ transform: [{ translateY: addressSlideAnim }], maxHeight: Dimensions.get('window').height * 0.88 }}
          >
            {/* Floating Close Button exactly outside the top */}
            <View className="items-center mb-4">
              <TouchableOpacity 
                onPress={closeAddressModal} 
                activeOpacity={0.7}
                style={{ backgroundColor: '#000000', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
                className="shadow-2xl border-2 border-white/20"
              >
                <X size={28} color="white" />
              </TouchableOpacity>
            </View>

            <View className="bg-white rounded-t-[32px] pt-6 shadow-2xl flex-shrink">
              {/* Title */}
              <View className="mb-4 px-5">
                <Text className="text-xl font-extrabold text-gray-900 font-sans tracking-tight">Select Address</Text>
              </View>

              {/* Address List */}
            <ScrollView 
              className="px-5" 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
            >
              {addresses.map((addr) => (
                <ModalAddressItem
                  key={addr.id}
                  addr={addr}
                  isSelected={selectedAddressId === addr.id}
                  onPress={toggleAddressSelection}
                  getIcon={getIcon}
                />
              ))}

              {/* Add New Address Button inside Modal */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => {
                  closeAddressModal();
                  setTimeout(handleAddAddress, 300);
                }}
                className="flex-row items-center justify-center p-4 rounded-[20px] border border-dashed border-primary bg-primary/5 mt-2"
              >
                <Plus size={20} color="#e11d48" />
                <Text className="text-primary font-bold text-base ml-2">Add New Address</Text>
              </TouchableOpacity>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>

      </View>
    </View>
  );
}