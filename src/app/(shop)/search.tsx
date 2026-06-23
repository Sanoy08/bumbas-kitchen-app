// src/app/(shop)/search.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Keyboard, Dimensions, Modal, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search as SearchIcon, Mic, X, Clock, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from 'sonner-native';
import * as Haptics from 'expo-haptics';

// ★ expo-speech-recognition ইমপোর্ট
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { ProductCard } from '@/components/shop/ProductCard';

const { width: windowWidth } = Dimensions.get('window');
const CONTAINER_PADDING = 16;
const CARD_MARGIN = 4;
const CARD_WIDTH = (windowWidth - CONTAINER_PADDING * 2 - CARD_MARGIN * 4) / 2;

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- Voice Search States ---
  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ১. প্রোডাক্ট এবং রিসেন্ট সার্চ লোড করা
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const cachedData = await AsyncStorage.getItem('bumbas_home_data');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setAllProducts(parsedData.allProducts || []);
        }

        const recent = await AsyncStorage.getItem('recent_searches');
        if (recent) setRecentSearches(JSON.parse(recent));

      } catch (error) {
        console.error('Error loading search data', error);
      }
    };
    loadInitialData();
  }, []);

  // ২. লাইভ সার্চ ফিল্টারিং
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      const query = searchQuery.toLowerCase().trim();
      const results = allProducts.filter((product) => 
        product.name.toLowerCase().includes(query) || 
        product.category?.name?.toLowerCase().includes(query)
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, allProducts]);

  // ৩. সার্চ সাবমিট এবং হিস্ট্রি সেভ
  const handleSearchSubmit = async (queryToSave: string = searchQuery) => {
    const query = queryToSave.trim();
    if (!query) return;

    Keyboard.dismiss();
    
    // Save to recent searches (max 10)
    let newRecents = [query, ...recentSearches.filter(q => q !== query)].slice(0, 10);
    setRecentSearches(newRecents);
    await AsyncStorage.setItem('recent_searches', JSON.stringify(newRecents));
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem('recent_searches');
    toast.success('Search history cleared');
  };

  // --- ★ VOICE SEARCH LOGIC ★ ---
  
  // Pulse Animation for Mic
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      Animated.timing(pulseAnim).stop();
    }
  }, [isListening]);

  const startListening = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // পারমিশন চেক করা
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        toast.error("Microphone permission is required for voice search.");
        return;
      }

      setPartialText('');
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US', // অথবা 'en-IN' / 'bn-IN' ব্যবহার করতে পারেন
        interimResults: true,
      });
    } catch (e) {
      toast.error("Speech recognition is not supported on this device.");
    }
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
  };

  // Speech Events
  useSpeechRecognitionEvent('start', () => setIsListening(true));
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    console.log('Speech error:', event.error);
    if (event.error !== 'no-speech') {
      toast.error("Didn't catch that. Try again.");
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript || '';
    setPartialText(transcript);
    
    // যদি ফাইনাল রেজাল্ট হয় (ইউজার কথা বলা থামালে)
    if (event.isFinal) {
      setSearchQuery(transcript);
      setIsListening(false);
      handleSearchSubmit(transcript);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });


  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      
      {/* Search Header */}
      <View className="flex-row items-center px-4 py-2 bg-white border-b border-gray-100 z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-3 h-12 border border-gray-200 focus:border-primary/50">
          <SearchIcon size={20} color="#9ca3af" />
          <TextInput
            ref={inputRef}
            className="flex-1 ml-2.5 text-base text-gray-900 font-sans h-full"
            placeholder="Search for biryani, fish, veg..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearchSubmit()}
            returnKeyType="search"
            autoFocus={true} 
          />
          
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => {setSearchQuery(''); setIsSearching(false);}} className="p-1">
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={startListening} className="border-l border-gray-300 pl-3 ml-1 py-1">
              <Mic size={20} color="#e11d48" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content */}
      {!isSearching ? (
        <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">
          
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-sm font-bold text-gray-900 font-sans">Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches} className="flex-row items-center">
                  <Trash2 size={14} color="#ef4444" />
                  <Text className="text-xs text-red-500 font-bold ml-1 font-sans">Clear All</Text>
                </TouchableOpacity>
              </View>
              
              <View className="flex-row flex-wrap gap-2.5">
                {recentSearches.map((item, index) => (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => {
                      setSearchQuery(item);
                      handleSearchSubmit(item);
                    }}
                    className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"
                  >
                    <Clock size={14} color="#6b7280" />
                    <Text className="ml-1.5 text-sm text-gray-700 font-sans">{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quick Suggestions */}
          <View>
            <Text className="text-sm font-bold text-gray-900 font-sans mb-4">Popular Categories</Text>
            <View className="flex-row flex-wrap gap-2.5">
              {['Chicken Thali', 'Mutton Kosha', 'Paneer', 'Fish Curry', 'Biryani'].map((item, index) => (
                <TouchableOpacity 
                  key={index}
                  onPress={() => {
                    setSearchQuery(item);
                    handleSearchSubmit(item);
                  }}
                  className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2"
                >
                  <Text className="text-sm text-primary font-bold font-sans">{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        /* Search Results */
        <View className="flex-1 bg-gray-50/50">
          {searchResults.length === 0 ? (
            <View className="flex-1 items-center pt-20 px-4">
              <View className="h-20 w-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <SearchIcon size={32} color="#9ca3af" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2 font-sans">No results found</Text>
              <Text className="text-center text-gray-500 font-sans">
                We couldn't find anything matching "{searchQuery}". Try searching for something else.
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id || item._id}
              numColumns={2}
              contentContainerStyle={{ padding: CONTAINER_PADDING, paddingBottom: 100 }}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={{ width: CARD_WIDTH, height: 250, marginBottom: CARD_MARGIN * 4 }}>
                  <ProductCard product={item} />
                </View>
              )}
              ListHeaderComponent={
                <Text className="text-sm text-gray-500 font-bold mb-4 font-sans px-1">
                  Found {searchResults.length} results for "{searchQuery}"
                </Text>
              }
            />
          )}
        </View>
      )}

      {/* ★ Voice Recording Modal ★ */}
      <Modal visible={isListening} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[32px] p-8 items-center pb-12 shadow-lg">
            <Text className="text-xl font-bold text-gray-900 mb-8 font-sans">
              Listening...
            </Text>

            {/* Animated Pulsing Mic */}
            <View className="items-center justify-center h-32 w-32 mb-6">
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: 'rgba(225, 29, 72, 0.2)', // Primary color opacity
                  transform: [{ scale: pulseAnim }],
                }}
              />
              <TouchableOpacity
                onPress={stopListening}
                className="h-20 w-20 bg-primary rounded-full items-center justify-center shadow-lg"
                style={{ elevation: 10, shadowColor: '#e11d48', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }}
              >
                <Mic size={36} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text className="text-base text-gray-600 font-sans text-center px-4 h-12">
              {partialText ? `"${partialText}"` : "Speak now to search for your favorite dishes"}
            </Text>

            <TouchableOpacity onPress={stopListening} className="mt-6 px-8 py-3 bg-gray-100 rounded-full">
               <Text className="text-gray-600 font-bold font-sans">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}