import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, Keyboard, Modal } from 'react-native';
import { Mic } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

interface VoiceSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onResult: (transcript: string) => void;
}

export const VoiceSearchModal = ({ visible, onClose, onResult }: VoiceSearchModalProps) => {
  const [isListening, setIsListening] = useState(false);
  const [noSpeechError, setNoSpeechError] = useState(false);
  const [partialText, setPartialText] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse Animation for Mic (only when isListening true and no error)
  useEffect(() => {
    if (isListening && !noSpeechError) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      pulseAnim.stopAnimation();
    }
  }, [isListening, noSpeechError, pulseAnim]);

  // Start listening automatically when modal opens (if not already listening or in error state)
  useEffect(() => {
    if (visible && !isListening && !noSpeechError) {
      startListening();
    }
    if (!visible) {
      stopListening(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const startListening = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Keyboard.dismiss();
      setNoSpeechError(false);
      
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        toast.error("Microphone permission is required for voice search.");
        onClose();
        return;
      }

      setPartialText('');
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
      });
    } catch (e) {
      toast.error("Speech recognition is not supported on this device.");
      onClose();
    }
  };

  const stopListening = (silent = false) => {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
    setNoSpeechError(false);
    if (!silent) onClose();
  };

  // Speech Events
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setNoSpeechError(false);
  });

  useSpeechRecognitionEvent('end', () => {
    // Only hide the listening state if we are not showing a no-speech error
    if (!noSpeechError) {
      setIsListening(false);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('Speech error:', event.error);
    if (event.error === 'no-speech') {
      setNoSpeechError(true);
      setIsListening(false);
      setPartialText('');
    } else {
      setIsListening(false);
      setNoSpeechError(false);
      if (event.error !== 'aborted') {
        toast.error("Didn't catch that. Try again.");
      }
      onClose();
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript || '';
    setPartialText(transcript);

    if (event.isFinal) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Delay closing and searching so the user can read the full text
      setTimeout(() => {
        setIsListening(false);
        setNoSpeechError(false);
        onClose();
        onResult(transcript);
      }, 1500); // 1.5 second delay
    }
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-white rounded-t-[32px] p-8 items-center pb-12 shadow-lg">
          {noSpeechError ? (
            <>
              <Text className="text-xl font-bold text-gray-900 mb-4 font-sans">
                Didn't catch that
              </Text>
              <Text className="text-base text-gray-500 mb-8 font-sans text-center px-4">
                We didn't hear anything. Please try again.
              </Text>

              <TouchableOpacity
                onPress={startListening}
                className="h-20 w-20 bg-primary rounded-full items-center justify-center shadow-lg mb-6"
                style={{
                  elevation: 10,
                  shadowColor: '#e11d48',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                }}
              >
                <Mic size={36} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => stopListening(false)}
                className="mt-2 px-8 py-3 bg-gray-100 rounded-full"
              >
                <Text className="text-gray-600 font-bold font-sans">Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-xl font-bold text-gray-900 mb-8 font-sans">
                Listening...
              </Text>

              <View className="items-center justify-center h-32 w-32 mb-6">
                <Animated.View
                  style={{
                    position: 'absolute',
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: 'rgba(225, 29, 72, 0.2)',
                    transform: [{ scale: pulseAnim }],
                  }}
                />
                <TouchableOpacity
                  onPress={() => stopListening(false)}
                  className="h-20 w-20 bg-primary rounded-full items-center justify-center shadow-lg"
                  style={{
                    elevation: 10,
                    shadowColor: '#e11d48',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                  }}
                >
                  <Mic size={36} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <Text className="text-base text-gray-600 font-sans text-center px-4 h-12">
                {partialText ? `"${partialText}"` : "Speak now to search for your favorite dishes"}
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};
