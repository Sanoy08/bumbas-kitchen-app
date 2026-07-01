// src/app/(shop)/checkout/success.tsx

import { formatPrice } from '@/lib/utils';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { ArrowRight, Home, ShoppingBag, Sparkles } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
    Dimensions,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function OrderSuccessScreen() {
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

  // Animation shared values
  const lottieScale = useSharedValue(1);
  const lottieTranslateY = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);
  const contentOpacity = useSharedValue(0);

  const lottieRef = useRef<LottieView>(null);

  // Trigger animation after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      // Shrink Lottie & move up
      lottieScale.value = withSpring(0.5, { damping: 12, stiffness: 100 });
      lottieTranslateY.value = withTiming(-120, { duration: 600, easing: Easing.out(Easing.ease) });

      // Slide content in from bottom
      contentTranslateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) });
      contentOpacity.value = withTiming(1, { duration: 600 });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Make Lottie loop infinitely after first play
  const handleLottieAnimationFinish = () => {
    if (lottieRef.current) {
      lottieRef.current.play(95, -1); // loop from frame 95 to end
    }
  };

  // Animated styles
  const lottieStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: lottieScale.value },
      { translateY: lottieTranslateY.value },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
    opacity: contentOpacity.value,
  }));

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.wrapper}>
        {/* Lottie Container – animated */}
        <Animated.View style={[styles.lottieWrapper, lottieStyle]}>
          <View style={styles.lottieContainer}>
            <LottieView
              ref={lottieRef}
              source={require('../../../../assets/animations/success.json')}
              autoPlay
              loop={false}
              style={styles.lottie}
              speed={0.8}
              onAnimationFinish={handleLottieAnimationFinish}
            />
          </View>
        </Animated.View>

        {/* Content – slides in from bottom */}
        <Animated.View style={[styles.content, contentStyle]}>
          <Text style={styles.title}>🎉 Order Placed!</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            Awesome, {name}! Your food is getting ready.
          </Text>

          {/* Order Details Card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>ORDER ID</Text>
              <Text style={styles.cardValue}>#{orderId}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>AMOUNT</Text>
              <Text style={[styles.cardValue, styles.amountText]}>
                {formatPrice(amount)}
              </Text>
            </View>
          </View>

          {/* Coins Earned Card */}
          <View style={[styles.card, styles.coinsCard]}>
            <View style={styles.cardRow}>
              <View style={styles.coinsLeft}>
                <Sparkles size={20} color="#e11d48" />
                <Text style={styles.coinsTitle}>Coins Earned</Text>
              </View>
              <Text style={styles.coinsAmount}>+{coins}</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.push('/(shop)/account/orders')}
            >
              <ShoppingBag size={20} color="#fff" />
              <Text style={styles.buttonText}>View Order</Text>
              <ArrowRight size={18} color="#fff" style={styles.buttonIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.push('/(shop)')}
            >
              <Home size={20} color="#4b5563" />
              <Text style={styles.secondaryButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            You will receive a confirmation notification shortly.
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20, // extra bottom space to prevent clipping
  },
  lottieWrapper: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  lottieContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ffffffcc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  amountText: {
    color: '#e11d48',
    fontSize: 18,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  coinsCard: {
    backgroundColor: '#fce4ec',
    borderColor: '#f8bbd0',
  },
  coinsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#880e4f',
    marginLeft: 8,
  },
  coinsAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#e11d48',
  },
  buttonGroup: {
    width: '100%',
    marginTop: 6,
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#e11d48',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 2,
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 48,
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  footerText: {
    marginTop: 16,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
  },
});