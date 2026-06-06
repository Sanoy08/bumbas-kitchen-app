// src/app/(auth)/login.tsx
import { useAuthStore } from '@/store/authStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { AlertOctagon, ArrowLeft, Clock, RefreshCw, ShieldAlert } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as z from 'zod';

const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian Mobile Number'),
});

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';
const HERO_IMAGE_URL = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop';
const { width: screenWidth } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const scrollViewRef = useRef<ScrollView>(null);

  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  const phoneValue = watch('phone');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [limitData, setLimitData] = useState({ ipLeft: 5, phoneLeft: 3, isBlocked: false, resetTime: '', reason: '' });
  const [showBlockPopup, setShowBlockPopup] = useState(false);
  
  // Determine default bottom offset based on step (without keyboard)
  const getDefaultBottom = (currentStep: 'phone' | 'otp') => {
    return currentStep === 'phone' ? 20 : 52; // OTP step lifts sheet higher by default
  };

  // Animated value for bottom sheet position
  const animatedBottom = useRef(new Animated.Value(getDefaultBottom(step))).current;

  // When step changes, animate to the new default bottom position
  useEffect(() => {
    Animated.timing(animatedBottom, {
      toValue: getDefaultBottom(step),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  // Keyboard handling with step-aware offset
  useEffect(() => {
    const keyboardWillShow = (e: any) => {
      let targetBottom;
      if (step === 'otp') {
        // OTP step: lift sheet more so OTP inputs are clearly above keyboard
        targetBottom = e.endCoordinates.height - 30;
      } else {
        // Phone step: keep original calculation (slightly less lift)
        targetBottom = e.endCoordinates.height * 0.8 - 70;
      }
      Animated.timing(animatedBottom, {
        toValue: targetBottom,
        duration: 250,
        useNativeDriver: false,
      }).start();
    };
    const keyboardWillHide = () => {
      // Return to step-specific default position
      Animated.timing(animatedBottom, {
        toValue: getDefaultBottom(step),
        duration: 250,
        useNativeDriver: false,
      }).start();
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideListener = Keyboard.addListener(hideEvent, keyboardWillHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [animatedBottom, step]);

  const scrollToInput = (yPosition: number) => {
    scrollViewRef.current?.scrollTo({ y: yPosition - 20, animated: true });
  };

  const fetchLimit = async (phoneVal: string = '') => {
    try {
      const res = await fetch(`${API_URL}/auth/phone/check-limit?phone=${phoneVal}`);
      const data = await res.json();
      if (data.success) {
        setLimitData(data);
        if (data.isBlocked) setShowBlockPopup(true);
      }
    } catch (e) {
      console.log('Limit check failed', e);
    }
  };

  useEffect(() => { fetchLimit(); }, []);
  useEffect(() => { if (phoneValue?.length === 10) fetchLimit(phoneValue); }, [phoneValue]);

  useEffect(() => {
    if (step === 'otp' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) setCanResend(true);
  }, [timeLeft, step]);

  useEffect(() => {
    if (step === 'otp') {
      const timer = setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const formatResetTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' on ' + d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const verifyOtpLogic = async (otpValue: string) => {
    if (otpValue.length !== 6) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/phone/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneValue, otp: otpValue }),
      });
      const data = await res.json();
      if (data.success) {
        await login(data.user, data.token);
        router.replace('/');
      } else {
        Alert.alert('Error', data.error || 'Invalid OTP');
        setIsLoading(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed');
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    const combinedOtp = newOtp.join('');
    if (combinedOtp.length === 6 && index === 5 && value) verifyOtpLogic(combinedOtp);
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onPhoneSubmit = async (data: { phone: string }) => {
    if (limitData.isBlocked) {
      setShowBlockPopup(true);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/phone/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: data.phone }),
      });
      const responseData = await res.json();
      if (responseData.success) {
        setStep('otp');
        setCanResend(false);
        setTimeLeft(30);
        setOtp(['', '', '', '', '', '']);
        fetchLimit(data.phone);
      } else {
        Alert.alert('Error', responseData.error || 'Failed to send OTP');
        if (responseData.isBlocked || res.status === 429) {
          setLimitData(prev => ({ ...prev, isBlocked: true, reason: responseData.error, resetTime: responseData.resetTime }));
          setShowBlockPopup(true);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: HERO_IMAGE_URL }} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.overlay} />
      </View>

      <Animated.View style={[styles.bottomSheet, { bottom: animatedBottom }]}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {step === 'phone' ? (
            <View style={styles.phoneStepContainer}>
              <View>
                <Text className="text-center text-gray-500 font-medium text-base mb-6">
                  Log in or sign up
                </Text>

                <View className="space-y-2">
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View
                        className={`flex-row items-center border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-xl bg-white overflow-hidden h-14`}
                      >
                        <View className="flex-row items-center px-4 bg-gray-50 border-r border-gray-300 h-full">
                          <Text className="text-xl mr-1">🇮🇳</Text>
                          <Text className="text-gray-600 font-medium text-base ml-1">+91</Text>
                        </View>
                        <TextInput
                          className="flex-1 px-4 text-base text-gray-900 h-full font-medium tracking-widest"
                          keyboardType="numeric"
                          maxLength={10}
                          placeholder="Enter Phone Number"
                          placeholderTextColor="#9ca3af"
                          onBlur={onBlur}
                          onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
                          value={value}
                          editable={!isLoading}
                          onFocus={(event) => {
                            event.currentTarget.measure((fx, fy, width, height, px, py) => {
                              scrollToInput(py);
                            });
                          }}
                        />
                      </View>
                    )}
                  />
                  {errors.phone && <Text className="text-red-500 text-xs mt-1 px-1">{errors.phone.message}</Text>}
                  {phoneValue?.length === 10 && !limitData.isBlocked && (
                    <View className="flex-row items-center mt-2 px-1">
                      <ShieldAlert size={14} color={limitData.phoneLeft === 0 ? "#ef4444" : "#6b7280"} />
                      <Text className={`text-xs ml-1 font-medium ${limitData.phoneLeft === 0 ? "text-red-500" : "text-gray-500"}`}>
                        {limitData.phoneLeft} attempts left for this number
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={handleSubmit(onPhoneSubmit)}
                  disabled={isLoading}
                  className="h-14 w-full bg-[#ef4444] items-center justify-center rounded-xl mt-6"
                >
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Continue</Text>}
                </TouchableOpacity>
              </View>

              <View style={styles.signupContainer}>
                <Text className="text-sm text-gray-500">Don't have an account? </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text className="text-[#ef4444] font-bold">Sign up free</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          ) : (
            <View className="space-y-6">
              <Text className="text-center text-gray-800 font-bold text-xl mb-1">
                Verify your number
              </Text>
              <Text className="text-center text-gray-500 text-sm mb-6">
                We have sent a verification code to{'\n'}
                <Text className="font-bold text-gray-700">+91 {phoneValue}</Text>
              </Text>

              <View className="flex-row justify-center space-x-2 sm:space-x-3 mb-6">
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    keyboardType="numeric"
                    maxLength={1}
                    value={digit}
                    onChangeText={(val) => handleOtpChange(index, val)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                    editable={!isLoading}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl bg-white text-gray-900 mx-1"
                    style={{ borderColor: digit ? '#ef4444' : '#e5e7eb' }}
                    onFocus={(event) => {
                      event.currentTarget.measure((fx, fy, width, height, px, py) => {
                        scrollToInput(py);
                      });
                    }}
                  />
                ))}
              </View>

              <View className="flex-row items-center justify-between mb-8 px-2">
                <Text className="text-sm text-gray-500">Didn't receive code?</Text>
                {canResend ? (
                  <TouchableOpacity onPress={() => onPhoneSubmit({ phone: phoneValue })} className="flex-row items-center">
                    <RefreshCw size={14} color="#ef4444" />
                    <Text className="text-[#ef4444] font-bold ml-1">Resend</Text>
                  </TouchableOpacity>
                ) : (
                  <Text className="text-gray-400 font-medium">Resend SMS in {timeLeft}s</Text>
                )}
              </View>

              <View className="flex-row space-x-3 pb-4">
                <TouchableOpacity
                  onPress={() => setStep('phone')}
                  disabled={isLoading}
                  className="h-14 w-1/3 rounded-xl border border-gray-200 items-center justify-center flex-row bg-gray-50 mr-2"
                >
                  <ArrowLeft size={18} color="#4b5563" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => verifyOtpLogic(otp.join(''))}
                  disabled={isLoading}
                  className="h-14 flex-1 bg-[#ef4444] items-center justify-center rounded-xl shadow-sm"
                >
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Verify & Login</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <Modal visible={showBlockPopup} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center">
            <View className="h-16 w-16 bg-red-100 rounded-full items-center justify-center mb-4">
              <AlertOctagon size={32} color="#dc2626" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">Security Lock Active</Text>
            <Text className="text-center text-gray-600 mb-4 leading-relaxed">
              {limitData.reason} To protect your account from spam, we've temporarily paused OTPs.
            </Text>
            <View className="bg-gray-50 border border-gray-200 w-full rounded-xl p-4 items-center mb-6">
              <Clock size={20} color="#9ca3af" />
              <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Try again at</Text>
              <Text className="text-lg font-bold text-gray-800 mt-1">{formatResetTime(limitData.resetTime)}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowBlockPopup(false)} className="w-full h-14 bg-gray-900 rounded-xl items-center justify-center">
              <Text className="text-white font-bold text-lg">I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: screenWidth * (4 / 3),
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  scrollContent: {
    flexGrow: 1,
  },
  phoneStepContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
});