import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeliveryPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 font-sans ml-2">Delivery & Pickup</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
            <View>
              <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
Delivery
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                Bumba's Kitchen offers home delivery within specific areas. Delivery times are
                estimated and may vary due to factors beyond our control, such as traffic or weather conditions. You agree to
                provide accurate delivery information, and we will not be responsible for any failed deliveries due to incorrect
                information provided.
              
</Text>

            </View>
            <View>
              <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
Pickup
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                If you choose to pick up your order, you will be notified when your order is ready. You
                are responsible for collecting your order within the designated time window. Bumba's Kitchen is not responsible
                for any orders left uncollected beyond this time frame.
              
</Text>

            </View>
          
      </ScrollView>
    </View>
  );
}
