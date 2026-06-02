import { useAuthStore } from '@/store/authStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { AlertOctagon, ArrowLeft, ArrowRight, Clock, LockKeyhole, Phone, RefreshCw, ShieldAlert } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as z from 'zod';

// Zod Schema
const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian Mobile Number'),
});

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

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
  useEffect(() => { if (phoneValue.length === 10) fetchLimit(phoneValue); }, [phoneValue]);

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
        Alert.alert('Success', 'Welcome back!');
        
        if (data.user.role === 'admin') {
          // নেটিভ অ্যাপে অ্যাডমিন ড্যাশবোর্ড থাকলে সেখানে রাউট করুন
          router.replace('/admin');
        } else {
          router.replace('/'); // হোম স্ক্রিন
        }
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="w-full max-w-sm mx-auto space-y-8">
          
          <View className="items-center mb-4">
            <View className="h-24 w-24 bg-primary/10 rounded-full items-center justify-center relative">
              <LockKeyhole size={40} color="#e11d48" />
            </View>
          </View>

          <View className="space-y-2 mb-6 items-center">
            <Text className="text-3xl font-bold text-gray-900">
              Welcome <Text className="text-primary">Back</Text>
            </Text>
            <Text className="text-base text-gray-500 text-center mt-2">
              {step === 'phone' ? 'Sign in with your phone number' : `Enter code sent to +91 ${phoneValue}`}
            </Text>
          </View>

          {step === 'phone' ? (
            <View className="space-y-5">
              <View className="space-y-2">
                <Text className="text-sm font-medium text-gray-900 mb-2">Phone Number</Text>
                <View className="relative justify-center">
                  <View className="absolute left-3 z-10">
                    <Phone size={18} color="#9ca3af" />
                  </View>
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className={`h-12 border ${errors.phone ? 'border-red-500' : 'border-gray-200'} bg-white pl-10 pr-4 text-base rounded-xl`}
                        keyboardType="numeric"
                        maxLength={10}
                        placeholder="9876543210"
                        onBlur={onBlur}
                        onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
                        value={value}
                        editable={!isLoading}
                      />
                    )}
                  />
                </View>
                {errors.phone && <Text className="text-red-500 text-xs mt-1">{errors.phone.message}</Text>}
                
                {phoneValue.length === 10 && !limitData.isBlocked && (
                  <View className="flex-row items-center mt-2">
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
                className="h-12 w-full bg-primary items-center justify-center rounded-xl flex-row shadow-sm mt-4"
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text className="text-white font-medium text-base mr-2">Get OTP</Text>
                    <ArrowRight size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-6">
              <View className="flex-row justify-center space-x-2 sm:space-x-3 mb-4">
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
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl bg-white text-gray-900 mx-1"
                    style={{ borderColor: digit ? '#e11d48' : '#e5e7eb' }}
                  />
                ))}
              </View>

              <View className="flex-row items-center justify-between mb-6 px-2">
                <Text className="text-sm text-gray-500">Didn't receive code?</Text>
                {canResend ? (
                  <TouchableOpacity onPress={() => onPhoneSubmit({ phone: phoneValue })} className="flex-row items-center">
                    <RefreshCw size={14} color="#e11d48" />
                    <Text className="text-primary font-medium ml-1">Resend</Text>
                  </TouchableOpacity>
                ) : (
                  <Text className="text-gray-400 font-medium">Resend in 00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</Text>
                )}
              </View>

              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={() => setStep('phone')}
                  disabled={isLoading}
                  className="h-12 w-1/3 rounded-xl border border-gray-200 items-center justify-center flex-row bg-gray-50 mr-2"
                >
                  <ArrowLeft size={16} color="#4b5563" />
                  <Text className="text-gray-600 ml-1 font-medium">Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => verifyOtpLogic(otp.join(''))}
                  disabled={isLoading}
                  className="h-12 flex-1 bg-primary items-center justify-center rounded-xl shadow-sm"
                >
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-medium text-base">Verify & Login</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View className="mt-8 items-center flex-row justify-center">
            <Text className="text-sm text-gray-500">Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text className="text-primary font-semibold">Sign up free</Text>
              </TouchableOpacity>
            </Link>
          </View>

        </View>
      </ScrollView>

      {/* Block Popup Modal */}
      <Modal visible={showBlockPopup} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm items-center">
            <View className="h-16 w-16 bg-red-100 rounded-full items-center justify-center mb-4">
              <AlertOctagon size={32} color="#dc2626" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">Security Lock Active</Text>
            <Text className="text-center text-gray-600 mb-4 leading-relaxed">
              {limitData.reason} To protect your account from spam, we've temporarily paused OTPs.
            </Text>
            <View className="bg-gray-50 border border-gray-200 w-full rounded-xl p-4 items-center mb-6">
              <Clock size={20} color="#9ca3af" className="mb-1" />
              <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Try again at</Text>
              <Text className="text-lg font-bold text-gray-800 mt-1">{formatResetTime(limitData.resetTime)}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowBlockPopup(false)} className="w-full h-12 bg-gray-900 rounded-xl items-center justify-center">
              <Text className="text-white font-medium text-base">I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}