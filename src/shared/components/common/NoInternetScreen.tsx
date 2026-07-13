import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NoInternetScreenProps {
  onRetry: () => Promise<boolean>;
}

export const NoInternetScreen = ({ onRetry }: NoInternetScreenProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const insets = useSafeAreaInsets();

  const handleRetry = async () => {
    setIsChecking(true);
    await onRetry();
    // Simulate a slight delay so the button shows a loading state briefly
    setTimeout(() => {
      setIsChecking(false);
    }, 1000);
  };

  return (
    <View className="flex-1 bg-black">
      <Image 
        source={require('../../../../assets/images/offline_fullscreen.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      <View style={{ position: 'absolute', bottom: Math.max(insets.bottom + 40, 40), left: 0, right: 0, alignItems: 'center' }}>
        <TouchableOpacity 
          onPress={handleRetry}
          disabled={isChecking}
          activeOpacity={0.8}
          style={{ elevation: 10, shadowColor: '#e11d48', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15 }}
          className={`bg-primary px-10 h-16 rounded-full flex-row items-center justify-center ${isChecking ? 'opacity-80' : ''}`}
        >
          {isChecking ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <RefreshCw size={22} color="white" className="mr-3" />
              <Text className="text-white font-bold text-xl font-sans tracking-wide">
                Try Again
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
