// src/app/(shop)/account/addresses/index.tsx

import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Briefcase, ChevronLeft, Home, LocateFixed, MapPin, Pencil, Plus, Search, Trash2, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Dimensions, Easing, KeyboardAvoidingView, Linking, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

import * as Crypto from 'expo-crypto';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import { useAlert } from '@/shared/components/ui';
import { useAuthStore } from '@/shared/store/authStore';
import { useTabBarStore } from '@/shared/store/tabBarStore';
import { cleanAddress, formatPrice } from '@/shared/utils/utils';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';
const PRESET_LABELS = ["Home", "Work", "Office", "Other"];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

type Address = {
  id?: string;
  _id?: string;
  name: string;
  address: string;
  isDefault: boolean;
  coordinates?: { lat: number; lng: number } | null;
  distanceText?: string;
  deliveryFee?: number;
};

export function AddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isInitialized, updateUser } = useAuthStore();
  const setTabBarVisible = useTabBarStore((state) => state.setVisibility);
  const { showAlert } = useAlert();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const searchSlideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const handleBackPress = () => {
      if (isSearchModalOpen) {
        setIsSearchModalOpen(false);
        return true;
      }
      if (isDialogOpen) {
        closeDialog();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [isSearchModalOpen, isDialogOpen]);

  useEffect(() => {
    Animated.timing(searchSlideAnim, {
      toValue: isSearchModalOpen ? 0 : Dimensions.get('window').width,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (isSearchModalOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 350);
    } else {
      searchInputRef.current?.blur();
    }
  }, [isSearchModalOpen]);

  useEffect(() => {
    if (isDialogOpen) {
      setTabBarVisible(false);
      slideAnim.setValue(Dimensions.get('window').width);
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 22,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [isDialogOpen]);

  const closeDialog = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setIsDialogOpen(false);
      setTabBarVisible(true);
    });
  };

  // Handle hardware back button on Android
  useEffect(() => {
    const onBackPress = () => {
      if (isDialogOpen) {
        closeDialog();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isDialogOpen]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [isPanning, setIsPanning] = useState(false);
  // Prevents onRegionDidChange from calling handleLocationSelect during programmatic camera moves
  const isProgrammaticMove = useRef(false);
  const touchCount = useRef(0);
  const [mapScrollEnabled, setMapScrollEnabled] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    isDefault: false,
    coordinates: null as { lat: number, lng: number } | null,
    distanceText: '',
    deliveryFee: 0
  });

  const [isSaving, setIsSaving] = useState(false);
  const [outOfRange, setOutOfRange] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isZoomedOut, setIsZoomedOut] = useState(false);
  const [modalScrollEnabled, setModalScrollEnabled] = useState(true);
  const [hasLocationError, setHasLocationError] = useState(false);

  // Shimmer and sliding animation
  const showBottomSection = !isPanning && !isReverseGeocoding;
  const bottomSlideAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(bottomSlideAnim, {
      toValue: showBottomSection ? 1 : 0,
      duration: 350,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();
  }, [showBottomSection]);

  const showShimmer = (isPanning || isReverseGeocoding || !formData.address) && !hasLocationError;

  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (showShimmer) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      shimmerAnim.stopAnimation();
      shimmerAnim.setValue(0);
    }
  }, [showShimmer]);
  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [sessionToken, setSessionToken] = useState(() => Crypto.randomUUID());

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/(auth)/login');
      return;
    }
    if (isInitialized && user?.id) {
      fetchAddresses();
    }
  }, [isInitialized, user?.id]);

  useEffect(() => {
    let isMounted = true;
    if (isDialogOpen) {
      if (!formData.coordinates && !editingId) {
        // Fetch location BEFORE showing the map to prevent panning jumps
        (async () => {
          setIsFetchingLocation(true);
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              let loc = await Location.getLastKnownPositionAsync({});
              if (!loc) {
                loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              }
              if (loc && isMounted) {
                setFormData(prev => ({ ...prev, coordinates: { lat: loc.coords.latitude, lng: loc.coords.longitude } }));
              }
            }
          } catch (error) {
            console.log('Location error:', error);
          } finally {
            if (isMounted) {
              setIsFetchingLocation(false);
              // Small delay to ensure state updates before mounting map
              setTimeout(() => { if (isMounted) setIsMapReady(true); }, 50);
            }
          }
        })();
      } else {
        const timer = setTimeout(() => { if (isMounted) setIsMapReady(true); }, 200);
        return () => clearTimeout(timer);
      }
    } else {
      setIsMapReady(false);
      setIsFetchingLocation(false);
    }

    return () => { isMounted = false; };
  }, [isDialogOpen]);

  // Move camera programmatically
  // If updateAddress is true, it triggers the pan→update loop (useful when jumping to live location)
  const moveCameraTo = (lat: number, lng: number, zoom = 17, updateAddress = false) => {
    if (!updateAddress) isProgrammaticMove.current = true;
    mapRef.current?.animateCamera({
      center: { latitude: lat, longitude: lng },
      zoom: zoom,
    }, { duration: 600 });

    if (!updateAddress) {
      setTimeout(() => { isProgrammaticMove.current = false; }, 800);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await fetch(`${API_URL}/user/addresses`);
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      if (data.success) {
        setAddresses(data.addresses);
        updateUser({ savedAddresses: data.addresses });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchLocations = async () => {
      if (!debouncedSearch || debouncedSearch.length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        const queryWithState = debouncedSearch.toLowerCase().includes('west bengal')
          ? debouncedSearch
          : `${debouncedSearch} West Bengal`;

        const res = await fetch(`${API_URL}/location/search?q=${queryWithState}&sessionToken=${sessionToken}`);
        if (!res.ok) throw new Error('API failed');
        const data = await res.json();

        // Strict frontend filter to ensure only West Bengal results
        const wbSuggestions = data.suggestions?.filter((item: any) => {
          const desc = item.description.toLowerCase();
          return desc.includes('west bengal') || desc.includes(', wb');
        }) || [];

        setSuggestions(wbSuggestions);
        setShowSuggestions(true);
      } catch (e) { }
    };
    fetchLocations();
  }, [debouncedSearch]);

  const handleSuggestionSelect = async (placeId: string, description: string) => {
    try {
      setSearchQuery('');
      setShowSuggestions(false);
      setIsFetchingLocation(true);

      const res = await fetch(`${API_URL}/location/details?place_id=${placeId}&sessionToken=${sessionToken}`);

      // Reset session token for the next search
      setSessionToken(Crypto.randomUUID());
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();

      if (data.success && data.location) {
        // Drop the pin and move camera
        moveCameraTo(data.location.lat, data.location.lng);
        handleLocationSelect(data.location.lat, data.location.lng, description);
      }
    } catch (e) {
      toast.error('Could not fetch place details');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleLocationSelect = async (lat: number, lng: number, addressStr?: string) => {
    try {
      setOutOfRange(false);
      setHasLocationError(false);
      setIsReverseGeocoding(true);

      if (!addressStr) {
        const revRes = await fetch(`${API_URL}/location/reverse?lat=${lat}&lon=${lng}`);
        if (!revRes.ok) throw new Error('API failed');
        const revData = await revRes.json();
        addressStr = revData.address;
      }

      const res = await fetch(`${API_URL}/location/distance?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();

      if (data.success) {
        const distKm = data.distanceValue / 1000;
        let fee = 0;

        if (distKm > 10) {
          setOutOfRange(true);
          setFormData(prev => ({ ...prev, coordinates: { lat, lng }, address: addressStr as string, distanceText: data.distanceText, deliveryFee: 0 }));
          return;
        }

        if (distKm > 2) {
          const extraKm = Math.ceil(distKm - 2);
          fee = 50 + (extraKm * 10);
        }

        setFormData(prev => ({ ...prev, coordinates: { lat, lng }, address: addressStr as string, distanceText: data.distanceText, deliveryFee: fee }));
      }
    } catch (e) {
      console.log("Error calculating distance:", e);
      setHasLocationError(true);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleSelectSearchItem = (item: any) => {
    setSearchQuery(item.main_text);
    setShowSuggestions(false);

    const lat = Number(item.lat);
    const lon = Number(item.lon);

    if (!isNaN(lat) && !isNaN(lon)) {
      handleLocationSelect(lat, lon, item.description);
      // Move camera to the searched location without triggering the pan loop
      moveCameraTo(lat, lon);
    }
  };

  const handleOpenDialog = (address?: Address) => {
    const id = address?.id || address?._id;
    if (address && id) {
      setEditingId(id);
      setFormData({
        name: address.name, address: address.address, isDefault: address.isDefault,
        coordinates: address.coordinates || null, distanceText: address.distanceText || '', deliveryFee: address.deliveryFee || 0
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', address: '', isDefault: addresses.length === 0, coordinates: null, distanceText: '', deliveryFee: 0 });
    }
    setSearchQuery("");
    setOutOfRange(false);
    setIsReverseGeocoding(true); // Prevent down-blink on open
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address || !formData.coordinates) {
      toast.error("Label is required");
      return;
    }
    if (outOfRange) {
      showAlert({
        title: "Out of Delivery Area",
        message: "Sorry, we currently do not deliver to this location as it is outside our 50km radius.",
        confirmText: "Understood"
      });
      return;
    }

    setIsSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...formData, id: editingId } : formData;

      const res = await fetch(`${API_URL}/user/addresses`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast.success(editingId ? "Address updated!" : "Address saved!");
        closeDialog();
        fetchAddresses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save address");
      }
    } catch (error) {
      toast.error("Error saving address");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmSetDefault = (addr: any) => {
    if (addr.isDefault) return;
    showAlert({
      title: "Set as Default?",
      message: `Do you want to set "${addr.name}" as your default delivery address?`,
      confirmText: "Set Default",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const body = { ...addr, id: addr.id || addr._id, isDefault: true };
          const res = await fetch(`${API_URL}/user/addresses`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (res.ok) {
            toast.success("Default address updated!");
            fetchAddresses();
          } else {
            toast.error("Failed to update");
          }
        } catch (error) {
          toast.error("Network error");
        }
      }
    });
  };

  const confirmDelete = (id: string) => {
    showAlert({
      title: "Delete Address?",
      message: "Are you sure you want to delete this address?",
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmButtonStyle: "destructive",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/user/addresses?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success("Address deleted");
            fetchAddresses();
          } else {
            toast.error("Failed to delete");
          }
        } catch (error) {
          toast.error("Network error");
        }
      }
    });
  };

  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('home')) return <Home size={20} color="#e11d48" />;
    if (n.includes('work') || n.includes('office')) return <Briefcase size={20} color="#e11d48" />;
    return <MapPin size={20} color="#e11d48" />;
  };

  const defaultLat = formData.coordinates?.lat || 22.717958;
  const defaultLng = formData.coordinates?.lng || 88.260207;

  // When map finishes panning, grab the center and set that as pin location
  const regionChangeTimer = useRef<NodeJS.Timeout | null>(null);

  const onRegionDidChange = async (region: any) => {
    setIsPanning(false);

    // Ignore region changes if we are programmatically moving the map
    if (isProgrammaticMove.current) return;

    // Start shimmer immediately during the debounce gap to prevent flashing
    setIsReverseGeocoding(true);

    if (regionChangeTimer.current) clearTimeout(regionChangeTimer.current);
    regionChangeTimer.current = setTimeout(() => {
      try {
        if (region) {
          // Check if zoomed out (latitudeDelta > 0.008 is roughly zoom level 16/17)
          if (region.latitudeDelta > 0.008) {
            setIsZoomedOut(true);
          } else {
            setIsZoomedOut(false);
          }
          handleLocationSelect(region.latitude, region.longitude);
        } else {
          setIsReverseGeocoding(false);
        }
      } catch (e) {
        console.log('Region change error:', e);
        setIsReverseGeocoding(false);
      }
    }, 600);
  };

  // Tap on a spot to jump camera there (onRegionDidChange will then update address)
  const onMapPress = (e: any) => {
    try {
      const { coordinate } = e.nativeEvent;
      if (coordinate) {
        // Don't set isProgrammaticMove — we WANT onRegionDidChange to fire after this
        mapRef.current?.animateCamera({ center: coordinate, zoom: 17 }, { duration: 300 });
      }
    } catch (e) {
      console.log('Map press error:', e);
    }
  };

  // Relocate pin to live GPS position with max accuracy
  const [isRelocating, setIsRelocating] = useState(false);
  const relocateToMyLocation = async () => {
    setIsRelocating(true);
    setIsFetchingLocation(true);
    setIsReverseGeocoding(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          maximumAge: 0,
        });
        moveCameraTo(loc.coords.latitude, loc.coords.longitude, 18, true);
      } else {
        showAlert({
          title: "Location Permission Required",
          message: "Please enable location services in your device settings to auto-detect your address.",
          confirmText: "Settings",
          onConfirm: () => Linking.openSettings()
        });
      }
    } catch (e) {
      toast.error('Could not get location');
    } finally {
      setIsRelocating(false);
      setIsFetchingLocation(false);
    }
  };

  useEffect(() => {
    // When map is loaded, we can fetch locations if we needed, etc.
  }, [isMapReady]);

  if (isLoading || !isInitialized) {
    return <View className="flex-1 justify-center items-center bg-gray-50"><ActivityIndicator size="large" color="#e11d48" /></View>;
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-1 bg-gray-50">
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>
          <Text className="text-2xl font-bold text-gray-900 font-sans mb-1">My Addresses</Text>
          <Text className="text-sm text-gray-500 font-medium font-sans mb-6">Manage delivery locations & check delivery fees.</Text>

          {addresses.length === 0 ? (
            <View className="items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
              <MapPin size={48} color="#d1d5db" className="mb-4" />
              <Text className="text-gray-500 font-medium font-sans">No saved addresses found.</Text>
              <TouchableOpacity onPress={() => handleOpenDialog()} className="mt-4">
                <Text className="text-primary font-bold font-sans">Add your first address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-y-4">
              {addresses.map(addr => {
                const addrId = addr.id || addr._id;
                return (
                  <TouchableOpacity
                    key={addrId}
                    activeOpacity={0.9}
                    onLongPress={() => confirmSetDefault(addr)}
                    className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm"
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-row flex-1 mr-4">
                        <View className="h-12 w-12 rounded-2xl bg-primary/10 items-center justify-center mr-4 mt-1">
                          {getIcon(addr.name)}
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                            <Text className="font-bold text-lg text-gray-900 font-sans">{addr.name}</Text>
                            {addr.isDefault && (
                              <View className="bg-green-100 px-2 py-0.5 rounded border border-green-200">
                                <Text className="text-[10px] font-bold text-green-700 uppercase font-sans">Default</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-sm text-gray-500 font-medium leading-5 font-sans mb-3">{cleanAddress(addr.address)}</Text>

                          <View className="flex-row items-center gap-2 flex-wrap">
                            {addr.distanceText && (
                              <View className="bg-gray-100 px-2 py-1 rounded-md">
                                <Text className="text-xs font-semibold text-gray-600 font-sans">{addr.distanceText}</Text>
                              </View>
                            )}
                            <View className={`px-2 py-1 rounded-md ${addr.deliveryFee === 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
                              <Text className={`text-xs font-bold font-sans ${addr.deliveryFee === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                {addr.deliveryFee === 0 ? 'Free Delivery' : `Delivery: ${formatPrice(addr.deliveryFee || 0)}`}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View className="flex-col gap-2">
                        <TouchableOpacity onPress={() => handleOpenDialog(addr)} className="p-2.5 bg-gray-50 rounded-xl">
                          <Pencil size={18} color="#4b5563" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => addrId && confirmDelete(addrId)} className="p-2.5 bg-red-50 rounded-xl">
                          <Trash2 size={18} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View className="absolute bottom-6 right-6">
          <TouchableOpacity
            onPress={() => {
              if (addresses.length >= 4) {
                showAlert({
                  title: "Maximum Limit Reached",
                  message: "You can only save up to 4 addresses. Please delete an existing one to add more.",
                  confirmText: "Okay"
                });
              } else {
                handleOpenDialog();
              }
            }}
            activeOpacity={0.8}
            className="h-16 w-16 bg-primary rounded-full items-center justify-center shadow-lg"
            style={{
              position: 'absolute',
              bottom: 80,
              right: 24,
              shadowColor: '#e11d48',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: addresses.length >= 4 ? 0.2 : 0.4,
              shadowRadius: 8,
              elevation: 8,
              opacity: addresses.length >= 4 ? 0.7 : 1
            }}
          >
            <Plus size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* --- ADD / EDIT PAGE (Sliding Screen) --- */}
        <Animated.View
          pointerEvents={isDialogOpen ? 'auto' : 'none'}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
            transform: [{ translateX: slideAnim }],
            backgroundColor: '#f9fafb',
            zIndex: 100
          }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

            {/* ── STICKY MAP (does not scroll) ── */}
            <View
              style={{ flex: 1, width: '100%', backgroundColor: '#e5e7eb', position: 'relative' }}
              onTouchStart={(e) => {
                touchCount.current = e.nativeEvent.touches.length;
                if (touchCount.current >= 2) setMapScrollEnabled(false);
                setModalScrollEnabled(false);
              }}
              onTouchEnd={(e) => {
                touchCount.current = e.nativeEvent.touches.length;
                if (touchCount.current < 2) setMapScrollEnabled(true);
                setModalScrollEnabled(true);
              }}
              onTouchCancel={() => {
                touchCount.current = 0;
                setMapScrollEnabled(true);
                setModalScrollEnabled(true);
              }}
            >
              {!isMapReady ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }}>
                  <ActivityIndicator size="large" color="#e11d48" />
                  {isFetchingLocation && (
                    <Text style={{ marginTop: 12, color: '#4b5563', fontWeight: '600', fontSize: 14 }}>
                      Getting your exact location...
                    </Text>
                  )}
                </View>
              ) : (
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={{ flex: 1, width: '100%' }}
                  onPress={onMapPress}
                  onPanDrag={() => setIsPanning(true)}
                  onRegionChangeComplete={onRegionDidChange}
                  scrollEnabled={mapScrollEnabled}
                  showsCompass={false}
                  showsUserLocation={false}
                  scrollDuringRotateOrZoomEnabled={false}
                  minZoomLevel={17}
                  initialCamera={{
                    center: {
                      latitude: formData.coordinates?.lat ?? defaultLat,
                      longitude: formData.coordinates?.lng ?? defaultLng
                    },
                    pitch: 0,
                    heading: 0,
                    altitude: 1000,
                    zoom: formData.coordinates ? 18 : 17
                  }}
                />
              )}

              {/* FLOATING HEADER & SEARCH */}
              <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 10 : 10, left: 16, right: 16, zIndex: 30, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                {/* Floating Back Button */}
                <TouchableOpacity onPress={closeDialog} style={{ width: 42, height: 42, backgroundColor: '#fff', borderRadius: 21, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 }}>
                  <ChevronLeft size={22} color="#111827" />
                </TouchableOpacity>

                {/* Floating Search Bar (Button) */}
                <TouchableOpacity
                  onPress={() => setIsSearchModalOpen(true)}
                  activeOpacity={0.9}
                  style={{ flex: 1, backgroundColor: '#fff', borderRadius: 21, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 8, zIndex: 40, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 14 }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#6b7280' }}>Search an area or address</Text>
                  <Search size={18} color="#4b5563" />
                </TouchableOpacity>
              </View>

              {/* Premium 3D crosshair pin -> Swiggy-style pin in App's Primary Color */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
                <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(225,29,72,0.25)', backgroundColor: 'rgba(225,29,72,0.08)', transform: [{ translateY: -38 }] }} />
                <View style={{ transform: [{ translateY: -38 }], alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#e11d48', justifyContent: 'center', alignItems: 'center', shadowColor: '#e11d48', shadowOffset: { width: 0, height: 4 }, shadowOpacity: isPanning ? 0.8 : 0.5, shadowRadius: isPanning ? 12 : 8, elevation: isPanning ? 14 : 10, transform: [{ scale: isPanning ? 1.15 : 1 }] }}>
                    {/* White circle in the center */}
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' }} />
                    {/* Subtle 3D reflections */}
                    <View style={{ position: 'absolute', top: 2, left: 6, width: 14, height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ rotate: '-35deg' }] }} />
                  </View>
                  {/* Pin tail */}
                  <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#e11d48', marginTop: -1 }} />
                  {/* Small blue dot at the very bottom of the tail */}
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#2563eb', marginTop: -2 }} />
                  {/* Ground shadow */}
                  <View style={{ width: isPanning ? 6 : 14, height: isPanning ? 3 : 5, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.22)', marginTop: isPanning ? 8 : 2 }} />
                </View>
              </View>

              {/* Distance & Delivery badge top-right */}
              {formData.distanceText !== '' && !isFetchingLocation && (
                <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 120 : 110, right: 16, backgroundColor: outOfRange ? '#ef4444' : '#16a34a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 5, alignItems: 'flex-end' }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 2 }}>
                    {outOfRange ? `❌ ${formData.distanceText}` : `📍 ${formData.distanceText}`}
                  </Text>
                  {!outOfRange && (
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', opacity: 0.9 }}>
                      Delivery: {formData.deliveryFee === 0 ? 'FREE' : formatPrice(formData.deliveryFee)}
                    </Text>
                  )}
                  {outOfRange && (
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', opacity: 0.9 }}>Out of range</Text>
                  )}
                </View>
              )}

              {/* Relocate Button */}
              <TouchableOpacity
                onPress={relocateToMyLocation}
                disabled={isRelocating || isFetchingLocation}
                style={{ position: 'absolute', bottom: 38, alignSelf: 'center', flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8, borderWidth: 1, borderColor: '#f3f4f6' }}
              >
                {isRelocating || isFetchingLocation ? <ActivityIndicator size={16} color="#e11d48" style={{ marginRight: 6 }} /> : <LocateFixed size={16} color="#e11d48" style={{ marginRight: 6 }} />}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>Current location</Text>
              </TouchableOpacity>
            </View>

            {/* ── BOTTOM SHEET FORM ── */}
            <View style={{ backgroundColor: '#fff', marginTop: -20, borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 15, overflow: 'hidden', paddingBottom: Platform.OS === 'ios' ? 20 : 12 }}>
              <View style={{ backgroundColor: '#f9fafb', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280' }}>Order will be delivered here</Text>
              </View>
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 }}>
                  <View style={{ marginTop: 2, marginRight: 12 }}>
                    <MapPin size={24} color={showShimmer ? '#d1d5db' : '#e11d48'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {showShimmer ? (
                      <>
                        {/* Shimmer skeleton for main address line */}
                        <Animated.View style={{ opacity: shimmerOpacity, height: 20, borderRadius: 6, backgroundColor: '#e5e7eb', width: '65%', marginBottom: 8 }} />
                        {/* Shimmer skeleton for sub address line */}
                        <Animated.View style={{ opacity: shimmerOpacity, height: 14, borderRadius: 6, backgroundColor: '#f3f4f6', width: '85%' }} />
                      </>
                    ) : (
                      <>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 2 }}>
                          {hasLocationError ? 'Unknown Location' : (formData.address ? cleanAddress(formData.address).split(',')[0].trim() : '')}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 18 }} numberOfLines={2}>
                          {hasLocationError ? 'Could not fetch address details' : (formData.address ? cleanAddress(formData.address).split(',').slice(1).join(', ').trim() : '')}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Validation Tooltip or Save Button (Smooth Sliding) */}
                <Animated.View style={{
                  overflow: 'hidden',
                  opacity: bottomSlideAnim,
                  maxHeight: bottomSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 250] }),
                  marginTop: bottomSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }),
                  transform: [{ translateY: bottomSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }]
                }}>
                  {isZoomedOut ? (
                    <View>
                      {/* Tooltip Arrow */}
                      <View style={{ width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#fee2e2', marginLeft: 24 }} />
                      {/* Tooltip Body */}
                      <View style={{ backgroundColor: '#fee2e2', padding: 14, borderRadius: 12 }}>
                        <Text style={{ color: '#e11d48', fontSize: 14, fontWeight: '700', lineHeight: 20 }}>
                          Zoom in to place the pin at exact delivery location
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View>
                      {/* Label Chips */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                        {PRESET_LABELS.map(label => {
                          const otherLabels = PRESET_LABELS.filter(l => l !== 'Other');
                          const isSelected = formData.name === label || (label === 'Other' && !otherLabels.includes(formData.name) && formData.name !== '');

                          let isUsed = false;
                          if (!isSelected) {
                            if (label === 'Other') {
                              isUsed = addresses.some(a => !otherLabels.includes(a.name) && (a.id || a._id) !== editingId);
                            } else {
                              isUsed = addresses.some(a => a.name === label && (a.id || a._id) !== editingId);
                            }
                          }

                          return (
                            <TouchableOpacity
                              key={label}
                              disabled={isUsed}
                              onPress={() => setFormData(prev => ({ ...prev, name: label === 'Other' ? 'Delivery Address' : label }))}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: isSelected ? '#e11d48' : (isUsed ? '#f3f4f6' : '#d1d5db'),
                                backgroundColor: isSelected ? '#fff1f2' : (isUsed ? '#f9fafb' : '#ffffff'),
                                flexDirection: 'row',
                                alignItems: 'center',
                                opacity: isUsed ? 0.5 : 1
                              }}
                            >
                              <Text style={{
                                color: isSelected ? '#e11d48' : (isUsed ? '#9ca3af' : '#4b5563'),
                                fontWeight: isSelected ? '700' : '500',
                                fontSize: 13
                              }}>
                                {label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4b5563' }}>Set as default address</Text>
                        <Switch
                          value={formData.isDefault}
                          onValueChange={(val) => setFormData(prev => ({ ...prev, isDefault: val }))}
                          trackColor={{ false: '#e5e7eb', true: '#fecdd3' }}
                          thumbColor={formData.isDefault ? '#e11d48' : '#ffffff'}
                          ios_backgroundColor="#e5e7eb"
                        />
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          handleSave();
                        }}
                        disabled={isSaving || outOfRange || !formData.coordinates || formData.address?.toLowerCase().includes('custom location')}
                        style={{ height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isSaving || outOfRange || !formData.coordinates || formData.address?.toLowerCase().includes('custom location') ? '#d1d5db' : '#e11d48' }}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Confirm & proceed</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </Animated.View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>

        {/* --- FULL SCREEN SEARCH MODAL (SLIDING) --- */}
        <Animated.View
          pointerEvents={isSearchModalOpen ? 'auto' : 'none'}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
            transform: [{ translateX: searchSlideAnim }],
            backgroundColor: '#fff',
            zIndex: 200
          }}
        >
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 10 : 10, paddingBottom: 10, gap: 10 }}>
              <TouchableOpacity onPress={() => setIsSearchModalOpen(false)} style={{ width: 42, height: 42, backgroundColor: '#f9fafb', borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3f4f6' }}>
                <ChevronLeft size={22} color="#111827" />
              </TouchableOpacity>

              <View style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: 21, borderWidth: 1, borderColor: '#f3f4f6' }}>
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                  <View style={{ position: 'absolute', left: 14, zIndex: 1 }}><Search size={16} color="#9ca3af" /></View>
                  <TextInput
                    ref={searchInputRef}
                    placeholder="Search area, landmark..."
                    value={searchQuery}
                    onChangeText={(t) => { setSearchQuery(t); if (t.length === 0) setShowSuggestions(false); }}
                    placeholderTextColor="#9ca3af"
                    style={{ paddingLeft: 40, paddingRight: 40, height: 42, backgroundColor: 'transparent', borderRadius: 21, fontSize: 14, fontWeight: '500', color: '#111827' }}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery('');
                        setShowSuggestions(false);
                        searchInputRef.current?.focus();
                      }}
                      style={{ position: 'absolute', right: 10, zIndex: 1, padding: 4 }}
                    >
                      <X size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Suggestions List */}
            <ScrollView keyboardShouldPersistTaps="handled">
              {showSuggestions && suggestions.length > 0 ? (
                suggestions.map((item: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setIsSearchModalOpen(false);
                      handleSuggestionSelect(item.place_id, item.description);
                    }}
                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'flex-start' }}
                  >
                    <MapPin size={18} color="#e11d48" style={{ marginTop: 2, marginRight: 12, flexShrink: 0 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }} numberOfLines={1}>{item.main_text}</Text>
                      <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }} numberOfLines={1}>{item.secondary_text}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Search size={40} color="#e5e7eb" style={{ marginBottom: 16 }} />
                  <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>Type above to search for an area</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>

      </View>
    </View>
  );
}