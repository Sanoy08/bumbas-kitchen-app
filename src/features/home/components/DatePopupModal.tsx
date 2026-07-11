// src/features/home/components/DatePopupModal.tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Cake, ChevronRight, Gift, Heart, Sparkles } from 'lucide-react-native';
import { ActivityIndicator, Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-4">
          <View className="bg-white w-full rounded-3xl overflow-hidden">
            <View className="relative bg-orange-50 p-8 pb-10 items-center overflow-hidden">
              <View className="absolute -top-6 -left-6 w-24 h-24 bg-pink-200/50 rounded-full" />
              <View className="absolute bottom-0 -right-6 w-32 h-32 bg-amber-200/50 rounded-full" />
              <View className="relative z-10 w-20 h-20 bg-white rounded-full items-center justify-center mb-4 shadow-sm border border-orange-100">
                <Gift size={40} color="#ea580c" />
                <Sparkles size={24} color="#fbbf24" style={{ position: 'absolute', top: -5, right: -5 }} />
              </View>
              <Text className="text-2xl font-black text-center text-orange-600 font-sans mb-1">
                A Special Gift! 🎁
              </Text>
              <Text className="text-sm text-gray-700 font-medium text-center px-2 mt-2 leading-relaxed font-sans">
                Add your special dates and get a{' '}
                <Text className="font-bold text-rose-600 bg-white px-2 py-0.5 rounded shadow-sm">
                  Flat 5% OFF
                </Text>{' '}
                on your celebration days!
              </Text>
            </View>

            <View className="bg-white rounded-t-[2rem] -mt-6 p-6 pt-8">
              {isDobMissing && (
                <TouchableOpacity onPress={() => onOpenDatePicker('dob')} className="relative mb-4">
                  <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <Cake size={20} color="#f472b6" />
                  </View>
                  <View className="w-full pl-12 pr-4 h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl flex-row justify-between items-center">
                    <Text className={`text-sm font-bold font-sans ${dob ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                      {dob ? format(new Date(dob), 'MMMM do, yyyy') : 'Select Birthday'}
                    </Text>
                    <ChevronRight size={16} color="#9ca3af" />
                  </View>
                  <View className="absolute -top-2.5 left-4 bg-white px-2 rounded-full border border-pink-100">
                    <Text className="text-[10px] font-bold uppercase text-pink-500 font-sans">Your Birthday</Text>
                  </View>
                </TouchableOpacity>
              )}

              {isAnnivMissing && (
                <TouchableOpacity onPress={() => onOpenDatePicker('anniversary')} className="relative mb-2">
                  <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <Heart size={20} color="#f43f5e" />
                  </View>
                  <View className="w-full pl-12 pr-4 h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl flex-row justify-between items-center">
                    <Text className={`text-sm font-bold font-sans ${anniversary ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                      {anniversary ? format(new Date(anniversary), 'MMMM do, yyyy') : 'Select Anniversary'}
                    </Text>
                    <ChevronRight size={16} color="#9ca3af" />
                  </View>
                  <View className="absolute -top-2.5 left-4 bg-white px-2 rounded-full border border-red-100">
                    <Text className="text-[10px] font-bold uppercase text-red-500 font-sans">Anniversary</Text>
                  </View>
                </TouchableOpacity>
              )}

              <View className="mt-6">
                <TouchableOpacity
                  onPress={onSave}
                  disabled={isSavingDates || (!dob && !anniversary)}
                  className={`w-full h-14 rounded-2xl items-center justify-center shadow-sm ${
                    isSavingDates || (!dob && !anniversary) ? 'bg-gray-300' : 'bg-orange-500'
                  }`}
                >
                  {isSavingDates ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base font-sans tracking-wide">Claim 5% Discount</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={onSkip} className="py-4 mt-1">
                  <Text className="text-gray-400 font-semibold font-sans text-center">Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {activeDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent={true} animationType="fade">
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: insets.bottom + 16 }}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={onDateSelected}
                  maximumDate={new Date()}
                />
                <TouchableOpacity
                  onPress={onCloseDatePicker}
                  style={{ marginTop: 16, alignItems: 'center', padding: 14, backgroundColor: '#f97316', borderRadius: 12 }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="calendar"
            onChange={onDateSelected}
            maximumDate={new Date()}
          />
        )
      )}
    </>
  );
};
