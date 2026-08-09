import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, SafeAreaView } from 'react-native';
import Animated, { FadeInUp, ZoomIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { Gift, Sparkles, X, RotateCcw } from 'lucide-react-native';
import { ScratchCard } from '@/shared/components/ui/ScratchCard';

export default function TestScratchScreen() {
  const [isScratchModalOpen, setIsScratchModalOpen] = useState(false);
  const [isScratched, setIsScratched] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  
  const coins = 50;

  const resetState = () => {
    setIsScratched(false);
    setIsClaiming(false);
    setIsScratchModalOpen(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
      <Text className="text-2xl font-black text-gray-800 mb-8">Animation Sandbox</Text>
      
      <TouchableOpacity
        onPress={resetState}
        className="bg-primary px-8 py-4 rounded-full flex-row items-center shadow-lg"
      >
        <Gift size={24} color="white" className="mr-3" />
        <Text className="text-white font-bold text-lg">Test Scratch Card</Text>
      </TouchableOpacity>

      <Text className="text-gray-400 mt-6 px-8 text-center leading-5">
        Click the button above to test the scratch card and coin claim animations without placing an order.
      </Text>

      {/* Modal directly copied from SuccessScreen */}
      <Modal visible={isScratchModalOpen} transparent animationType="fade">
        <View style={StyleSheet.absoluteFill} className="bg-black/90 items-center justify-center p-6">
          <View style={{ position: 'absolute', top: 60, right: 24, zIndex: 10 }}>
            <TouchableOpacity
              onPress={() => setIsScratchModalOpen(false)}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Titles inside Popup */}
          <View className="items-center mb-10 w-full px-4">
            <Text className="text-3xl font-black text-white text-center mb-2">
              {isScratched ? "Congratulations! 🎉" : "You got a surprise! 🎁"}
            </Text>
            <Text className="text-base font-bold text-gray-300 text-center">
              {isScratched ? "Your coins have been added to your wallet." : "Scratch the card below to reveal your reward"}
            </Text>
          </View>

          <View style={{ position: 'relative' }}>
            <ScratchCard
              width={300}
              height={300}
              coverColor="#e11d48"
              strokeWidth={45}
              scratchThreshold={40}
              onScratchComplete={() => setIsScratched(true)}
            >
              <View className="flex-1 bg-white items-center justify-center rounded-[32px] overflow-hidden p-6 border-4 border-yellow-400 shadow-xl">
                <View className="mb-4 w-24 h-24 rounded-full bg-rose-50 border-4 border-rose-100 shadow-md items-center justify-center">
                  <Sparkles size={48} color="#e11d48" />
                </View>
                <Text className="text-2xl font-bold text-gray-500 mb-2">You Won!</Text>
                <Text className="text-6xl font-black text-primary">+{coins}</Text>
                <Text className="text-lg font-bold text-gray-400 mt-2 uppercase tracking-widest">BK Coins</Text>
              </View>
            </ScratchCard>
          </View>

          {isScratched && (
            <Animated.View entering={FadeInUp.delay(300)} className="mt-12 w-full max-w-[300px]">
              <TouchableOpacity
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setIsClaiming(true);
                }}
                className="bg-primary h-14 rounded-full items-center justify-center shadow-lg"
              >
                <Text className="text-white font-bold text-lg">Claim Coins!</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Coin Claim Animation Overlay inside Modal */}
          {isClaiming && (
            <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]} pointerEvents="none">
              <LottieView
                source={require('../../../assets/animations/coin-claim.json')}
                autoPlay
                loop={false}
                style={StyleSheet.absoluteFillObject}
                onAnimationFinish={() => {
                  setIsClaiming(false);
                  setIsScratchModalOpen(false);
                }}
              />
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
