import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, TicketPercent } from 'lucide-react-native';
import { useRouter } from 'expo-router';
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
    <View className="mb-5">
      <View className="flex-row bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ elevation: 2 }}>
        
        {/* Left Side: Brand / Discount Info (30%) */}
        <View className="w-[30%] bg-primary justify-center items-center p-3 relative">
          <Text className="text-white font-black text-3xl tracking-tighter" numberOfLines={1} adjustsFontSizeToFit>{discountText}</Text>
          <Text className="text-white/90 font-bold text-[10px] tracking-widest mt-1 uppercase">OFF</Text>
        </View>

        {/* Right Side: Details & Code (70%) */}
        <View className="w-[70%] p-4 bg-white border-l-[1.5px] border-dashed border-gray-300 justify-between">
          <View>
            <Text className="text-sm font-bold text-gray-900 mb-1 leading-snug">{finalDesc}</Text>
            {minOrder > 0 && (
              <Text className="text-xs text-gray-500 font-medium">Min. order: ₹{minOrder}</Text>
            )}
          </View>
          
          <View className="mt-4 flex-row items-center justify-between">
            <View className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 border-dashed flex-1 mr-3 items-center justify-center">
              <Text className="text-primary font-black text-base tracking-widest" selectable={true}>{code}</Text>
            </View>
            <View className="bg-red-50 border border-red-100 px-2.5 py-2 rounded-lg">
              <Text className="text-[9px] font-bold text-primary uppercase tracking-wider">Hold to Copy</Text>
            </View>
          </View>
          
          <View className="mt-4 border-t border-gray-100 pt-2 flex-row justify-between items-center">
            <Text className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              {validUntil ? `Expires: ${format(new Date(validUntil), 'MMM dd, yyyy')}` : 'No Expiry Date'}
            </Text>
          </View>
        </View>

        {/* The Cutouts */}
        {/* Top Cutout */}
        <View 
          className="absolute top-0 w-8 h-8 bg-gray-50 rounded-full border border-gray-200" 
          style={{ left: '30%', transform: [{ translateX: -16 }, { translateY: -16 }] }} 
        />
        {/* Bottom Cutout */}
        <View 
          className="absolute bottom-0 w-8 h-8 bg-gray-50 rounded-full border border-gray-200" 
          style={{ left: '30%', transform: [{ translateX: -16 }, { translateY: 16 }] }} 
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
            <View>
              {coupons.map((coupon, idx) => (
                <CouponCard key={coupon._id || idx} coupon={coupon} />
              ))}
            </View>
          ) : (
            <View className="items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <View className="h-16 w-16 bg-gray-50 rounded-full items-center justify-center mb-4">
                <TicketPercent size={32} color="#d1d5db" />
              </View>
              <Text className="text-lg font-bold text-gray-900">No coupons available</Text>
              <Text className="text-sm text-gray-500 mt-1 mb-6 text-center px-6">
                You don't have any active coupons right now. Check back later for exciting offers!
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(shop)/explore')}
                className="bg-primary px-6 py-3 rounded-xl shadow-sm"
              >
                <Text className="text-white font-bold">Order Now</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </View>
    </View>
  );
}
