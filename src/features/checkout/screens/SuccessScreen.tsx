// src/app/(shop)/checkout/success.tsx

import { ScratchCard } from '@/shared/components/ui';
import { useCartStore } from '@/shared/store/cartStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { formatPrice } from '@/shared/utils/utils';
import { useAudioPlayer } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { ArrowRight, Gift, Home, ShoppingBag, Sparkles, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  ZoomIn,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width } = Dimensions.get('window');

// Animated Ring Component for the pulse effect
const PulseRing = ({ delay = 0, scaleTo = 1.5, opacityTo = 0 }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(progress.value, [0, 1], [0.8, scaleTo]) }],
      opacity: interpolate(progress.value, [0, 1], [0.6, opacityTo]),
    };
  });

  return <Animated.View style={[styles.pulseRing, style]} />;
};

export function SuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    orderId: string;
    name: string;
    amount: string;
    coins: string;
  }>();

  const orderId = params.orderId || '---';
  const name = params.name || 'Guest';
  const amount = params.amount ? parseFloat(params.amount) : 0;
  const coins = parseInt(params.coins || '0', 10);

  const [isScreenFocused, setIsScreenFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, [])
  );

  const clearCart = useCartStore((state) => state.clearCart);
  const setHasOrdered = useSessionStore((state) => state.setHasOrdered);

  useEffect(() => {
    clearCart();
    setHasOrdered(); // Mark that user has placed an order this session

    // Log the total API calls made up to this point
    console.log(`\n=================================================`);
    console.log(`🎉 SUCCESS PAGE REACHED!`);
    console.log(`Total API Calls made from App Start: ${(global as any).apiCallCount || 0}`);
    console.log(`=================================================\n`);

    const onBackPress = () => {
      router.replace('/(shop)');
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      backHandler.remove();
    };
  }, []);

  const checkScale = useSharedValue(0);
  const iconTranslate = useSharedValue(20);
  const checkDrawProgress = useSharedValue(0);

  // New shared values for the sequence
  const iconMainTranslateY = useSharedValue(160); // Starts 160px lower (centered)
  const iconMainScale = useSharedValue(1.25); // Starts slightly larger

  const detailsOpacity1 = useSharedValue(0);
  const detailsOpacity2 = useSharedValue(0);
  const detailsOpacity3 = useSharedValue(0);
  const detailsOpacity4 = useSharedValue(0);

  const [isScratchModalOpen, setIsScratchModalOpen] = useState(false);
  const [isScratched, setIsScratched] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const giftBounce = useSharedValue(0);
  useEffect(() => {
    giftBounce.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 500, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.bounce })
      ),
      -1,
      true
    );
  }, []);
  const giftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: giftBounce.value }]
  }));

  const player = useAudioPlayer(require('../../../../assets/sounds/success.mp3'));

  useEffect(() => {
    if (isScreenFocused) {
      player.play();
    }
  }, [isScreenFocused]);

  useEffect(() => {
    // 1. Initial checkmark pop-in
    checkScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    iconTranslate.value = withDelay(300, withSpring(0, { damping: 10, stiffness: 80 }));

    // Draw the checkmark
    checkDrawProgress.value = withDelay(500, withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) }));

    // 2. Move the checkmark up to its final position after a 0.89s pause
    const moveUpConfig = { duration: 800, easing: Easing.out(Easing.exp) };
    iconMainTranslateY.value = withDelay(890, withTiming(0, moveUpConfig));
    iconMainScale.value = withDelay(890, withTiming(1, moveUpConfig));

    // 3. Staggered reveal of the details
    const fadeConfig = { duration: 600, easing: Easing.out(Easing.ease) };
    detailsOpacity1.value = withDelay(990, withTiming(1, fadeConfig));
    detailsOpacity2.value = withDelay(1140, withTiming(1, fadeConfig));
    detailsOpacity3.value = withDelay(1290, withTiming(1, fadeConfig));
    detailsOpacity4.value = withDelay(1440, withTiming(1, fadeConfig, (finished) => {
      // 4. Automatically open Scratch Card exactly when final animation finishes
      if (finished && coins > 0) {
        runOnJS(setIsScratchModalOpen)(true);
      }
    }));
  }, [coins]);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconTranslate.value }],
    opacity: interpolate(iconTranslate.value, [20, 0], [0, 1]),
  }));

  const iconWrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: iconMainTranslateY.value },
      { scale: iconMainScale.value }
    ]
  }));

  const animatedCheckProps = useAnimatedProps(() => {
    const length = 24;
    return {
      strokeDashoffset: length - length * checkDrawProgress.value,
    };
  });

  const createDetailStyle = (opacityVal: Animated.SharedValue<number>) => useAnimatedStyle(() => ({
    opacity: opacityVal.value,
    transform: [{ translateY: interpolate(opacityVal.value, [0, 1], [30, 0]) }]
  }));

  const detailStyle1 = createDetailStyle(detailsOpacity1);
  const detailStyle2 = createDetailStyle(detailsOpacity2);
  const detailStyle3 = createDetailStyle(detailsOpacity3);
  const detailStyle4 = createDetailStyle(detailsOpacity4);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#fff1f2', '#ffffff']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        <View style={styles.wrapper}>
          {/* Animated Checkmark UI (Initially Centered) */}
          <Animated.View style={[styles.iconContainer, iconWrapperStyle]}>
            <PulseRing delay={0} scaleTo={1.6} opacityTo={0} />
            <PulseRing delay={1000} scaleTo={2} opacityTo={0} />

            <Animated.View style={[styles.iconCircle, checkAnimatedStyle]}>
              <LinearGradient
                colors={['#f43f5e', '#e11d48']}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Animated.View style={iconAnimatedStyle}>
                  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <AnimatedPath
                      d="M4 12L9 17L20 6"
                      strokeDasharray={24}
                      animatedProps={animatedCheckProps}
                    />
                  </Svg>
                </Animated.View>
              </LinearGradient>
            </Animated.View>
          </Animated.View>

          {/* Text Content */}
          <Animated.View style={[styles.content, detailStyle1]}>
            <Text style={styles.title}>🎉 Order Placed!</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              Awesome, {name}! Your food is getting ready.
            </Text>
          </Animated.View>

          {/* Order Details Card */}
          <Animated.View style={[styles.cardContainer, detailStyle2]}>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>ORDER ID</Text>
                <Text style={styles.cardValue}>#{orderId}</Text>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>AMOUNT PAID</Text>
                <Text style={[styles.cardValue, styles.amountText]}>
                  {formatPrice(amount)}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Removed Coins Earned - Gift Pill because it now auto-opens */}

          {/* Actions */}
          <Animated.View style={[styles.buttonGroup, coins > 0 ? detailStyle4 : detailStyle3]}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.replace(`/account/orders?orderId=${orderId}`)}
            >
              <ShoppingBag size={20} color="#fff" />
              <Text style={styles.buttonText}>View Order</Text>
              <ArrowRight size={18} color="#fff" style={styles.buttonIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.replace('/(shop)')}
            >
              <Home size={20} color="#4b5563" />
              <Text style={styles.secondaryButtonText}>Back to Home</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              You will receive a confirmation notification shortly.
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>

      {/* Scratch Modal */}
      <Modal visible={isScratchModalOpen} transparent animationType="none">
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Animated.View entering={FadeIn.duration(500)} style={StyleSheet.absoluteFill} className="bg-black/90">
            
            {/* Main Content Container */}
            <Animated.View entering={ZoomIn.delay(200).springify().damping(18).stiffness(150)} style={StyleSheet.absoluteFill} className="items-center justify-center p-6">
              
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
                  key={isScratchModalOpen ? 'open' : 'closed'}
                  width={300}
                  height={300}
                  coverColor="#e11d48"
                  strokeWidth={45}
                  scratchThreshold={40}
                  onScratchComplete={() => setIsScratched(true)}
                >
                  <View className="flex-1 bg-white items-center justify-center rounded-[32px] overflow-hidden p-6 border-4 border-yellow-400 shadow-xl">
                    <View style={styles.coinsIconWrap} className="mb-4 w-24 h-24 rounded-full bg-rose-50 border-4 border-rose-100 shadow-md">
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
              
            </Animated.View>

            {/* Coin Claim Animation Overlay outside of flex container */}
            {isClaiming && (
              <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 9999, alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
                <LottieView
                  source={require('../../../../assets/animations/coin-claim.json')}
                  autoPlay
                  loop={false}
                  style={{ width: '100%', height: '100%', transform: [{ scale: 1.2 }] }}
                  onAnimationFinish={() => {
                    setIsClaiming(false);
                    setIsScratchModalOpen(false);
                  }}
                />
              </View>
            )}
          </Animated.View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  iconContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: -20,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffe4e6',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  amountText: {
    color: '#e11d48',
    fontSize: 20,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  coinsCard: {
    backgroundColor: '#fff1f2',
    borderColor: '#ffe4e6',
    borderWidth: 1,
    paddingVertical: 16,
  },
  coinsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffe4e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9f1239',
    marginLeft: 10,
  },
  coinsAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e11d48',
  },
  buttonGroup: {
    width: '100%',
    maxWidth: 400,
    marginTop: 16,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#e11d48',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 2,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    marginTop: 20,
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
  },
  giftPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  giftPillText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});