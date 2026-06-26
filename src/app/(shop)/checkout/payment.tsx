// src/app/(shop)/checkout/payment.tsx

import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Link, useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  Coins,
  Home,
  Loader2,
  MapPin,
  Plus,
  Ticket,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import { optimizeImageUrl } from '@/lib/imageUtils';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

// ─── Helpers ──────────────────────────────────────────
const getAddressIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('home')) return <Home size={18} color="#6b7280" />;
  if (n.includes('work') || n.includes('office')) return <Briefcase size={18} color="#6b7280" />;
  return <MapPin size={18} color="#6b7280" />;
};

// ─── Components ──────────────────────────────────────
const SegmentButton = ({ selected, onPress, children }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    className={`flex-1 py-3 px-5 rounded-xl border ${
      selected ? 'bg-white border-primary shadow-sm' : 'bg-transparent border-gray-200'
    } items-center`}
  >
    <Text className={`font-semibold text-sm ${selected ? 'text-primary' : 'text-gray-500'}`}>
      {children}
    </Text>
  </TouchableOpacity>
);

const AddressCard = ({ address, isSelected, onSelect }: any) => (
  <TouchableOpacity
    onPress={onSelect}
    activeOpacity={0.8}
    className={`flex-row items-start p-4 mb-3 rounded-xl border ${
      isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
    }`}
  >
    <View className={`h-10 w-10 rounded-xl items-center justify-center mr-3 ${isSelected ? 'bg-primary' : 'bg-gray-100'}`}>
      {React.cloneElement(getAddressIcon(address.name), { color: isSelected ? '#fff' : '#6b7280' })}
    </View>
    <View className="flex-1">
      <View className="flex-row justify-between items-start">
        <Text className="font-bold text-gray-900 text-sm">{address.name}</Text>
        {isSelected && <Check size={16} color="#e11d48" />}
      </View>
      <Text className="text-xs text-gray-500 mt-1" numberOfLines={2}>
        {address.address}
      </Text>
      <View className="flex-row items-center mt-2 gap-2">
        <Text className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
          {address.distanceText}
        </Text>
        <Text className={`text-[10px] px-2 py-0.5 rounded font-bold ${
          address.deliveryFee === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
        }`}>
          {address.deliveryFee === 0 ? 'FREE' : `Fee: ${formatPrice(address.deliveryFee)}`}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isInitialized } = useAuthStore();
  const {
    items,
    getTotalPrice,
    checkoutState,
    setCheckoutData,
    clearCart,
  } = useCartStore();

  // Redirect if not logged in or cart empty (guard is in _layout but double check)
  if (isInitialized && (!user || items.length === 0)) {
    return <Redirect href="/(shop)/" />;
  }

  // ─── State ────────────────────────────────────────
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState<string>('');
  const [mealTime, setMealTime] = useState<'lunch' | 'dinner'>('lunch');
  const [instructions, setInstructions] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Time validation alert
  const [timeAlert, setTimeAlert] = useState({ show: false, title: '', message: '' });

  // Wallet
  const [walletBalance, setWalletBalance] = useState(0);

  // ─── Cart Totals ─────────────────────────────────
  const subtotal = getTotalPrice();
  const itemCount = items.length;

  const { couponCode, couponDiscount, useCoins } = checkoutState;

  // Compute coin discount amount
  const maxCoinDiscount = subtotal * 0.5;
  const coinDiscountAmount = useCoins ? Math.min(walletBalance, Math.floor(maxCoinDiscount)) : 0;

  // Delivery fee
  const selectedAddress = addresses.find(a => a.id === selectedAddressId);
  const deliveryFee = orderType === 'delivery' ? (selectedAddress?.deliveryFee ?? 0) : 0;

  // Final total
  const finalTotal = Math.max(0, subtotal + deliveryFee - couponDiscount - coinDiscountAmount);

  // ─── Fetch addresses & wallet ─────────────────
  useEffect(() => {
    if (!user) return;
    const fetchAddressesAndWallet = async () => {
      try {
        const resAddr = await fetch(`${API_URL}/user/addresses`);
        const dataAddr = await resAddr.json();
        if (dataAddr.success && dataAddr.addresses) {
          setAddresses(dataAddr.addresses);
          const defaultAddr = dataAddr.addresses.find((a: any) => a.isDefault) || dataAddr.addresses[0];
          if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        }
      } catch (e) {}
      try {
        const resWallet = await fetch(`${API_URL}/wallet`);
        const dataWallet = await resWallet.json();
        if (dataWallet.success && dataWallet.wallet) {
          setWalletBalance(dataWallet.wallet.balance || 0);
        } else if (dataWallet.success && dataWallet.balance) {
          setWalletBalance(dataWallet.balance);
        }
      } catch (e) {}
    };
    fetchAddressesAndWallet();
  }, [user]);

  // ─── Handlers ───────────────────────────────────
  const handleDatePress = () => {
    if (preferredDate) setTempDate(new Date(preferredDate));
    else setTempDate(new Date());
    setShowDatePicker(true);
  };

  const onDateSelected = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type !== 'dismissed' && selectedDate) {
      setPreferredDate(format(selectedDate, 'yyyy-MM-dd'));
      if (Platform.OS === 'android') setShowDatePicker(false);
    }
  };

  const confirmIOSDate = () => {
    setPreferredDate(format(tempDate, 'yyyy-MM-dd'));
    setShowDatePicker(false);
  };

  const handleMealTimeSelect = (time: 'lunch' | 'dinner') => setMealTime(time);

  // Place Order
  const handlePlaceOrder = async () => {
    if (orderType === 'delivery' && !selectedAddressId) {
      toast.error('Please select a delivery address');
      return;
    }
    if (!preferredDate) {
      toast.error('Please select a preferred date');
      return;
    }
    if (!termsAgreed) {
      toast.error('You must agree to the Terms & Conditions');
      return;
    }

    // Time validation (same as Next.js)
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const currentHour = today.getHours();

    if (preferredDate === todayStr) {
      if (mealTime === 'lunch' && currentHour >= 9) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeAlert({
          show: true,
          title: 'Time Limit Exceeded!',
          message: "Today's lunch orders are accepted until 9 AM only. Please select a future date.",
        });
        return;
      }
      if (mealTime === 'dinner' && currentHour >= 18) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeAlert({
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
        preferredDate,
        mealTime,
        instructions,
        name: user?.name || 'Customer',
        altPhone: user?.phone || '',
        items,
        subtotal,
        deliveryFee,
        total: finalTotal,
        discount: couponDiscount + coinDiscountAmount,
        couponCode: couponDiscount > 0 ? couponCode : '',
        useCoins,
        orderType,
        address: selectedAddress?.address || 'Store Pickup',
        deliveryAddress: selectedAddress?.address || undefined,
        coordinates: selectedAddress?.coordinates || null,
      };

      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order placement failed');

      clearCart();
      toast.success('Order Placed Successfully!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(shop)/account/orders');
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized)
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      {/* Time Validation Alert */}
      <Modal visible={timeAlert.show} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-4">
          <View className="bg-white w-full rounded-2xl p-6">
            <View className="flex-row items-center gap-2 mb-2">
              <AlertCircle size={24} color="#dc2626" />
              <Text className="text-lg font-bold text-red-600">{timeAlert.title}</Text>
            </View>
            <Text className="text-gray-600 mb-6">{timeAlert.message}</Text>
            <TouchableOpacity
              onPress={() => setTimeAlert({ show: false, title: '', message: '' })}
              className="bg-red-600 py-3 rounded-xl items-center"
            >
              <Text className="text-white font-bold">I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Checkout</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Delivery Method */}
        <Text className="text-base font-bold text-gray-900 mt-6 mb-3">Delivery Method</Text>
        <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
          <SegmentButton selected={orderType === 'delivery'} onPress={() => setOrderType('delivery')}>
            Delivery
          </SegmentButton>
          <SegmentButton selected={orderType === 'pickup'} onPress={() => setOrderType('pickup')}>
            Pickup
          </SegmentButton>
        </View>

        {/* Address Selection (Delivery) */}
        {orderType === 'delivery' ? (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-gray-900">Select Address</Text>
              <TouchableOpacity onPress={() => router.push('/(shop)/account/addresses')}>
                <View className="flex-row items-center">
                  <Plus size={16} color="#e11d48" />
                  <Text className="text-primary font-medium ml-1">Add New</Text>
                </View>
              </TouchableOpacity>
            </View>

            {addresses.length === 0 ? (
              <View className="items-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <MapPin size={40} color="#9ca3af" className="mb-3" />
                <Text className="text-gray-500 mb-4">No saved addresses found.</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(shop)/account/addresses')}
                  className="bg-primary px-6 py-2 rounded-xl"
                >
                  <Text className="text-white font-bold">Add Address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              addresses.map((addr: any) => (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  isSelected={selectedAddressId === addr.id}
                  onSelect={() => setSelectedAddressId(addr.id)}
                />
              ))
            )}
          </View>
        ) : (
          <View className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <Text className="font-bold text-blue-900 text-sm">Store Pickup Location</Text>
            <Text className="text-blue-800 mt-1">Janai, Garbagan, Hooghly (PIN: 712304)</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://maps.google.com/?q=22.717958,88.260207')}
              className="flex-row items-center mt-2"
            >
              <MapPin size={14} color="#2563eb" />
              <Text className="text-blue-600 underline text-sm ml-1">View on Maps</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Date & Meal Time */}
        <Text className="text-base font-bold text-gray-900 mb-3">Preferences</Text>
        <View className="flex-row gap-4 mb-4">
          {/* Date Picker */}
          <TouchableOpacity
            onPress={handleDatePress}
            className="flex-1 h-12 bg-gray-50 border border-gray-200 rounded-xl flex-row items-center px-3"
          >
            <CalendarIcon size={18} color="#6b7280" />
            <Text className={`ml-2 text-sm ${preferredDate ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {preferredDate ? format(new Date(preferredDate), 'MMM do, yyyy') : 'Pick a date'}
            </Text>
          </TouchableOpacity>

          {/* Meal Time Dropdown */}
          <TouchableOpacity
            className="flex-1 h-12 bg-gray-50 border border-gray-200 rounded-xl flex-row items-center px-3"
          >
            <Text className="text-sm font-medium text-gray-900">{mealTime === 'lunch' ? 'Lunch' : 'Dinner'}</Text>
            <View className="ml-auto flex-row items-center">
              <TouchableOpacity
                onPress={() => handleMealTimeSelect('lunch')}
                className={`px-3 py-1 rounded-lg mr-1 ${mealTime === 'lunch' ? 'bg-primary' : 'bg-gray-200'}`}
              >
                <Text className={mealTime === 'lunch' ? 'text-white font-bold' : 'text-gray-600'}>Lunch</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMealTimeSelect('dinner')}
                className={`px-3 py-1 rounded-lg ${mealTime === 'dinner' ? 'bg-primary' : 'bg-gray-200'}`}
              >
                <Text className={mealTime === 'dinner' ? 'text-white font-bold' : 'text-gray-600'}>Dinner</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View className="mb-6">
          <Text className="text-xs text-gray-500 mb-2 ml-1">Cooking Instructions (Optional)</Text>
          <TextInput
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Any special request..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm min-h-[80px]"
            textAlignVertical="top"
          />
        </View>

        {/* Terms & Conditions */}
        <View className="flex-row items-start mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <Switch
            value={termsAgreed}
            onValueChange={setTermsAgreed}
            trackColor={{ false: '#d1d5db', true: '#fecaca' }}
            thumbColor={termsAgreed ? '#e11d48' : '#f4f3f4'}
          />
          <View className="ml-3 flex-1">
            <Text className="text-sm text-gray-600">
              I agree to the{' '}
              <Text
                className="text-primary underline font-medium"
                onPress={() => Linking.openURL('https://www.bumbaskitchen.app/terms')}
              >
                Terms & Conditions
              </Text>{' '}
              and Refund Policy.
            </Text>
          </View>
        </View>

        {/* Order Summary */}
        <View className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <Text className="font-bold text-lg text-gray-900 mb-4">Order Summary</Text>
          {items.map((item: any) => {
            const imageSrc = (item.image && item.image[0]?.url) || item.image?.url || PLACEHOLDER_IMAGE_URL;
            return (
              <View key={item.id} className="flex-row items-center mb-4">
                <View className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 mr-3">
                  <Image source={{ uri: optimizeImageUrl(imageSrc) }} className="h-full w-full" contentFit="cover" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-sm text-gray-800" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-xs text-gray-500">Qty: {item.quantity}</Text>
                </View>
                <Text className="font-semibold text-sm">{formatPrice(item.price * item.quantity)}</Text>
              </View>
            );
          })}

          <View className="border-t border-gray-100 pt-4 space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600 text-sm">Subtotal</Text>
              <Text className="font-medium">{formatPrice(subtotal)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 text-sm">Delivery Fee</Text>
              <Text className={deliveryFee === 0 ? 'text-green-600 font-medium' : 'font-medium'}>
                {deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}
              </Text>
            </View>
            {couponDiscount > 0 && (
              <View className="flex-row justify-between">
                <View className="flex-row items-center">
                  <Ticket size={14} color="#16a34a" />
                  <Text className="text-green-700 text-sm ml-1">Coupon</Text>
                </View>
                <Text className="text-green-700 font-medium">- {formatPrice(couponDiscount)}</Text>
              </View>
            )}
            {useCoins && coinDiscountAmount > 0 && (
              <View className="flex-row justify-between">
                <View className="flex-row items-center">
                  <Coins size={14} color="#d97706" />
                  <Text className="text-amber-700 text-sm ml-1">Coins</Text>
                </View>
                <Text className="text-amber-700 font-medium">- {formatPrice(coinDiscountAmount)}</Text>
              </View>
            )}
            <View className="border-t border-gray-100 pt-2 flex-row justify-between">
              <Text className="font-bold text-lg">Total</Text>
              <Text className="font-extrabold text-xl text-primary">{formatPrice(finalTotal)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pb-4 pt-3"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={isSubmitting || (orderType === 'delivery' && !selectedAddressId)}
          className={`h-14 rounded-2xl items-center justify-center flex-row ${
            isSubmitting || (orderType === 'delivery' && !selectedAddressId)
              ? 'bg-gray-300'
              : 'bg-primary'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" className="mr-2" />
          ) : (
            <Text className="text-white font-bold text-lg">
              Place Order — {formatPrice(finalTotal)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-3xl p-4" style={{ paddingBottom: insets.bottom + 20 }}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(e, date) => setTempDate(date || tempDate)}
                minimumDate={new Date()}
              />
              <TouchableOpacity
                onPress={confirmIOSDate}
                className="bg-primary py-3 rounded-xl mt-4 items-center"
              >
                <Text className="text-white font-bold">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : showDatePicker ? (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="calendar"
          onChange={onDateSelected}
          minimumDate={new Date()}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}