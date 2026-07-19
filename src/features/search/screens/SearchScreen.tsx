// src/app/(shop)/search.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock, Mic, Search as SearchIcon, Trash2, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import LottieView from 'lottie-react-native';

import { VoiceSearchModal } from '@/shared/components/search/VoiceSearchModal';
import { ProductCard } from '@/shared/components/shop/ProductCard';

const { width: windowWidth } = Dimensions.get('window');
const CONTAINER_PADDING = 16;
const CARD_MARGIN = 4;
const CARD_WIDTH = (windowWidth - CONTAINER_PADDING * 2 - CARD_MARGIN * 4) / 2;

// Lightweight fuzzy matching using Levenshtein distance
const fuzzyMatch = (query: string, target: string) => {
  const q = query.toLowerCase().trim();
  const t = (target || '').toLowerCase().trim();
  if (t.includes(q)) return true;

  const getDistance = (a: string, b: string) => {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const qWords = q.split(/\s+/);
  const tWords = t.split(/\s+/);

  return qWords.every(qWord => {
    return tWords.some(tWord => {
      if (tWord.includes(qWord)) return true;
      const dist = getDistance(qWord, tWord);
      const allowedTypos = qWord.length <= 4 ? 1 : 2;
      return dist <= allowedTypos;
    });
  });
};

export function SearchScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- Voice Search States ---
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);

  const keyboardOffsetAnim = useRef(new Animated.Value(0)).current;

  // --- Keyboard Animation ---
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardOffsetAnim, {
        toValue: -120, // Slide up by 120px when keyboard is visible
        duration: e.duration || 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardOffsetAnim, {
        toValue: 0,
        duration: e.duration || 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ১. প্রোডাক্ট এবং রিসেন্ট সার্চ লোড করা
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const cachedData = await AsyncStorage.getItem('bumbas_home_data');
        const homeDataStr = cachedData;
        if (!homeDataStr) return;
        const homeData = JSON.parse(homeDataStr);
        setAllProducts(homeData.allProducts || []);

        const recent = await AsyncStorage.getItem('recent_searches');
        if (recent) setRecentSearches(JSON.parse(recent));

        // Auto-search if voiceQuery is passed
        if (searchParams.voiceQuery) {
          const q = searchParams.voiceQuery as string;
          setSearchQuery(q);
          handleSearchSubmit(q, homeData.allProducts || []);
        } else {
          // Focus input if no voice query
          setTimeout(() => inputRef.current?.focus(), 400);
        }
      } catch (error) {
        console.error('Error loading search data', error);
      }
    };
    loadInitialData();
  }, []);

  // ২. লাইভ সার্চ ফিল্টারিং (Fuzzy Search)
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      const query = searchQuery.trim().toLowerCase();

      const scoredResults = allProducts.map(product => {
        const name = (product.name || '').toLowerCase();
        const catName = (product.category?.name || '').toLowerCase();

        let score = 0;

        // Exact matches
        if (name === query) score = 100;
        else if (name.startsWith(query)) score = 80;
        else if (name.includes(query)) score = 50;
        else if (catName === query) score = 40;
        else if (catName.includes(query)) score = 30;
        // Fuzzy matches
        else if (fuzzyMatch(query, name)) score = 20;
        else if (fuzzyMatch(query, catName)) score = 10;

        return { product, score };
      }).filter(item => item.score > 0);

      // Sort by score descending
      scoredResults.sort((a, b) => b.score - a.score);

      setSearchResults(scoredResults.map(item => item.product));
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, allProducts]);

  // ৩. সার্চ সাবমিট এবং হিস্ট্রি সেভ
  const handleSearchSubmit = async (queryToSave: string = searchQuery, products = allProducts) => {
    const query = queryToSave.trim();
    if (!query) return;

    Keyboard.dismiss();

    // Save to recent searches (max 10)
    let newRecents = [query, ...recentSearches.filter((q) => q !== query)].slice(0, 10);
    setRecentSearches(newRecents);
    await AsyncStorage.setItem('recent_searches', JSON.stringify(newRecents));
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem('recent_searches');
    toast.success('Search history cleared');
  };

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
            className="flex-1 ml-2.5 text-base text-gray-900 font-sans"
            style={{
              paddingVertical: 0,
              marginVertical: 0,
              includeFontPadding: false,
              textAlignVertical: 'center',
              lineHeight: 20,
            }}
            placeholder="Search for biryani, fish, veg..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearchSubmit()}
            returnKeyType="search"
            autoFocus={false}
          />

          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setIsSearching(false);
              }}
              className="p-1"
            >
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsVoiceModalVisible(true)}
              className="w-12 h-12 items-center justify-center"
            >
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
              {['Chicken Thali', 'Mutton Kosha', 'Paneer', 'Fish Curry', 'Biryani'].map(
                (item, index) => (
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
                )
              )}
            </View>
          </View>
        </ScrollView>
      ) : (
        /* Search Results */
        <View className="flex-1 bg-gray-50/50">
          {searchResults.length === 0 ? (
            <Animated.View
              className="flex-1 items-center justify-center px-4"
              style={{
                marginTop: -80,
                transform: [{ translateY: keyboardOffsetAnim }]
              }}
            >
              <LottieView
                source={require('../../../../assets/animations/Empty-woman.json')}
                autoPlay
                loop
                style={{ width: 350, height: 350, marginBottom: 10 }}
              />
              <Text className="text-2xl font-bold text-gray-900 mb-2 font-sans text-center">
                No results found
              </Text>
            </Animated.View>
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
      <VoiceSearchModal
        visible={isVoiceModalVisible}
        onClose={() => setIsVoiceModalVisible(false)}
        onResult={(transcript) => {
          setSearchQuery(transcript);
          handleSearchSubmit(transcript, allProducts);
        }}
      />
    </View>
  );
}