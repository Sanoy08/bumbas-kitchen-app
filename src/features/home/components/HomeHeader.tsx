// src/features/home/components/HomeHeader.tsx
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronLeft, Mic, Search, User } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import { useAuthStore } from '@/shared/store/authStore';
import { AnimatedSearchText } from './AnimatedSearchText';

interface HomeHeaderProps {
  headerAnimatedStyle: AnimatedStyle<any>;
  locationRowStyle: AnimatedStyle<any>;
  backButtonStyle: AnimatedStyle<any>;
  activeCategory: string;
  isVeg: boolean;
  onSetVeg: (v: boolean) => void;
  onClearCategory: () => void;
  paddingTop: number;
}

const getDisplayAddress = (user: any) => {
  if (!user || !user.savedAddresses || user.savedAddresses.length === 0) {
    return "Select Location";
  }
  const defaultAddr = user.savedAddresses.find((a: any) => a.isDefault) || user.savedAddresses[0];
  const parts = defaultAddr.address.split(',');
  return parts.slice(0, 2).join(',').trim();
};

const getUserInitial = (user: any) => {
  if (!user) return null;
  const name = user.name || user.firstName;
  if (name && typeof name === 'string' && name.trim().length > 0) {
    return name.trim().charAt(0).toUpperCase();
  }
  return null;
};

export const HomeHeader = ({
  headerAnimatedStyle,
  locationRowStyle,
  backButtonStyle,
  activeCategory,
  isVeg,
  onSetVeg,
  onClearCategory,
  paddingTop,
}: HomeHeaderProps) => {
  const { user } = useAuthStore();
  const router = useRouter();

  const userInitial = getUserInitial(user);

  return (
    <Animated.View
      style={[
        headerAnimatedStyle,
        {
          paddingTop,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        },
      ]}
      className="px-4 pb-3"
      pointerEvents="box-none"
    >
      {/* Location Row */}
      <Animated.View style={locationRowStyle} className="flex-row justify-between items-center">
        <View className="flex-row items-center flex-1 pr-4">
          <View className="flex-row items-center bg-white/90 pl-2 pr-3 py-1.5 rounded-full max-w-full">
            <Text className="text-lg font-bold text-gray-900 font-sans flex-shrink" numberOfLines={1} ellipsizeMode="tail">
              {getDisplayAddress(user)}
            </Text>
            <ChevronDown size={18} color="#374151" className="ml-1 flex-shrink-0" />
          </View>
        </View>
        <TouchableOpacity
          onPress={() => user ? router.push('/(shop)/account') : router.push('/(auth)/login')}
          className="h-10 w-10 bg-white/90 rounded-full items-center justify-center border border-gray-100 shadow-sm"
        >
          {userInitial ? (
            <Text className="text-primary font-black text-lg">{userInitial}</Text>
          ) : (
            <User size={20} color="#e11d48" />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Search Row */}
      <View className="flex-row items-center gap-3">
        <Animated.View style={backButtonStyle}>
          <TouchableOpacity onPress={onClearCategory} className="h-10 w-10 items-center justify-center">
            <ChevronLeft size={24} color="#e11d48" />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(shop)/search')}
          className="flex-1 flex-row items-center bg-white border border-gray-200/80 rounded-2xl px-3 py-2.5"
        >
          <Search size={20} color="#e11d48" />
          <AnimatedSearchText />
          <View className="border-l border-gray-300 pl-3 py-0.5">
            <Mic size={20} color="#e11d48" />
          </View>
        </TouchableOpacity>

        {activeCategory === "All" && (
          <TouchableOpacity
            onPress={() => onSetVeg(!isVeg)}
            className={`items-center justify-center px-3 py-1.5 rounded-xl border ${
              isVeg ? 'bg-green-500 border-green-600' : 'bg-white border-gray-300'
            }`}
            activeOpacity={0.7}
          >
            <Text className={`text-xs font-bold font-sans ${isVeg ? 'text-white' : 'text-gray-700'}`}>VEG</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};
