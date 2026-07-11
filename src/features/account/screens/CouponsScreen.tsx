import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, TicketPercent, Copy } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { toast } from 'sonner-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

const CouponCard = ({ coupon }: { coupon: any }) => {
  const code = coupon.code || coupon.Code || 'BUMBA10';
  const description = coupon.description || coupon.Description || '';
  
  // Dynamic fields
  const discountType = coupon.discountType || 'percentage'; 
  const value = coupon.value || 10;
  const minOrder = coupon.minOrder || 0;
  const validUntil = coupon.expiryDate || coupon.ExpiryDate;

  const discountText = discountType === 'percentage' ? `${value}%` : `₹${value}`;
  const defaultDesc = discountType === 'percentage' 
      ? `Get ${value}% off on your next order` 
      : `Get flat ₹${value} off on your next order`;
  const finalDesc = description ? description : defaultDesc;

  return (
    <View className="mb-6 relative">
      {/* Main Ticket Container */}
      <View className="flex-row bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden" style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
        
        {/* Left Side: Brand / Discount Info (32%) */}
        <View className="w-[32%] bg-rose-50/60 justify-center items-center p-4 relative border-r-[1.5px] border-dashed border-rose-200">
          <View className="bg-white rounded-full p-2.5 mb-2 shadow-sm border border-rose-100">
            <TicketPercent size={22} color="#e11d48" />
          </View>
          <Text className="text-rose-600 font-black text-2xl tracking-tighter" numberOfLines={1} adjustsFontSizeToFit>{discountText}</Text>
          <Text className="text-rose-400 font-bold text-[9px] tracking-[0.15em] mt-1 uppercase">Discount</Text>
        </View>

        {/* Right Side: Details & Code (68%) */}
        <View className="w-[68%] p-5 bg-white justify-between">
          <View>
            <Text className="text-[15px] font-bold text-gray-800 mb-1.5 leading-snug">{finalDesc}</Text>
            {minOrder > 0 && (
              <Text className="text-[11px] text-gray-500 font-medium">Min. order: <Text className="text-gray-700 font-bold">₹{minOrder}</Text></Text>
            )}
          </View>
          
          <View className="mt-5 flex-row items-center justify-between">
            <View className="bg-gray-50/80 px-3 py-2.5 rounded-xl border border-gray-200/80 border-dashed flex-1 mr-3 items-center justify-center">
              <Text className="text-gray-800 font-black text-[15px] tracking-[0.15em]" selectable={true}>{code}</Text>
            </View>
            <TouchableOpacity 
              className="bg-primary px-3.5 py-3 rounded-xl flex-row items-center shadow-sm"
              onPress={async () => {
                await Clipboard.setStringAsync(code);
                toast.success('Coupon code copied!');
              }}
              activeOpacity={0.8}
            >
              <Copy size={14} color="#ffffff" />
              <Text className="text-[10px] font-bold text-white uppercase tracking-wider ml-1.5">Copy</Text>
            </TouchableOpacity>
          </View>
          
          <View className="mt-5 border-t border-gray-100 pt-3 flex-row justify-between items-center">
            <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {validUntil ? `Valid till ${format(new Date(validUntil), 'MMM dd, yyyy')}` : 'No Expiry Date'}
            </Text>
            <Text className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">T&C Apply</Text>
          </View>
        </View>

        {/* The Cutouts to make it look like a real ticket */}
        <View 
          className="absolute top-0 w-6 h-6 bg-gray-50 rounded-full border-b border-rose-100" 
          style={{ left: '32%', transform: [{ translateX: -12 }, { translateY: -12 }] }} 
        />
        <View 
          className="absolute bottom-0 w-6 h-6 bg-gray-50 rounded-full border-t border-rose-100" 
          style={{ left: '32%', transform: [{ translateX: -12 }, { translateY: 12 }] }} 
        />
        
      </View>
    </View>
  );
};

export function CouponsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await fetch(`${API_URL}/coupons/list`);
        const data = await res.json();
        if (data.success) {
          const validCoupons = (data.coupons || []).filter((c: any) => {
            // "isonetime true hole seta dekhabe na"
            if (c.isOneTime === true) return false;
            // Also filter out inactive coupons if the backend doesn't
            if (c.isActive === false) return false;
            return true;
          });
          setCoupons(validCoupons);
        }
      } catch (error) {
        console.error("Failed to load coupons", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, []);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-1 bg-gray-50">
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          
          <Text className="text-2xl font-bold text-gray-900 font-sans mb-1">My Coupons</Text>
          <Text className="text-sm text-gray-500 font-medium font-sans mb-6">View available offers & exclusive discounts.</Text>

          {loading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#e11d48" />
            </View>
          ) : coupons.length > 0 ? (
            <View className="pb-10">
              {coupons.map((coupon, idx) => (
                <CouponCard key={coupon._id || idx} coupon={coupon} />
              ))}
            </View>
          ) : (
            <View className="items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm" style={{ elevation: 2 }}>
              <View className="h-20 w-20 bg-rose-50 rounded-full items-center justify-center mb-5">
                <TicketPercent size={36} color="#e11d48" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">No coupons available</Text>
              <Text className="text-sm text-gray-500 mb-8 text-center px-8 leading-relaxed">
                You don't have any active coupons right now. Check back later for exciting offers!
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(shop)/explore')}
                className="bg-primary px-8 py-3.5 rounded-2xl shadow-md"
                activeOpacity={0.9}
              >
                <Text className="text-white font-bold text-base tracking-wide">Explore Menu</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </View>
    </View>
  );
}
