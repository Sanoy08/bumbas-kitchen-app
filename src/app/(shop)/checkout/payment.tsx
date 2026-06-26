// src/app/(shop)/checkout/payment.tsx

import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, 
  Platform, ActivityIndicator, Alert, Keyboard 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, MapPin, CheckCircle2, Circle, Clock, Home, Briefcase, 
  Lock, Calendar as CalendarIcon, FileText 
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';

export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { items, getTotalPrice, checkoutState, clearCart } = useCartStore();

  // States
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  
  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [mealTime, setMealTime] = useState<'lunch' | 'dinner'>('lunch');
  const [instructions, setInstructions] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address Data
  const addresses = user?.savedAddresses || [];

  // Calculations
  const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId || a._id === selectedAddressId);
  const currentDeliveryFee = orderType === 'delivery' ? (selectedAddress?.deliveryFee || 0) : 0;
  
  const subtotal = getTotalPrice();
  const couponDiscount = checkoutState.couponDiscount > 0 ? (subtotal * checkoutState.couponDiscount) / 100 : 0;
  // Coin calculation (assuming handled previously and saved in checkoutState, or re-calculate)
  const maxCoinDiscount = subtotal * 0.5;
  const walletBalance = user?.walletBalance || 0; // Or fetch fresh
  const coinDiscountAmount = checkoutState.useCoins ? Math.min(walletBalance, Math.floor(maxCoinDiscount)) : 0;
  
  const finalTotal = Math.max(0, subtotal + currentDeliveryFee - couponDiscount - coinDiscountAmount);

  useEffect(() => {
    // Set default address on load
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses;
      setSelectedAddressId(defaultAddr.id || defaultAddr._id);
    }
  }, [addresses]);

  const getIcon = (name: string = '') => {
    const n = name.toLowerCase();
    if (n.includes('home')) return <Home size={20} color="#e11d48" />;
    if (n.includes('work') || n.includes('office')) return <Briefcase size={20} color="#e11d48" />;
    return <MapPin size={20} color="#e11d48" />;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type !== 'dismissed' && selectedDate) {
      setPreferredDate(selectedDate);
    }
  };

  const handlePlaceOrder = async () => {
    // 1. Validations
    if (orderType === 'delivery' && !selectedAddress) {
      toast.error("Please select a delivery address.");
      return;
    }
    if (!preferredDate) {
      toast.error("Please select a preferred date.");
      return;
    }
    if (!termsAccepted) {
      toast.error("Please agree to the Terms & Conditions.");
      return;
    }

    // 2. Time Validation (9 AM and 6 PM Logic)
    const today = new Date();
    const isToday = 
      preferredDate.getDate() === today.getDate() &&
      preferredDate.getMonth() === today.getMonth() &&
      preferredDate.getFullYear() === today.getFullYear();
    
    const currentHour = today.getHours();

    if (isToday) {
      if (mealTime === 'lunch' && currentHour >= 9) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Time Limit Exceeded!", "Today's lunch orders are accepted until 9 AM only. Please select a future date.");
        return; 
      }
      if (mealTime === 'dinner' && currentHour >= 18) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Time Limit Exceeded!", "Today's dinner orders are accepted until 6 PM only. Please select a future date.");
        return;
      }
    }

    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      const orderPayload = {
        preferredDate: format(preferredDate, 'yyyy-MM-dd'),
        mealTime,
        instructions,
        name: user?.name || 'Customer',
        phone: user?.phone || '',
        items,
        subtotal,
        deliveryFee: currentDeliveryFee, 
        total: finalTotal,
        discount: couponDiscount + coinDiscountAmount,
        couponCode: checkoutState.couponCode,
        useCoins: checkoutState.useCoins,
        orderType,
        deliveryAddress: selectedAddress ? selectedAddress.address : 'Store Pickup',
        coordinates: selectedAddress ? selectedAddress.coordinates : null
      };

      const res = await fetch(`${API_URL}/orders`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(orderPayload) 
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Order placement failed');

      // Success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Order Placed Successfully! 🎉");
      clearCart();
      
      // Navigate to Orders Page
      router.replace('/(shop)/account/orders');

    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(error.message || "Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      
      {/* HEADER */}
      <View 
        className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100 z-10 shadow-sm" 
        style={{ paddingTop: insets.top + 10 }}
      >
        <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 bg-gray-50 rounded-full items-center justify-center mr-3">
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 font-sans">Final Checkout</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          
          {/* DELIVERY METHOD */}
          <View className="bg-white p-5 rounded-2xl border border-gray-100 mb-4 shadow-sm">
            <Text className="text-sm font-bold text-gray-900 font-sans mb-3">Delivery Method</Text>
            <View className="flex-row gap-3 bg-gray-100 p-1.5 rounded-xl">
              <TouchableOpacity 
                onPress={() => setOrderType('delivery')}
                className={`flex-1 py-2.5 items-center justify-center rounded-lg ${orderType === 'delivery' ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`font-bold font-sans ${orderType === 'delivery' ? 'text-primary' : 'text-gray-500'}`}>Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setOrderType('pickup')}
                className={`flex-1 py-2.5 items-center justify-center rounded-lg ${orderType === 'pickup' ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`font-bold font-sans ${orderType === 'pickup' ? 'text-primary' : 'text-gray-500'}`}>Pickup</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ADDRESS SELECTION */}
          {orderType === 'delivery' ? (
            <View className="bg-white p-5 rounded-2xl border border-gray-100 mb-4 shadow-sm">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-sm font-bold text-gray-900 font-sans">Select Address</Text>
                <TouchableOpacity onPress={() => toast.info('Manage Addresses from Account')}>
                  <Text className="text-primary font-bold text-xs font-sans">+ ADD NEW</Text>
                </TouchableOpacity>
              </View>

              {addresses.length === 0 ? (
                <View className="items-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <MapPin size={32} color="#d1d5db" className="mb-2" />
                  <Text className="text-gray-500 font-sans">No saved addresses found.</Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {addresses.map((addr: any) => {
                    const isSelected = selectedAddressId === (addr.id || addr._id);
                    return (
                      <TouchableOpacity 
                        key={addr.id || addr._id}
                        onPress={() => setSelectedAddressId(addr.id || addr._id)}
                        className={`p-4 rounded-xl border-2 flex-row items-center ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-100 bg-gray-50'}`}
                      >
                        <View className={`h-10 w-10 rounded-full items-center justify-center mr-3 ${isSelected ? 'bg-primary/20' : 'bg-white border border-gray-200'}`}>
                          {getIcon(addr.name)}
                        </View>
                        <View className="flex-1">
                          <Text className="font-bold text-gray-900 text-sm font-sans mb-0.5">{addr.name}</Text>
                          <Text className="text-xs text-gray-500 font-sans line-clamp-1" numberOfLines={1}>{addr.address}</Text>
                          <View className="flex-row items-center gap-2 mt-1.5">
                            <Text className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded font-bold text-gray-600">Dist: {addr.distanceText}</Text>
                            <Text className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${addr.deliveryFee === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              Fee: {addr.deliveryFee === 0 ? 'FREE' : formatPrice(addr.deliveryFee)}
                            </Text>
                          </View>
                        </View>
                        <View className="ml-2">
                          {isSelected ? <CheckCircle2 size={24} color="#e11d48" /> : <Circle size={24} color="#d1d5db" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            <View className="bg-blue-50 p-5 rounded-2xl border border-blue-100 mb-4 items-center">
              <Text className="font-bold text-blue-900 text-base font-sans mb-1">Store Location</Text>
              <Text className="text-blue-800 text-center font-sans mb-3 text-sm">
                Janai, Garbagan, Hooghly (PIN: 712304)
              </Text>
              <TouchableOpacity className="flex-row items-center bg-white px-4 py-2 rounded-full shadow-sm">
                <MapPin size={14} color="#e11d48" className="mr-1.5" />
                <Text className="text-primary font-bold text-xs font-sans">View on Maps</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PREFERENCES (Date & Time) */}
          <View className="bg-white p-5 rounded-2xl border border-gray-100 mb-4 shadow-sm">
            <Text className="text-sm font-bold text-gray-900 font-sans mb-4">Preferences</Text>
            
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-500 mb-1.5 ml-1 font-sans">Date</Text>
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(true)}
                  className="h-12 bg-gray-50 border border-gray-200 rounded-xl flex-row items-center px-3 justify-between"
                >
                  <Text className={`text-sm font-sans font-medium ${preferredDate ? 'text-gray-900' : 'text-gray-400'}`}>
                    {preferredDate ? format(preferredDate, 'MMM do, yyyy') : 'Pick a date'}
                  </Text>
                  <CalendarIcon size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-500 mb-1.5 ml-1 font-sans">Time</Text>
                <View className="flex-row bg-gray-100 p-1 rounded-xl h-12">
                  <TouchableOpacity 
                    onPress={() => setMealTime('lunch')}
                    className={`flex-1 items-center justify-center rounded-lg ${mealTime === 'lunch' ? 'bg-white shadow-sm' : ''}`}
                  >
                    <Text className={`font-bold text-xs font-sans ${mealTime === 'lunch' ? 'text-gray-900' : 'text-gray-500'}`}>Lunch</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setMealTime('dinner')}
                    className={`flex-1 items-center justify-center rounded-lg ${mealTime === 'dinner' ? 'bg-white shadow-sm' : ''}`}
                  >
                    <Text className={`font-bold text-xs font-sans ${mealTime === 'dinner' ? 'text-gray-900' : 'text-gray-500'}`}>Dinner</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text className="text-xs font-bold text-gray-500 mb-1.5 ml-1 font-sans">Cooking Instructions (Optional)</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 min-h-[80px]">
              <TextInput 
                placeholder="E.g., Less spicy, extra onions..."
                placeholderTextColor="#9ca3af"
                value={instructions}
                onChangeText={setInstructions}
                multiline
                className="text-sm font-sans text-gray-900 h-full"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* TERMS & CONDITIONS */}
          <TouchableOpacity 
            onPress={() => setTermsAccepted(!termsAccepted)}
            className="flex-row items-start bg-white p-4 rounded-2xl border border-gray-100 mb-6 shadow-sm"
          >
            <View className="mt-0.5 mr-3">
              {termsAccepted ? <CheckCircle2 size={20} color="#16a34a" /> : <Circle size={20} color="#d1d5db" />}
            </View>
            <Text className="flex-1 text-sm text-gray-600 font-sans leading-5">
              I agree to the <Text className="font-bold text-primary">Terms & Conditions</Text> and <Text className="font-bold text-primary">Refund Policy</Text>.
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* STICKY BOTTOM PAY BAR */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-4 flex-col"
        style={{ paddingBottom: insets.bottom + 12, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 10 }}
      >
        <TouchableOpacity 
          onPress={handlePlaceOrder}
          disabled={isSubmitting || (orderType === 'delivery' && !selectedAddress)}
          className={`w-full h-14 rounded-2xl items-center justify-center flex-row shadow-lg ${isSubmitting || (orderType === 'delivery' && !selectedAddress) ? 'bg-gray-400' : 'bg-gray-900'}`}
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator color="#fff" className="mr-2" />
              <Text className="text-white font-bold text-lg font-sans">Processing...</Text>
            </>
          ) : (
            <>
              <Lock size={18} color="#ffffff" className="mr-2" />
              <Text className="text-white font-bold text-lg font-sans">Place Order • {formatPrice(finalTotal)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* DatePicker Component (Hidden unless triggered) */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent={true} animationType="slide">
            <View className="flex-1 justify-end bg-black/50">
              <View className="bg-white rounded-t-3xl p-4" style={{ paddingBottom: insets.bottom + 16 }}>
                <DateTimePicker
                  value={preferredDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  minimumDate={new Date()} 
                />
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(false)}
                  className="mt-4 items-center p-3.5 bg-primary rounded-xl"
                >
                  <Text className="color-white font-bold text-base font-sans">Confirm Date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={preferredDate || new Date()}
            mode="date"
            display="calendar"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )
      )}
      
    </View>
  );
}