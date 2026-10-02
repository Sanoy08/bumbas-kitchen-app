import LottieView from 'lottie-react-native';
import { ArrowRight } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, NativeScrollEvent, NativeSyntheticEvent, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  { 
    animation: require('../../../../assets/animations/onboard_order.json'), 
    title: "Order Your Favorites", 
    desc: "Choose from a wide variety of authentic Bengali dishes right from your phone.", 
    bg: '#FFF5F5' // Very subtle pinkish/red
  },
  { 
    animation: require('../../../../assets/animations/onboard_rider.json'), 
    title: "Fast & Trackable", 
    desc: "Track your food in real-time on the map while our rider is on the way.", 
    bg: '#F0F9FF' // Very subtle blue
  },
  { 
    animation: require('../../../../assets/animations/onboard_delivery.json'), 
    title: "Delivered to Doorstep", 
    desc: "Hot and fresh food delivered safely to you. Enjoy your meal!", 
    bg: '#F0FDF4' // Very subtle green
  }
];

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const flatListRef = useRef<Animated.FlatList>(null);
  
  // scrollX tracks the high-frequency scroll event (100% native)
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // indexAnim tracks the current discrete page index smoothly (JS driven, runs once per page)
  const indexAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    Animated.timing(indexAnim, {
      toValue: currentIndex,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true } // Native driver for buttery smooth scrolling!
  );

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(newIndex);
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }).start(onFinish);
    }
  };

  const backgroundColor = indexAnim.interpolate({
    inputRange: ONBOARDING_STEPS.map((_, i) => i),
    outputRange: ONBOARDING_STEPS.map(step => step.bg),
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={{ flex: 1, backgroundColor, opacity: fadeAnim, zIndex: 999, position: 'absolute', inset: 0, elevation: 15 }}>
      {/* Skip Button */}
      <Animated.View 
        style={{
          position: 'absolute',
          top: 56,
          right: 24,
          zIndex: 50,
          opacity: indexAnim.interpolate({
            inputRange: [ONBOARDING_STEPS.length - 2, ONBOARDING_STEPS.length - 1],
            outputRange: [1, 0],
            extrapolate: 'clamp',
          }),
          transform: [{
            translateY: indexAnim.interpolate({
              inputRange: [ONBOARDING_STEPS.length - 2, ONBOARDING_STEPS.length - 1],
              outputRange: [0, -20],
              extrapolate: 'clamp',
            })
          }]
        }}
      >
        <TouchableOpacity onPress={onFinish} className="p-2">
          <Text className="text-gray-500 font-bold text-base font-sans tracking-wide">Skip</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.FlatList
        ref={flatListRef as any}
        data={ONBOARDING_STEPS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          // These use native driver and are perfectly smooth
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1, 0.8],
            extrapolate: 'clamp',
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          const parallaxLottie = scrollX.interpolate({
            inputRange,
            outputRange: [width * 0.2, 0, -width * 0.2],
            extrapolate: 'clamp',
          });

          const parallaxTitle = scrollX.interpolate({
            inputRange,
            outputRange: [50, 0, -50],
            extrapolate: 'clamp',
          });

          const parallaxDesc = scrollX.interpolate({
            inputRange,
            outputRange: [80, 0, -80],
            extrapolate: 'clamp',
          });

          return (
            <View style={{ width, height, alignItems: 'center', justifyContent: 'center', paddingBottom: 60, overflow: 'hidden' }}>
              <Animated.View 
                style={{ 
                  transform: [{ scale }], 
                  opacity,
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                {/* Free floating Lottie animation without box/shadow */}
                <Animated.View 
                  className="items-center justify-center mb-10"
                  style={{ 
                    width: width * 1.05, 
                    height: width * 1.05,
                    transform: [{ translateX: parallaxLottie }]
                  }}
                >
                  <LottieView 
                    source={item.animation} 
                    autoPlay 
                    loop 
                    style={{ width: '100%', height: '100%' }} 
                    resizeMode="cover" 
                  />
                </Animated.View>

                <Animated.Text 
                  className="text-3xl font-extrabold text-gray-900 px-8 text-center font-sans tracking-tight leading-tight"
                  style={{ transform: [{ translateY: parallaxTitle }] }}
                >
                  {item.title}
                </Animated.Text>
                
                <Animated.Text 
                  className="text-base text-gray-500 font-medium text-center mt-4 px-12 leading-relaxed font-sans"
                  style={{ transform: [{ translateY: parallaxDesc }] }}
                >
                  {item.desc}
                </Animated.Text>
              </Animated.View>
            </View>
          );
        }}
      />

      {/* Bottom Controls */}
      <View className="absolute bottom-24 w-full px-8 flex-row items-center justify-center">
        
        {/* Morphing Next Button */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={handleNext}
          style={{
            shadowColor: '#e11d48',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          <Animated.View 
            className="bg-primary items-center justify-center flex-row overflow-hidden"
            style={{
              height: 64,
              borderRadius: 32,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.4)',
              width: indexAnim.interpolate({
                inputRange: [ONBOARDING_STEPS.length - 2, ONBOARDING_STEPS.length - 1],
                outputRange: [64, 200],
                extrapolate: 'clamp',
              }),
            }}
          >
            <Animated.Text 
              className="text-white font-extrabold text-lg font-sans mr-2 text-center"
              numberOfLines={1}
              style={{
                opacity: indexAnim.interpolate({
                    inputRange: [ONBOARDING_STEPS.length - 2, ONBOARDING_STEPS.length - 1],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                }),
                width: indexAnim.interpolate({
                    inputRange: [ONBOARDING_STEPS.length - 2, ONBOARDING_STEPS.length - 1],
                    outputRange: [0, 120],
                    extrapolate: 'clamp',
                }),
                transform: [
                  {
                    translateX: indexAnim.interpolate({
                      inputRange: [ONBOARDING_STEPS.length - 2, ONBOARDING_STEPS.length - 1],
                      outputRange: [-20, 0],
                      extrapolate: 'clamp',
                    })
                  }
                ]
              }}
            >
              Get Started
            </Animated.Text>
            <ArrowRight size={24} color="#fff" />
          </Animated.View>
        </TouchableOpacity>

      </View>
    </Animated.View>
  );
}