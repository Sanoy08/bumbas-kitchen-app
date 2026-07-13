import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Animated, PanResponder, Pressable, Dimensions, StyleSheet, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { ChevronRight, X } from 'lucide-react-native';
import { format } from 'date-fns';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface CustomCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onDateSelected: (date: Date) => void;
  initialDate?: Date;
  maxDate?: Date;
  title?: string;
}

export const CustomCalendarModal = ({ visible, onClose, onDateSelected, initialDate, maxDate, title = "Select Date" }: CustomCalendarModalProps) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  
  const [currentMonth, setCurrentMonth] = useState<string>(
    initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );

  const [mode, setMode] = useState<'calendar' | 'year'>('calendar');

  const currentYearInt = new Date().getFullYear();
  const years = Array.from({ length: currentYearInt - 1930 + 1 }, (_, i) => currentYearInt - i);

  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const formatted = initialDate 
        ? format(initialDate, 'yyyy-MM-dd') 
        : format(new Date(), 'yyyy-MM-dd');
      
      setSelectedDate(formatted);
      setCurrentMonth(formatted);
      setMode('calendar');
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 26,
          stiffness: 220,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
    }
  }, [visible, initialDate]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => onClose());
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const handleConfirm = () => {
    onDateSelected(new Date(selectedDate));
    handleClose();
  };

  const handleYearSelect = (year: number) => {
    const d = new Date(currentMonth);
    d.setFullYear(year);
    const newDateStr = format(d, 'yyyy-MM-dd');
    setCurrentMonth(newDateStr);
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode('calendar');
  };

  const toggleMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(mode === 'calendar' ? 'year' : 'calendar');
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-center items-center px-4">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        
        <Animated.View 
          className="w-full bg-white rounded-3xl pb-6 shadow-2xl overflow-hidden"
          style={{ transform: [{ scale: scaleAnim }], opacity: fadeAnim }}
        >
          {/* Colored Header */}
          <View className="bg-primary px-6 py-6 pb-8">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white/80 font-bold font-sans uppercase tracking-wider text-xs">{title}</Text>
              <TouchableOpacity onPress={handleClose} className="p-1.5 bg-white/20 rounded-full">
                <X size={16} color="white" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-end justify-between mt-2">
              <Text className="text-white text-3xl font-extrabold font-sans">
                {format(new Date(selectedDate), 'EEE, MMM d')}
              </Text>
              <TouchableOpacity 
                onPress={toggleMode}
                className="bg-white/20 px-3 py-1.5 rounded-xl flex-row items-center"
              >
                <Text className="text-white font-bold text-lg font-sans mr-1">
                  {format(new Date(currentMonth), 'yyyy')}
                </Text>
                <ChevronRight size={16} color="white" style={{ transform: [{ rotate: mode === 'year' ? '-90deg' : '90deg' }] }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Body content wraps over the header slightly */}
          <View className="bg-white rounded-t-[24px] -mt-5 pt-4 pb-2 px-2">

          {mode === 'calendar' ? (
            <View style={{ height: 350 }}>
              <Calendar
                key={mode}
                current={currentMonth}
                enableSwipeMonths={true}
                showSixWeeks={true}
                maxDate={maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined}
                onDayPress={handleDayPress}
                onMonthChange={(month: any) => setCurrentMonth(month.dateString)}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#9ca3af',
                  selectedDayBackgroundColor: '#e11d48',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#e11d48',
                  dayTextColor: '#374151',
                  textDisabledColor: '#d1d5db',
                  dotColor: '#e11d48',
                  selectedDotColor: '#ffffff',
                  arrowColor: '#e11d48',
                  monthTextColor: '#111827',
                  textDayFontFamily: 'Poppins_500Medium',
                  textMonthFontFamily: 'Poppins_600SemiBold',
                  textDayHeaderFontFamily: 'Poppins_600SemiBold',
                  textDayFontSize: 15,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 13
                }}
                renderHeader={(date: any) => {
                  const d = new Date(date.getTime());
                  return (
                    <View className="flex-row items-center py-1">
                      <Text className="text-lg font-bold text-gray-900 font-sans">
                        {format(d, 'MMMM yyyy')}
                      </Text>
                    </View>
                  );
                }}
                markedDates={{
                  [selectedDate]: { selected: true, disableTouchEvent: true, selectedColor: '#e11d48' }
                }}
              />
            </View>
          ) : (
            <View style={{ height: 350 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 16 }}>
                {years.map(year => {
                  const isSelected = new Date(currentMonth).getFullYear() === year;
                  return (
                    <TouchableOpacity
                      key={year}
                      onPress={() => handleYearSelect(year)}
                      className={`w-full mb-2 py-3.5 rounded-2xl items-center ${
                        isSelected ? 'bg-primary shadow-sm shadow-primary/30' : 'bg-transparent'
                      }`}
                    >
                      <Text className={`font-bold text-xl font-sans tracking-wide ${
                        isSelected ? 'text-white' : 'text-gray-700'
                      }`}>{year}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View className="px-6 pb-6 pt-2 bg-white">
            <TouchableOpacity 
              onPress={handleConfirm}
              className="w-full h-14 bg-primary rounded-2xl items-center justify-center shadow-md shadow-primary/20 flex-row"
            >
              <Text className="text-white font-bold text-lg tracking-wide font-sans">Done</Text>
            </TouchableOpacity>
          </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
