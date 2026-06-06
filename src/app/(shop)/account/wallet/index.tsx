// src\app\(shop)\account\wallet\index.tsx

import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import {
    ArrowDownLeft, ArrowUpRight,
    Coins,
    Gift,
    History,
    RotateCcw, TimerOff,
    TrendingUp
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';

type Transaction = {
  id: string;
  type: 'earn' | 'redeem' | 'refund' | 'expire'; 
  amount: number;
  description: string;
  date: string;
};

export default function WalletScreen() {
  const { user, isInitialized } = useAuthStore();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [tier, setTier] = useState('Bronze');
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const fetchWalletData = async () => {
    try {
      const res = await fetch(`${API_URL}/wallet`);
      const data = await res.json();
      
      if (data.success && data.wallet) {
        setBalance(data.wallet.balance || 0);
        setTier(data.wallet.tier || 'Bronze');
        setTotalSpent(data.wallet.totalSpent || 0);
        setTransactions(Array.isArray(data.wallet.transactions) ? data.wallet.transactions : []);
      } else {
        console.log("Failed to load wallet data:", data.error);
      }
    } catch (e) {
      console.log("Wallet fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized && user) {
      fetchWalletData();
    } else if (isInitialized && !user) {
      router.replace('/(auth)/login');
    }
  }, [isInitialized, user]);

  const handleRedeem = async () => {
    if (!redeemAmount || parseInt(redeemAmount) < 10) {
      Alert.alert("Error", "Minimum redeem amount is 10 coins.");
      return;
    }
    if (parseInt(redeemAmount) > balance) {
      Alert.alert("Error", "Insufficient balance.");
      return;
    }

    setIsRedeeming(true);

    try {
      const res = await fetch(`${API_URL}/wallet/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coinsToRedeem: parseInt(redeemAmount) })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        Alert.alert("Success", "Coupon Generated Successfully! Check your email.");
        setIsRedeemOpen(false);
        setRedeemAmount('');
        fetchWalletData(); 
      } else {
        Alert.alert("Error", data.error || "Redeem failed");
      }
    } catch (e) {
      Alert.alert("Error", "Error redeeming coins");
    } finally {
      setIsRedeeming(false);
    }
  };

  const getNextTierInfo = () => {
    if (totalSpent < 5000) return { next: 'Silver', target: 5000, current: totalSpent };
    if (totalSpent < 15000) return { next: 'Gold', target: 15000, current: totalSpent };
    return { next: 'Max', target: totalSpent, current: totalSpent }; 
  };
  
  const tierInfo = getNextTierInfo();
  const progress = tierInfo.target > 0 ? Math.min((tierInfo.current / tierInfo.target) * 100, 100) : 100;

  if (!isInitialized || isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header Text */}
        <Text className="text-2xl font-bold font-sans text-gray-900 mb-6">My Wallet</Text>

        {/* --- WALLET CARD --- */}
        <View className="bg-gray-900 rounded-3xl p-6 shadow-md mb-6 relative overflow-hidden">
          {/* Decorative Background Elements */}
          <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
          <View className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 rounded-full" />
          
          <View className="relative z-10 flex-row justify-between items-center">
            <View>
              <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1 font-sans">Total Balance</Text>
              <View className="flex-row items-end">
                <Text className="text-4xl font-bold text-white font-sans">{balance}</Text>
                <Text className="text-xl text-yellow-400 font-bold ml-2 mb-1 font-sans">Coins</Text>
              </View>
              
              <View className="mt-4 flex-row items-center">
                <View className={`px-2 py-1 rounded flex-row items-center ${
                  tier === 'Gold' ? 'bg-yellow-400' : 
                  tier === 'Silver' ? 'bg-gray-300' : 'bg-orange-700'
                }`}>
                  <Text className={`text-[10px] font-bold uppercase ${
                    tier === 'Gold' ? 'text-yellow-900' : 
                    tier === 'Silver' ? 'text-gray-900' : 'text-orange-100'
                  } font-sans`}>{tier} Member</Text>
                </View>
                <Text className="text-xs text-gray-400 ml-2 font-medium font-sans">1 Coin = ₹1</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => setIsRedeemOpen(true)}
            className="bg-white py-3 rounded-full mt-6 flex-row justify-center items-center"
            activeOpacity={0.8}
          >
            <Gift size={18} color="#e11d48" className="mr-2" />
            <Text className="text-gray-900 font-bold text-sm font-sans">Redeem Coins</Text>
          </TouchableOpacity>
        </View>

        {/* --- TIER PROGRESS --- */}
        {tier !== 'Gold' && (
          <View className="bg-white p-5 rounded-2xl border border-primary/10 shadow-sm mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <TrendingUp size={18} color="#e11d48" />
                <Text className="font-bold text-gray-900 ml-2 font-sans">Unlock {tierInfo.next} Tier</Text>
              </View>
              <Text className="text-xs text-gray-500 font-medium font-sans">
                Spend <Text className="font-bold text-gray-900">{formatPrice(tierInfo.target - tierInfo.current)}</Text> more
              </Text>
            </View>
            
            {/* Custom Progress Bar */}
            <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden w-full">
              <View className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
            </View>
            
            <View className="flex-row justify-between mt-2">
              <Text className="text-[10px] font-bold text-gray-400 uppercase font-sans">{tier}</Text>
              <Text className="text-[10px] font-bold text-gray-400 uppercase font-sans">{tierInfo.next}</Text>
            </View>
          </View>
        )}

        {/* --- TRANSACTION HISTORY --- */}
        <View>
          <View className="flex-row items-center mb-4">
            <History size={20} color="#6b7280" />
            <Text className="text-lg font-bold text-gray-900 ml-2 font-sans">Recent Activity</Text>
          </View>

          {transactions.length === 0 ? (
            <View className="items-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
              <Coins size={48} color="#e5e7eb" className="mb-3" />
              <Text className="text-gray-500 font-medium font-sans">No transactions yet.</Text>
              <TouchableOpacity onPress={() => router.push('/(shop)/menus')} className="mt-3">
                <Text className="text-primary font-bold font-sans">Order now to earn!</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-y-3">
              {transactions.map((txn) => {
                const isPositive = txn.type === 'earn' || txn.type === 'refund';
                
                return (
                  <View key={txn.id || Math.random().toString()} className="flex-row items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <View className="flex-row items-center flex-1 pr-2">
                      <View className={`h-10 w-10 rounded-full items-center justify-center ${
                        isPositive ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        {txn.type === 'earn' && <ArrowDownLeft size={20} color="#16a34a" />}
                        {txn.type === 'redeem' && <ArrowUpRight size={20} color="#dc2626" />}
                        {txn.type === 'refund' && <RotateCcw size={20} color="#16a34a" />}
                        {txn.type === 'expire' && <TimerOff size={20} color="#dc2626" />}
                      </View>
                      <View className="ml-3 flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="font-bold text-sm text-gray-900 capitalize font-sans">{txn.type}</Text>
                          {txn.type === 'refund' && (
                            <View className="bg-gray-100 px-1.5 rounded"><Text className="text-[9px] font-bold text-gray-600 font-sans uppercase">Returned</Text></View>
                          )}
                          {txn.type === 'expire' && (
                            <View className="bg-red-100 px-1.5 rounded"><Text className="text-[9px] font-bold text-red-600 font-sans uppercase">Expired</Text></View>
                          )}
                        </View>
                        <Text className="text-xs text-gray-500 mt-0.5 font-medium font-sans" numberOfLines={1}>
                          {txn.description} • {txn.date ? format(new Date(txn.date), 'MMM dd, yyyy') : ''}
                        </Text>
                      </View>
                    </View>
                    <Text className={`font-bold text-base font-sans ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                      {isPositive ? '+' : '-'}{txn.amount}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>

      {/* --- REDEEM MODAL --- */}
      <Modal visible={isRedeemOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900 font-sans">Redeem Coins</Text>
              <TouchableOpacity onPress={() => setIsRedeemOpen(false)}>
                <Text className="text-gray-500 font-semibold font-sans">Close</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-gray-50 p-4 rounded-2xl items-center mb-6 border border-gray-100">
              <Text className="text-xs font-bold text-gray-500 uppercase font-sans">Available Balance</Text>
              <Text className="text-3xl font-bold text-primary mt-1 font-sans">{balance}</Text>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-bold text-gray-700 mb-2 font-sans">Coins to Redeem</Text>
              <View className="relative justify-center">
                <View className="absolute left-4 z-10">
                  <Coins size={20} color="#9ca3af" />
                </View>
                <TextInput 
                  keyboardType="numeric"
                  placeholder="Enter amount (min 10)"
                  placeholderTextColor="#9ca3af"
                  value={redeemAmount}
                  onChangeText={setRedeemAmount}
                  className="bg-white border border-gray-200 rounded-xl pl-12 pr-4 h-14 text-lg font-bold text-gray-900 font-sans"
                />
              </View>
              <Text className="text-xs text-gray-500 font-medium text-right mt-2 font-sans">
                Value: ₹{parseInt(redeemAmount || '0') * 1}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={handleRedeem} 
              disabled={isRedeeming || !redeemAmount}
              className={`h-14 rounded-xl items-center justify-center shadow-sm ${isRedeeming || !redeemAmount ? 'bg-primary/50' : 'bg-primary'}`}
            >
              {isRedeeming ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg font-sans">Confirm Redeem</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
