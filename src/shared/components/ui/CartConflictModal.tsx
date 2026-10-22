import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  Animated, 
  Dimensions, 
  StyleSheet, 
  Pressable,
  Easing
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Clock, PlusCircle, Star, X } from 'lucide-react-native';
import { useCartStore } from '@/shared/store/cartStore';

const { height } = Dimensions.get('window');

export function CartConflictModal() {
  const insets = useSafeAreaInsets();
  const pendingProduct = useCartStore((state) => state.pendingConflictProduct);
  const conflictType = useCartStore((state) => state.conflictType);
  const resolveConflict = useCartStore((state) => state.resolveConflict);
  const existingItems = useCartStore((state) => state.items);
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const isVisible = !!pendingProduct;

  useEffect(() => {
    if (isVisible) {
      slideAnim.setValue(height);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const closeModal = (action: boolean | 'clear_and_add' | 'bump_quantity_and_add') => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      resolveConflict(action);
      slideAnim.setValue(height);
    });
  };

  if (!isVisible) return null;

  const isDailySpecialConflict = conflictType === 'regular_qty_under_3' || conflictType === 'existing_regular_under_3';

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => closeModal(false)}
    >
      <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeModal(false)} />

        <Animated.View 
          className="w-full flex-1 justify-end"
          style={{ transform: [{ translateY: slideAnim }], maxHeight: height * 0.88 }}
        >
          {/* Floating Close Button outside top */}
          <View className="items-center mb-4">
            <TouchableOpacity 
              onPress={() => closeModal(false)} 
              activeOpacity={0.7}
              style={{ backgroundColor: '#000000', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
              className="shadow-2xl border-2 border-white/20"
            >
              <X size={28} color="white" />
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-t-[32px] pt-6 px-6 shadow-2xl flex-shrink" style={{ paddingBottom: insets.bottom + 24 }}>

            <View className="items-center mb-5">
              <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 relative ${isDailySpecialConflict ? 'bg-amber-100' : conflictType === 'meal_type_clash' ? 'bg-orange-100' : 'bg-red-50'}`}>
                {isDailySpecialConflict ? (
                  <Star size={30} color="#b45309" fill="#b45309" />
                ) : conflictType === 'meal_type_clash' ? (
                  <Clock size={30} color="#ea580c" />
                ) : (
                  <AlertCircle size={30} color="#e11d48" />
                )}
              </View>

              <Text 
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                className="text-lg font-black text-gray-900 text-center font-sans mb-1 tracking-tight"
              >
                {conflictType === 'regular_qty_under_3' && "কমপক্ষে ৩টি কোয়ান্টিটি প্রয়োজন"}
                {conflictType === 'existing_regular_under_3' && "অর্ডারের নিয়ম (৩+)"}
                {conflictType === 'meal_type_clash' && "লাঞ্চ ও ডিনার একসাথে নয়"}
                {conflictType === 'special_offer_clash' && "কার্ট পরিবর্তন করবেন?"}
                {!conflictType && "কার্ট পরিবর্তন করবেন?"}
              </Text>

              <Text className="text-sm text-gray-600 text-center font-sans px-2 leading-5">
                {conflictType === 'regular_qty_under_3' && (
                  `Today's Special ডিশের সাথে রেগুলার মেনুর কোনো খাবার অর্ডার করতে হলে তার কোয়ান্টিটি কমপক্ষে ৩টি হতে হবে।`
                )}
                {conflictType === 'existing_regular_under_3' && (
                  `Today's Special ডিশ যোগ করতে হলে আপনার কার্টে থাকা রেগুলার খাবারগুলোর প্রতিটি কমপক্ষে ৩টি করে থাকতে হবে।`
                )}
                {conflictType === 'meal_type_clash' && (
                  `একটি অর্ডারে শুধুমাত্র লাঞ্চ অথবা ডিনারের খাবার একসাথে ডেলিভারি নেওয়া যায়। আপনি কি আগের খাবার সরিয়ে এই নতুন খাবারটি যোগ করতে চান?`
                )}
                {(conflictType === 'special_offer_clash' || (!conflictType && conflictType !== 'meal_type_clash')) && (
                  `স্পেশাল অফারের সাথে সাধারণ মেনুর খাবার একসাথে অর্ডার করা যায় না। আপনি কি কার্ট খালি করে এই খাবারটি যোগ করতে চান?`
                )}
              </Text>
            </View>

            {/* Cart Preview Card */}
            <View className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6">
              <View className="mb-3">
                <Text className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-sans tracking-widest">
                  বর্তমানে কার্টে রয়েছে
                </Text>
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                  <Text className="text-sm text-gray-800 font-sans flex-1 font-medium" numberOfLines={1}>
                    {conflictType === 'regular_qty_under_3' 
                      ? "Today's Special ডিশ" 
                      : conflictType === 'meal_type_clash'
                      ? existingItems.some(i => i.mealType?.toLowerCase() === 'lunch')
                        ? "লাঞ্চের খাবার (Lunch Only)"
                        : "ডিনারের খাবার (Dinner Only)"
                      : existingItems.map(i => `${i.name} (${i.quantity}টি)`).join(', ')}
                  </Text>
                </View>
              </View>
              
              <View className="h-[1px] w-full bg-gray-200 mb-3" />

              <View>
                <Text className="text-[11px] font-bold text-primary uppercase mb-1.5 font-sans tracking-widest">
                  নতুন যোগ করতে চাইছেন
                </Text>
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-primary mr-2" />
                  <Text className="text-sm font-bold text-gray-900 font-sans flex-1" numberOfLines={1}>
                    {pendingProduct?.name} {pendingProduct?.mealType && pendingProduct.mealType !== 'both' ? `(${pendingProduct.mealType.toUpperCase()})` : ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            {isDailySpecialConflict ? (
              <View className="space-y-2.5">
                {/* Option 1: Bump to 3 */}
                <TouchableOpacity 
                  onPress={() => closeModal('bump_quantity_and_add')}
                  activeOpacity={0.85}
                  className="w-full py-3.5 rounded-xl bg-primary items-center justify-center flex-row shadow-sm"
                  style={{
                    shadowColor: '#e11d48',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 5,
                    elevation: 3
                  }}
                >
                  <PlusCircle size={18} color="#ffffff" />
                  <Text className="text-white font-bold font-sans text-sm ml-2" numberOfLines={1}>
                    {conflictType === 'regular_qty_under_3' ? "Add 3 Items" : "Make All Regular Items 3"}
                  </Text>
                </TouchableOpacity>

                {/* Option 2: Clear and Add */}
                <View className="flex-row gap-3 pt-1">
                  <TouchableOpacity 
                    onPress={() => closeModal(false)} 
                    activeOpacity={0.8}
                    className="flex-1 py-3 rounded-xl bg-gray-100 items-center justify-center border border-gray-200"
                  >
                    <Text className="text-gray-700 font-bold font-sans text-sm" numberOfLines={1}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => closeModal('clear_and_add')}
                    activeOpacity={0.8}
                    className="flex-1 py-3 rounded-xl bg-white border border-primary items-center justify-center"
                  >
                    <Text className="text-primary font-bold font-sans text-sm" numberOfLines={1}>
                      {conflictType === 'regular_qty_under_3' ? "Clear Cart & Add 1" : "Clear Cart & Add Special"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  onPress={() => closeModal(false)} 
                  activeOpacity={0.8}
                  className="flex-1 py-4 rounded-xl bg-gray-100 items-center justify-center border border-gray-200"
                >
                  <Text className="text-gray-700 font-bold font-sans text-[15px]" numberOfLines={1}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => closeModal('clear_and_add')}
                  activeOpacity={0.8}
                  className="flex-1 py-4 rounded-xl bg-primary items-center justify-center shadow-lg shadow-primary/30"
                >
                  <Text className="text-white font-bold font-sans text-[15px]" numberOfLines={1}>
                    {conflictType === 'meal_type_clash' ? "Clear & Add" : "Replace Cart"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
