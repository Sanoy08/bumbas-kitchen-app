// src/features/referral/screens/ReferralScreen.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Linking,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Copy,
  Gift,
  Share2,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Coins,
  AlertCircle
} from 'lucide-react-native';
import { toast } from 'sonner-native';
import { useAuthStore } from '@/shared/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

type ReferredFriend = {
  id: string;
  name: string;
  phoneMasked: string;
  status: 'pending' | 'rewarded' | 'under_review' | 'rejected' | 'reversed';
  createdAt: string;
  rewardCreditedAt: string | null;
  coinsEarned: number;
  qualifyingOrderAmount: number | null;
};

type ReferralData = {
  referralCode: string;
  shareUrl: string;
  referralCount: number;
  maxReferrals: number;
  rewardPerReferral: number;
  minOrderAmount: number;
  coinValidityDays: number;
  totalCoinsEarned: number;
  canInviteMore: boolean;
  friends: ReferredFriend[];
};

export function ReferralScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, isInitialized } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<ReferralData | null>(null);

  const fetchReferralStatus = useCallback(async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/referral/my-status`, { headers });
      const json = await res.json();

      if (json.success) {
        setData(json);
      } else {
        toast.error(json.error || 'Failed to load referral details');
      }
    } catch (err) {
      console.error('Error fetching referral status:', err);
      toast.error('Network error loading referrals');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (isInitialized) {
      if (!user) {
        router.replace('/(auth)/login');
      } else {
        fetchReferralStatus();
      }
    }
  }, [isInitialized, user, fetchReferralStatus]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchReferralStatus();
  };

  const handleCopyCode = async () => {
    if (!data?.referralCode) return;
    await Clipboard.setStringAsync(data.referralCode);
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    toast.success('Referral code copied to clipboard! 📋');
  };

  const getShareMessage = () => {
    const code = data?.referralCode || '';
    return `Hey! Order delicious food from Bumba's Kitchen! 🍲 Use my referral code *${code}* during signup and get 20 Coins on your 1st order over ₹499! Download here: https://www.bumbaskitchen.app/refer?code=${code}`;
  };

  const handleShareGeneral = async () => {
    try {
      await Share.share({
        message: getShareMessage(),
        title: "Bumba's Kitchen Referral",
      });
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  const handleShareWhatsApp = async () => {
    const message = encodeURIComponent(getShareMessage());
    const url = `whatsapp://send?text=${message}`;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback to system share
      handleShareGeneral();
    }
  };

  if (!isInitialized || isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  const referralCount = data?.referralCount ?? 0;
  const maxReferrals = data?.maxReferrals ?? 5;
  const totalCoins = data?.totalCoinsEarned ?? 0;
  const progressPercent = Math.min((referralCount / maxReferrals) * 100, 100);

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* --- TOP BAR --- */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="h-10 w-10 rounded-full bg-gray-100 items-center justify-center mr-3"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 font-sans flex-1">Refer & Earn</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#e11d48']} />}
      >
        {/* --- HERO BANNER --- */}
        <View className="bg-gradient-to-br from-rose-600 to-rose-700 bg-rose-600 rounded-3xl p-6 shadow-md mb-5 relative overflow-hidden">
          <View className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full" />
          <View className="absolute -bottom-8 -left-8 w-28 h-28 bg-black/10 rounded-full" />

          <View className="flex-row items-center justify-between mb-3">
            <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center">
              <Gift size={26} color="#ffffff" />
            </View>
            <View className="flex-row items-center bg-amber-400/90 px-3 py-1 rounded-full">
              <Coins size={14} color="#78350f" />
              <Text className="text-amber-950 text-xs font-bold font-sans ml-1">20 COINS EACH</Text>
            </View>
          </View>

          <Text className="text-white text-2xl font-bold font-sans leading-tight mb-2">
            Invite Friends, Get 20 Coins!
          </Text>
          <Text className="text-rose-100 text-xs font-medium font-sans leading-relaxed">
            Share your code. When a friend joins and completes their 1st order of min ₹499, both of you earn 20 Coins (valid 30 days)!
          </Text>
        </View>

        {/* --- REFERRAL CODE CARD --- */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-sans">
            Your Unique Referral Code
          </Text>

          <TouchableOpacity
            onPress={handleCopyCode}
            activeOpacity={0.75}
            className="flex-row items-center justify-between bg-rose-50/70 border border-dashed border-rose-300 rounded-xl px-4 py-3.5 mb-4"
          >
            <View>
              <Text className="text-2xl font-black text-rose-700 font-sans tracking-widest">
                {data?.referralCode || '------'}
              </Text>
              <Text className="text-[11px] text-rose-500 font-medium font-sans mt-0.5">
                Tap anywhere to copy code
              </Text>
            </View>
            <View className="h-10 w-10 rounded-lg bg-rose-600 items-center justify-center shadow-sm">
              <Copy size={18} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleShareWhatsApp}
              activeOpacity={0.8}
              className="flex-1 bg-[#25D366] py-3 px-4 rounded-xl flex-row items-center justify-center shadow-sm"
            >
              <Share2 size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm font-sans ml-2">Share on WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShareGeneral}
              activeOpacity={0.8}
              className="bg-gray-100 py-3 px-4 rounded-xl flex-row items-center justify-center"
            >
              <Share2 size={16} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- LIMIT & PROGRESS TRACKER --- */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center">
              <Users size={16} color="#e11d48" />
              <Text className="text-sm font-bold text-gray-900 font-sans ml-1.5">Referral Progress</Text>
            </View>
            <Text className="text-xs font-bold text-rose-600 font-sans">
              {referralCount} / {maxReferrals} Friends
            </Text>
          </View>

          {/* Progress Bar */}
          <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
            <View
              className="h-full bg-rose-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </View>

          <View className="flex-row justify-between items-center bg-gray-50 p-3 rounded-xl">
            <Text className="text-xs text-gray-600 font-medium font-sans">Total Coins Earned</Text>
            <View className="flex-row items-center">
              <Text className="text-sm font-black text-gray-900 font-sans">{totalCoins}</Text>
              <Text className="text-xs text-yellow-600 font-bold ml-1 font-sans">/ 100 Coins</Text>
            </View>
          </View>

          {referralCount >= maxReferrals && (
            <View className="mt-3 flex-row items-center bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <AlertCircle size={14} color="#d97706" />
              <Text className="text-[11px] text-amber-800 font-medium ml-1.5 flex-1 font-sans">
                You've reached the maximum limit of 5 referral rewards!
              </Text>
            </View>
          )}
        </View>

        {/* --- HOW IT WORKS --- */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
          <Text className="text-sm font-bold text-gray-900 font-sans mb-4">How It Works</Text>

          <View className="flex-row items-start mb-4">
            <View className="h-7 w-7 rounded-full bg-rose-100 items-center justify-center mr-3 mt-0.5">
              <Text className="text-xs font-bold text-rose-600 font-sans">1</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-900 font-sans">Share Your Code</Text>
              <Text className="text-[11px] text-gray-500 font-medium font-sans mt-0.5">
                Invite friends who have never ordered from Bumba's Kitchen before.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start mb-4">
            <View className="h-7 w-7 rounded-full bg-rose-100 items-center justify-center mr-3 mt-0.5">
              <Text className="text-xs font-bold text-rose-600 font-sans">2</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-900 font-sans">Friend Orders Food (Min ₹499)</Text>
              <Text className="text-[11px] text-gray-500 font-medium font-sans mt-0.5">
                Friend enters your code on registration & completes their first order of at least ₹499.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="h-7 w-7 rounded-full bg-rose-100 items-center justify-center mr-3 mt-0.5">
              <Text className="text-xs font-bold text-rose-600 font-sans">3</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-900 font-sans">Both Get 20 Coins Delivered!</Text>
              <Text className="text-[11px] text-gray-500 font-medium font-sans mt-0.5">
                Once the order is delivered, 20 Coins (worth ₹20) are automatically credited to both wallets!
              </Text>
            </View>
          </View>
        </View>

        {/* --- INVITED FRIENDS HISTORY --- */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6">
          <Text className="text-sm font-bold text-gray-900 font-sans mb-3">
            Invited Friends ({data?.friends?.length || 0})
          </Text>

          {!data?.friends || data.friends.length === 0 ? (
            <View className="items-center py-6">
              <View className="h-12 w-12 rounded-full bg-gray-100 items-center justify-center mb-2">
                <Users size={22} color="#9ca3af" />
              </View>
              <Text className="text-xs font-bold text-gray-600 font-sans">No friends invited yet</Text>
              <Text className="text-[11px] text-gray-400 font-medium font-sans mt-0.5 text-center px-4">
                Share your code to earn your first 20 wallet coins!
              </Text>
            </View>
          ) : (
            data.friends.map((friend, idx) => {
              const isLast = idx === data.friends.length - 1;
              return (
                <View
                  key={friend.id || idx}
                  className={`flex-row items-center justify-between py-3 ${
                    !isLast ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <View className="flex-row items-center flex-1 pr-2">
                    <View className="h-9 w-9 rounded-full bg-rose-100 items-center justify-center mr-3">
                      <Text className="text-rose-700 font-bold text-xs font-sans">
                        {friend.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-gray-900 font-sans" numberOfLines={1}>
                        {friend.name}
                      </Text>
                      <Text className="text-[10px] text-gray-400 font-medium font-sans">
                        {friend.phoneMasked}
                      </Text>
                    </View>
                  </View>

                  {/* Status Badge */}
                  <View>
                    {friend.status === 'rewarded' ? (
                      <View className="flex-row items-center bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={12} color="#16a34a" />
                        <Text className="text-[10px] font-bold text-green-700 font-sans ml-1">
                          +20 Coins
                        </Text>
                      </View>
                    ) : friend.status === 'under_review' ? (
                      <View className="flex-row items-center bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                        <ShieldCheck size={12} color="#2563eb" />
                        <Text className="text-[10px] font-bold text-blue-700 font-sans ml-1">
                          In Review
                        </Text>
                      </View>
                    ) : friend.status === 'rejected' || friend.status === 'reversed' ? (
                      <View className="flex-row items-center bg-gray-100 px-2.5 py-1 rounded-full">
                        <Text className="text-[10px] font-medium text-gray-500 font-sans">
                          Not Eligible
                        </Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        <Clock size={12} color="#d97706" />
                        <Text className="text-[10px] font-bold text-amber-700 font-sans ml-1">
                          Waiting Order
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
export default ReferralScreen;

