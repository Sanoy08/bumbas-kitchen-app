import React, { useEffect, useRef } from 'react';
import { Modal, Text, TouchableOpacity, View, TouchableWithoutFeedback, Animated, Dimensions, StyleSheet, Pressable, Easing } from 'react-native';
import { X, Check } from 'lucide-react-native';

const { height } = Dimensions.get('window');

export type FilterOption = 'all' | 'veg' | 'non-veg' | 'price-low' | 'price-high';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  activeFilter: FilterOption;
  onApplyFilter: (filter: FilterOption) => void;
}

const FILTER_OPTIONS: { id: FilterOption; label: string }[] = [
  { id: 'all', label: 'All Items' },
  { id: 'veg', label: 'Pure Veg' },
  { id: 'non-veg', label: 'Non-Veg' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
];

export const FilterModal = ({ visible, onClose, activeFilter, onApplyFilter }: FilterModalProps) => {
  const [selectedFilter, setSelectedFilter] = React.useState<FilterOption>(activeFilter);

  // Reset local state when modal opens
  React.useEffect(() => {
    if (visible) setSelectedFilter(activeFilter);
  }, [visible, activeFilter]);

  const slideAnim = useRef(new Animated.Value(height)).current;

  // Handle opening and closing animation
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

  const closeWithAnimation = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleApply = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onApplyFilter(selectedFilter);
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeWithAnimation}
    >
      <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={closeWithAnimation} />
        
        <Animated.View 
          className="w-full flex-1 justify-end"
          style={{ transform: [{ translateY: slideAnim }] }}
        >
          {/* Floating Close Button exactly outside the top */}
          <View className="items-center mb-4">
            <TouchableOpacity 
              onPress={closeWithAnimation} 
              activeOpacity={0.7}
              style={{ backgroundColor: '#000000', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
              className="shadow-2xl border-2 border-white/20"
            >
              <X size={28} color="white" />
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-t-[32px] pt-6 pb-8 px-6 shadow-2xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-black text-gray-900 font-sans">Sort & Filters</Text>
            </View>

              <View className="flex-row flex-wrap gap-3 mb-8">
                {FILTER_OPTIONS.map((option) => {
                  const isSelected = selectedFilter === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setSelectedFilter(option.id)}
                      className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                        isSelected ? 'border-primary bg-primary' : 'border-gray-200 bg-gray-50'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

            <TouchableOpacity
              onPress={handleApply}
              className="bg-primary py-4 rounded-full items-center shadow-sm"
              activeOpacity={0.9}
            >
              <Text className="text-white font-bold text-lg">Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
