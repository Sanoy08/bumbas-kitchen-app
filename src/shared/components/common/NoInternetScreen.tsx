import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NoInternetScreenProps {
  onRetry: () => Promise<boolean>;
}

export const NoInternetScreen = ({ onRetry }: NoInternetScreenProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const scale = SCREEN_WIDTH / 390;

  const handleRetry = async () => {
    setIsChecking(true);
    await onRetry();
    // Simulate a slight delay so the button shows a loading state briefly
    setTimeout(() => {
      setIsChecking(false);
    }, 1000);
  };

  return (
    <View className="flex-1 bg-rose-50">
      <View style={{ width: '100%', aspectRatio: 3/6 }}>
        <Image 
          source={require('../../../../assets/images/offline.avif')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', '#fff1f2']}
          style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 120 }}
        />
        <View style={{
          position: 'absolute',
          bottom: '11.02%', // Precisely maps to the previous 86px bottom on a standard phone
          left: 0,
          right: 0,
          alignItems: 'center',
        }}>
          <TouchableOpacity 
            onPress={handleRetry}
            disabled={isChecking}
            activeOpacity={0.7}
            style={{ 
              backgroundColor: '#e11d48', // Primary color
              width: '56.92%', 
              aspectRatio: 222 / 64, 
            }} 
            className={`rounded-2xl flex-row items-center justify-center ${isChecking ? 'opacity-80' : ''}`}
          >
            {isChecking ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <RefreshCw size={20 * scale} color="#ffffff" className="mr-3" />
                <Text style={{ fontSize: 20 * scale, color: '#ffffff', fontWeight: 'bold', fontFamily: 'sans-serif', letterSpacing: 0.5 }}>
                  Try Again
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
