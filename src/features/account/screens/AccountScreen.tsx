// src\app\(shop)\account\index.tsx

import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
    Cake,
    ChevronRight,
    Heart,
    Lock,
    LogOut,
    MapPin,
    Phone,
    ShoppingBag,
    Sparkles,
    TicketPercent,
    Wallet,
    X
} from 'lucide-react-native';
import { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    RefreshControl,
    Animated,
    PanResponder,
    Pressable,
    Dimensions,
    StyleSheet,
    Easing
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { useAlert } from '@/shared/components/ui'; // ★ Custom Alert import
import { useAuthStore } from '@/shared/store/authStore';
import { CustomCalendarModal } from '@/shared/components/common';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

// --- Reusable Menu Item Component ---
const MenuItem = ({ icon: Icon, title, subtitle, onPress, isDestructive = false }: any) => (
  <TouchableOpacity 
    onPress={onPress} 
    activeOpacity={0.7}
    className={`flex-row items-center justify-between p-4 mb-3 rounded-2xl border shadow-sm ${
      isDestructive 
        ? 'bg-red-50 border-red-100' 
        : 'bg-white border-gray-100'
    }`}
  >
    <View className="flex-row items-center flex-1">
      <View className={`h-11 w-11 rounded-xl items-center justify-center mr-4 ${
        isDestructive ? 'bg-red-100' : 'bg-gray-100'
      }`}>
        <Icon size={20} color={isDestructive ? '#dc2626' : '#4b5563'} />
      </View>
      <View className="flex-1 pr-4">
        <Text className={`font-bold text-sm font-sans ${isDestructive ? 'text-red-700' : 'text-gray-900'}`}>{title}</Text>
        {subtitle && (
          <Text className={`text-xs mt-0.5 font-medium font-sans ${isDestructive ? 'text-red-500' : 'text-gray-500'}`}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    {!isDestructive && <ChevronRight size={20} color="#d1d5db" />}
  </TouchableOpacity>
);

export function AccountScreen() {
  const { user, login, logout, isInitialized } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert(); // ★ Custom alert hook
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  
  const { height } = Dimensions.get('window');
  const slideAnim = useRef(new Animated.Value(height)).current;

  const openEditModal = () => {
    setIsEditProfileOpen(true);
    slideAnim.setValue(height);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeEditModal = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIsEditProfileOpen(false));
  };


  
  // Forms & Loading
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dob, setDob] = useState("");
  const [anniversary, setAnniversary] = useState("");

  // Date picker states
  const [activeDatePicker, setActiveDatePicker] = useState<'dob' | 'anniversary' | null>(null);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    // Set Default Values
    if (user.dob) setDob(user.dob);
    if (user.anniversary) setAnniversary(user.anniversary);
    if (user.wallet?.currentBalance) setWalletBalance(user.wallet.currentBalance);
  }, [user, isInitialized]);

  const onRefresh = async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/wallet`);
      const data = await res.json();
      if (data.success && data.wallet) {
        useAuthStore.setState((state) => ({
          user: state.user ? {
            ...state.user,
            wallet: {
              ...state.user.wallet,
              currentBalance: data.wallet.balance || 0,
            }
          } : null
        }));
        setWalletBalance(data.wallet.balance || 0);
      }
    } catch (error) {
      console.log('Account refresh failed:', error);
    } finally {
      setRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const openDatePicker = (type: 'dob' | 'anniversary') => {
    setActiveDatePicker(type);
    if (type === 'dob' && dob) {
      setTempDate(new Date(dob));
    } else if (type === 'anniversary' && anniversary) {
      setTempDate(new Date(anniversary));
    } else {
      setTempDate(new Date());
    }
  };

  const onDateSelected = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setActiveDatePicker(null);
    }
    if (event.type !== 'dismissed' && selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      if (activeDatePicker === 'dob') {
        setDob(formatted);
      } else if (activeDatePicker === 'anniversary') {
        setAnniversary(formatted);
      }
    }
  };

  // Validation flags
  const isDobMissing = !user?.dob || user?.dob === "";
  const isAnnivMissing = !user?.anniversary || user?.anniversary === "";

  const onProfileSubmit = async () => {
    if (!user) return;

    // Cannot save Anniversary without Birthday
    if (isDobMissing && !dob) {
      toast.error("Please add your Birthday first.");
      return;
    }

    setIsSaving(true);
    try {
      let firstName = "User";
      let lastName = ".";
      
      if (user.name && typeof user.name === 'string') {
        const parts = user.name.trim().split(/\s+/);
        firstName = parts[0] || "User";
        lastName = parts.slice(1).join(' ') || ".";
      } else if (user.firstName && typeof user.firstName === 'string') {
        firstName = user.firstName;
        lastName = user.lastName || ".";
      }

      const payload = {
        firstName: firstName,
        lastName: lastName,
        dob: dob || user?.dob,
        anniversary: anniversary || user?.anniversary,
      };
      
      const res = await fetch(`${API_URL}/auth/update-profile`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update profile");
      
      await login(resData.user);
      toast.success("Profile Updated Successfully! 🎉");
      closeEditModal();
    } catch (e: any) { 
      toast.error(e.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // ★★★ Custom Alert দিয়ে Logout confirmation ★★★
  const confirmLogout = () => {
    showAlert({
      title: "Are you sure?",
      message: "You will be logged out of your account. You need to sign in again to access your orders.",
      confirmText: "Log Out",
      cancelText: "Cancel",
      confirmButtonStyle: "destructive",
      onConfirm: async () => {
        await logout();
        router.replace('/(auth)/login');
        toast.success("Logged out successfully");
      },
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const hasDob = !!user?.dob;
  const hasAnniversary = !!user?.anniversary;

  if (!isInitialized || !user) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    // ★ Added paddingTop using insets.top to avoid status bar overlap
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView 
        className="flex-1 px-4" 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e11d48"
            colors={['#e11d48']}
            progressBackgroundColor="#ffffff"
            progressViewOffset={20}
          />
        }
      >
        
        {/* --- HEADER --- */}
        <Text className="text-3xl font-bold text-gray-900 mb-6 font-sans">My Account</Text>

        {/* --- PROFILE INFO --- */}
        <View className="flex-row items-center mb-4">
          <View className="h-16 w-16 rounded-full border-2 border-gray-100 overflow-hidden bg-rose-100 items-center justify-center">
            <Text className="text-primary font-bold text-xl">{getInitials(user.name)}</Text>
          </View>
          <View className="flex-1 ml-4">
            <Text className="text-xl font-bold text-gray-900 font-sans" numberOfLines={1}>{user.name}</Text>
            <View className="flex-row items-center mt-1">
              <Phone size={14} color="#6b7280" />
              <Text className="text-sm font-medium text-gray-500 ml-1.5 font-sans">+91 {user.phone}</Text>
            </View>
          </View>
        </View>
        
        <View className="h-[1px] bg-gray-100 w-full mb-2" />

        <View className="items-end mb-4">
          <TouchableOpacity onPress={openEditModal} className="py-2 px-3">
            <Text className="text-primary font-semibold font-sans">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* --- HORIZONTAL HIGHLIGHT SECTION --- */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity onPress={() => router.push('/(shop)/account/wallet')} activeOpacity={0.8} className="flex-1 bg-amber-50 border border-amber-100 p-4 rounded-2xl relative overflow-hidden">
            <View className="absolute top-2 right-2 opacity-10"><Wallet size={48} color="#d97706" /></View>
            <View className="flex-row items-center mb-2">
              <View className="p-1.5 bg-white rounded-lg"><Wallet size={14} color="#d97706" /></View>
              <Text className="text-[10px] font-bold text-amber-800 uppercase ml-2 font-sans">Wallet</Text>
            </View>
            <Text className="text-lg font-bold text-gray-900 font-sans">₹{walletBalance.toFixed(2)}</Text>
            <Text className="text-[10px] text-gray-500 font-medium font-sans mt-0.5">Available Balance</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => router.push('/(shop)/account/coupons')} activeOpacity={0.8} className="flex-1 bg-blue-50 border border-blue-100 p-4 rounded-2xl relative overflow-hidden">
            <View className="absolute top-2 right-2 opacity-10"><TicketPercent size={48} color="#2563eb" /></View>
            <View className="flex-row items-center mb-2">
              <View className="p-1.5 bg-white rounded-lg"><TicketPercent size={14} color="#2563eb" /></View>
              <Text className="text-[10px] font-bold text-blue-800 uppercase ml-2 font-sans">Coupons</Text>
            </View>
            <Text className="text-sm font-bold text-gray-900 mt-1 font-sans">View Offers</Text>
            <Text className="text-[10px] text-gray-500 font-medium font-sans mt-0.5">Save more on orders</Text>
          </TouchableOpacity>
        </View>

        {/* --- MENU LIST --- */}
        <MenuItem icon={ShoppingBag} title="My Orders" subtitle="Track, Cancel and Return orders" onPress={() => router.push('/(shop)/account/orders')} />
        <MenuItem icon={Heart} title="My Favorites" subtitle="View and order your favorite dishes" onPress={() => router.push('/(shop)/account/favorites')} />
        <MenuItem icon={MapPin} title="Addresses" subtitle="Save addresses for hassle-free checkout" onPress={() => router.push('/(shop)/account/addresses')} />
        <MenuItem icon={Wallet} title="My Wallet & Coins" subtitle="Check balance and transaction history" onPress={() => router.push('/(shop)/account/wallet')} />
        <MenuItem icon={TicketPercent} title="My Coupons" subtitle="View available coupons for you" onPress={() => router.push('/(shop)/account/coupons')} />

        <View className="mt-4">
          <MenuItem icon={LogOut} title="Log Out" subtitle="Sign out of your account" isDestructive onPress={confirmLogout} />
        </View>
      </ScrollView>

      {/* --- EDIT PROFILE MODAL --- */}
      <Modal visible={isEditProfileOpen} transparent animationType="fade" onRequestClose={closeEditModal}>
        <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-end">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEditModal} />
          
          <Animated.View 
            className="w-full flex-1 justify-end"
            style={{ transform: [{ translateY: slideAnim }], maxHeight: height * 0.85 }}
          >
            {/* Floating Close Button exactly outside the top */}
            <View className="items-center mb-4">
              <TouchableOpacity 
                onPress={closeEditModal} 
                activeOpacity={0.7}
                style={{ backgroundColor: '#000000', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
                className="shadow-2xl border-2 border-white/20"
              >
                <X size={28} color="white" />
              </TouchableOpacity>
            </View>

            <View className="bg-white rounded-t-[32px] pt-6 px-6 shadow-2xl" style={{ paddingBottom: insets.bottom + 24 }}>


              <Text className="text-2xl font-extrabold text-gray-900 font-sans mb-6">Edit Profile Details</Text>
              
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-700 mb-2 font-sans">First Name</Text>
                <View className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3.5">
                  <Text className="text-gray-500 font-medium font-sans">
                    {user?.name ? user.name.split(' ')[0] : 'User'}
                  </Text>
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-700 mb-2 font-sans">Last Name</Text>
                <View className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3.5">
                  <Text className="text-gray-500 font-medium font-sans">
                    {user?.name ? user.name.split(' ').slice(1).join(' ') : '.'}
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8">
              <View className="flex-row items-center mb-4">
                <Sparkles size={16} color="#f59e0b" />
                <Text className="font-semibold text-sm text-gray-700 ml-2 font-sans">Special Dates</Text>
              </View>

              {/* Birthday Field */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-gray-500 mb-2 uppercase font-sans">Birthday</Text>
                <TouchableOpacity 
                  onPress={() => openDatePicker('dob')} 
                  disabled={hasDob}
                  activeOpacity={0.7}
                  className={`flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3 ${hasDob ? 'opacity-60' : ''}`}
                >
                  <Cake size={18} color="#ec4899" />
                  <Text className="flex-1 ml-3 font-medium text-gray-900 font-sans">
                    {dob ? format(new Date(dob), 'MMMM do, yyyy') : 'Select Birthday'}
                  </Text>
                  {hasDob && <Lock size={14} color="#9ca3af" />}
                  {!hasDob && <ChevronRight size={16} color="#9ca3af" />}
                </TouchableOpacity>
              </View>

              {/* Anniversary Field - disabled if Birthday missing AND user has no stored dob */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 uppercase font-sans">Anniversary</Text>
                <TouchableOpacity 
                  onPress={() => openDatePicker('anniversary')} 
                  disabled={hasAnniversary || (isDobMissing && !dob)}
                  activeOpacity={0.7}
                  className={`flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3 ${(hasAnniversary || (isDobMissing && !dob)) ? 'opacity-60' : ''}`}
                >
                  <Heart size={18} color="#ef4444" />
                  <Text className="flex-1 ml-3 font-medium text-gray-900 font-sans">
                    {anniversary ? format(new Date(anniversary), 'MMMM do, yyyy') : 'Select Anniversary'}
                  </Text>
                  {hasAnniversary && <Lock size={14} color="#9ca3af" />}
                  {!hasAnniversary && <ChevronRight size={16} color="#9ca3af" />}
                </TouchableOpacity>
                {(isDobMissing && !dob && !hasAnniversary) && (
                  <Text className="text-xs text-rose-500 mt-1 ml-1 font-sans">
                    * Add your birthday first to set anniversary
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity 
              onPress={onProfileSubmit} 
              disabled={isSaving}
              className={`w-full h-14 rounded-xl items-center justify-center shadow-sm ${isSaving ? 'bg-primary/70' : 'bg-primary'}`}
            >
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg font-sans">Save Changes</Text>}
            </TouchableOpacity>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <CustomCalendarModal
        visible={!!activeDatePicker}
        onClose={() => setActiveDatePicker(null)}
        title={activeDatePicker === 'dob' ? 'Select Birthday' : 'Select Anniversary'}
        initialDate={tempDate}
        maxDate={new Date()}
        onDateSelected={(date) => onDateSelected({ type: 'set' }, date)}
      />
    </View>
  );
}