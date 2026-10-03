// src/features/home/components/DatePopupModal.tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Cake, ChevronRight, Gift, Heart, Sparkles, X } from 'lucide-react-native';
import { ActivityIndicator, Modal, Platform, Text, TouchableOpacity, View, Animated, Dimensions, Easing, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomCalendarModal } from '@/shared/components/common';
import { useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

interface DatePopupModalProps {
  visible: boolean;
  isDobMissing: boolean;
  isAnnivMissing: boolean;
  dob: string;
  anniversary: string;
  isSavingDates: boolean;
  activeDatePicker: 'dob' | 'anniversary' | null;
  tempDate: Date;
  onSave: () => void;
  onSkip: () => void;
  onOpenDatePicker: (type: 'dob' | 'anniversary') => void;
  onCloseDatePicker: () => void;
  onDateSelected: (event: any, date?: Date) => void;
}

export const DatePopupModal = ({
  visible,
  isDobMissing,
  isAnnivMissing,
  dob,
  anniversary,
  isSavingDates,
  activeDatePicker,
  tempDate,
  onSave,
  onSkip,
  onOpenDatePicker,
  onCloseDatePicker,
  onDateSelected,
}: DatePopupModalProps) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const isClosing = useRef(false);

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(height);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const closeWithAnimation = (action: () => void) => {
    if (isClosing.current) return;
    isClosing.current = true;
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      action();
      setTimeout(() => { isClosing.current = false; }, 300);
    });
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => closeWithAnimation(onSkip)}>
        <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-end">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeWithAnimation(onSkip)} />
          
          <Animated.View 
            className="w-full flex-1 justify-end px-4 pb-6"
            style={{ transform: [{ translateY: slideAnim }] }}
          >
            {/* Ultra Clean Premium Card */}
            <View className="bg-white rounded-[32px] overflow-hidden shadow-xl" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
              
              {/* Close Button - Clean & Minimal */}
              <TouchableOpacity 
                onPress={() => closeWithAnimation(onSkip)} 
                className="absolute top-5 right-5 z-50 w-8 h-8 items-center justify-center bg-gray-100 rounded-full"
              >
                <X size={18} color="#4b5563" />
              </TouchableOpacity>

              <View className="px-6 pt-10 pb-6 items-center">
                {/* Elegant Icon */}
                <View className="w-20 h-20 bg-orange-50 rounded-full items-center justify-center mb-6">
                  <Gift size={36} color="#ea580c" />
                  <Sparkles size={20} color="#fbbf24" style={{ position: 'absolute', top: 4, right: 4 }} />
                </View>

                <Text className="text-[22px] font-black text-center text-gray-900 font-sans tracking-tight mb-2">
                  A Special Gift! 🎁
                </Text>
                
                <Text className="text-[15px] text-gray-500 text-center leading-relaxed font-sans px-2">
                  Add your special dates and get a <Text className="font-bold text-orange-600">Flat 5% OFF</Text> on your celebration days.
                </Text>
              </View>

              <View className="px-6 pb-6">
                
                {isDobMissing && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold uppercase text-gray-400 font-sans mb-2 ml-1 tracking-wider">Your Birthday</Text>
                    <TouchableOpacity onPress={() => onOpenDatePicker('dob')} activeOpacity={0.7}>
                      <View className="w-full h-14 bg-gray-50 rounded-2xl flex-row items-center px-4 border border-gray-200">
                        <Cake size={20} color="#f472b6" />
                        <Text className={`flex-1 ml-3 text-[15px] font-semibold font-sans ${dob ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                          {dob ? format(new Date(dob), 'MMMM do, yyyy') : 'Select Date'}
                        </Text>
                        <ChevronRight size={18} color="#9ca3af" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {isAnnivMissing && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold uppercase text-gray-400 font-sans mb-2 ml-1 tracking-wider">Anniversary</Text>
                    <TouchableOpacity onPress={() => onOpenDatePicker('anniversary')} activeOpacity={0.7}>
                      <View className="w-full h-14 bg-gray-50 rounded-2xl flex-row items-center px-4 border border-gray-200">
                        <Heart size={20} color="#f43f5e" />
                        <Text className={`flex-1 ml-3 text-[15px] font-semibold font-sans ${anniversary ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                          {anniversary ? format(new Date(anniversary), 'MMMM do, yyyy') : 'Select Date'}
                        </Text>
                        <ChevronRight size={18} color="#9ca3af" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                <View className="mt-4">
                  <TouchableOpacity
                    onPress={onSave}
                    disabled={isSavingDates || (!dob && !anniversary)}
                    className={`w-full h-[54px] rounded-2xl items-center justify-center ${
                      isSavingDates || (!dob && !anniversary) ? 'bg-gray-200' : 'bg-[#e23744]'
                    }`}
                  >
                    {isSavingDates ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className={`font-bold text-[16px] font-sans ${isSavingDates || (!dob && !anniversary) ? 'text-gray-400' : 'text-white'}`}>
                        Claim 5% Discount
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          </Animated.View>
      </View>
    </Modal>

      <CustomCalendarModal
        visible={!!activeDatePicker}
        onClose={onCloseDatePicker}
        title={activeDatePicker === 'dob' ? 'Select Birthday' : 'Select Anniversary'}
        initialDate={tempDate}
        maxDate={new Date()}
        onDateSelected={(date) => onDateSelected({ type: 'set' }, date)}
      />
    </>
  );
};
