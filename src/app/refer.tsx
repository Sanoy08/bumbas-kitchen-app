import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/shared/store/authStore';
import { ReferralScreen } from '@/features/referral/screens/ReferralScreen';
import { View, ActivityIndicator } from 'react-native';

export default function ReferRoute() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { user, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized) {
      if (!user && code) {
        // Deep linked user coming from a referral link -> redirect to register with prefilled code
        router.replace({ pathname: '/(auth)/register', params: { referralCode: code } });
      }
    }
  }, [user, isInitialized, code]);

  if (!isInitialized) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return <ReferralScreen />;
}

