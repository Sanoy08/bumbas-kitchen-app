// src/app/(shop)/account/wallet/index.tsx

import { formatPrice } from '@/shared/utils/utils';
import { useAuthStore } from '@/shared/store/authStore';
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
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Keyboard,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

type Transaction = {
  id?: string;
  _id?: string;
  type: 'earn' | 'redeem' | 'refund' | 'expire'; 
  amount: number;
  description: string;
  date?: string;
  createdAt?: string;
  expiresAt?: string;
  remainingAmount?: number;
};

export function WalletScreen() {
  const { user, token, isInitialized } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [tier, setTier] = useState('Bronze');
  const [totalSpent, setTotalSpent] = useState(0);
  const [expiringInfo, setExpiringInfo] = useState<{ amount: number; expiresAt: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchWalletData = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/wallet`, { headers });
      const data = await res.json();
      
      if (data.success && data.wallet) {
        setBalance(data.wallet.balance || 0);
        setTier(data.wallet.tier || 'Bronze');
        setTotalSpent(data.wallet.totalSpent || 0);

        const txns = Array.isArray(data.wallet.transactions) ? data.wallet.transactions : [];
        setTransactions(txns);

        let expiring = data.wallet.expiringInfo;
        if (!expiring && txns.length > 0) {
          const now = new Date();
          const activeEarns = txns
            .filter((t) => (t.type === 'earn' || t.type === 'refund') && (t.remainingAmount ?? t.amount) > 0 && t.expiresAt && new Date(t.expiresAt) > now)
            .sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime());
          
          if (activeEarns.length > 0) {
            const earliestDateStr = format(new Date(activeEarns[0].expiresAt!), 'yyyy-MM-dd');
            const sameDayTotal = activeEarns
              .filter((t) => format(new Date(t.expiresAt!), 'yyyy-MM-dd') === earliestDateStr)
              .reduce((sum, t) => sum + (t.remainingAmount ?? t.amount), 0);

            expiring = {
              amount: sameDayTotal,
              expiresAt: activeEarns[0].expiresAt!
            };
          }
        }
        setExpiringInfo(expiring || null);
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

  const getNextTierInfo = () => {
    if (totalSpent < 5000) return { next: 'Silver', target: 5000, current: totalSpent };
    if (totalSpent < 20000) return { next: 'Gold', target: 20000, current: totalSpent };
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
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-1 bg-gray-50">
        
      <ScrollView 
  className="flex-1 px-4 pt-4" 
  showsVerticalScrollIndicator={false} 
  contentContainerStyle={{ paddingBottom: 80 }} 
>
        
        {/* Header Text */}
        <Text className="text-2xl font-bold font-sans text-gray-900 mb-6">My Wallet</Text>

        {/* --- WALLET CARD --- */}
        <View className="bg-gray-900 rounded-3xl p-6 shadow-md mb-6 relative overflow-hidden">
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
        </View>

        {/* --- EXPIRING COINS NOTICE --- */}
        {expiringInfo && expiringInfo.amount > 0 && (
          <View className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 mb-6 shadow-sm flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-3">
              <View className="h-10 w-10 rounded-full bg-amber-100 items-center justify-center mr-3">
                <TimerOff size={20} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-amber-950 font-sans">
                  {expiringInfo.amount} Coins expiring soon!
                </Text>
                <Text className="text-xs text-amber-800 font-medium font-sans mt-0.5">
                  Valid till {format(new Date(expiringInfo.expiresAt), 'dd MMM, yyyy')} • Use before expiry
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(shop)?scrollTo=explore')}
              activeOpacity={0.8}
              className="bg-amber-500 px-3.5 py-2 rounded-xl"
            >
              <Text className="text-white text-xs font-bold font-sans">Use Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- TIER PROGRESS --- */}
        {tier !== 'Gold' && (
          <View className="bg-white p-5 rounded-2xl border border-primary/10 shadow-sm mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <TrendingUp size={18} color="#e11d48" />
                <Text className="font-bold text-gray-900 ml-2 font-sans text-base">Unlock {tierInfo.next} Tier</Text>
              </View>
              <Text className="text-xs text-gray-500 font-medium font-sans">
                Spend <Text className="font-bold text-gray-900">{formatPrice(tierInfo.target - tierInfo.current)}</Text> more
              </Text>
            </View>
            
            <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden w-full">
              <View className="h-full bg-primary rounded-full" style={{ width: `${tierInfo.target > 0 ? Math.min((tierInfo.current / tierInfo.target) * 100, 100) : 100}%` }} />
            </View>
            
            <View className="flex-row justify-between mt-2">
              <Text className="text-[10px] font-bold text-gray-400 uppercase font-sans">{tier} (Current)</Text>
              <Text className="text-[10px] font-bold text-gray-400 uppercase font-sans">{tierInfo.next} (Goal)</Text>
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
              <TouchableOpacity onPress={() => router.push('/(shop)?scrollTo=explore')} className="mt-3">
                <Text className="text-primary font-bold font-sans">Order now to earn!</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-y-3">
              {transactions.map((txn) => {
                const isPositive = txn.type === 'earn' || txn.type === 'refund';
                const txnDate = txn.createdAt || txn.date;
                
                return (
                  <View key={txn.id || txn._id || Math.random().toString()} className="flex-row items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
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
                          {txn.description} • {txnDate ? format(new Date(txnDate), 'MMM dd, yyyy') : ''}
                        </Text>
                        {txn.type === 'earn' && txn.expiresAt && (
                          <View className="flex-row items-center mt-1">
                            <Text className={`text-[11px] font-sans ${
                              new Date(txn.expiresAt) < new Date() ? 'text-red-500 font-medium' : 'text-amber-700 font-medium'
                            }`}>
                              {new Date(txn.expiresAt) < new Date()
                                ? 'Expired'
                                : `Valid till ${format(new Date(txn.expiresAt), 'dd MMM, yyyy')}`}
                            </Text>
                            {txn.remainingAmount !== undefined && txn.remainingAmount < txn.amount && txn.remainingAmount > 0 && (
                              <Text className="text-[10px] text-gray-400 font-sans ml-1.5">
                                ({txn.remainingAmount} left)
                              </Text>
                            )}
                          </View>
                        )}
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

      </View>
    </View>
  );
}