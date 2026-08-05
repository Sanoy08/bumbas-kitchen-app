// src/app/(shop)/account/addresses/index.tsx

import { useRouter } from 'expo-router';
import { AlertCircle, Briefcase, Home, Info, Loader2, MapPin, Pencil, Plus, Search, Trash2, X, LocateFixed, ChevronLeft } from 'lucide-react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, BackHandler, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import * as Location from 'expo-location';

// ★ react-native-maps / WebView সরিয়ে MapLibre Native আনা হলো
import { Camera, type CameraRef, Map, type MapRef } from '@maplibre/maplibre-react-native';

import { useAlert } from '@/shared/components/ui';
import { formatPrice } from '@/shared/utils/utils';
import { useAuthStore } from '@/shared/store/authStore';
import { useTabBarStore } from '@/shared/store/tabBarStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';
const PRESET_LABELS = ["Home", "Work", "Office", "Mom's Place", "Other"];

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
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

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
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const [isPanning, setIsPanning] = useState(false);
  // Prevents onRegionDidChange from calling handleLocationSelect during programmatic camera moves
  const isProgrammaticMove = useRef(false);
  
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
  const [modalScrollEnabled, setModalScrollEnabled] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);

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
    if (isDialogOpen) {
      const timer = setTimeout(() => setIsMapReady(true), 200);
      
      // If no coordinates are set (new address), fetch live GPS with best possible accuracy
      if (!formData.coordinates && !editingId) {
        (async () => {
          setIsFetchingLocation(true);
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              // BestForNavigation uses all sensors (GPS + IMU) — max accuracy, takes longer
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
                maximumAge: 0, // Never use cached location
              });
              handleLocationSelect(loc.coords.latitude, loc.coords.longitude);
              // Move camera to GPS location without triggering the pan loop
              if (isMapReady) moveCameraTo(loc.coords.latitude, loc.coords.longitude);
            }
          } catch (error) {
            console.log('Location error:', error);
          } finally {
            setIsFetchingLocation(false);
          }
        })();
      }

      return () => clearTimeout(timer);
    } else {
      setIsMapReady(false);
      setIsFetchingLocation(false);
    }
  }, [isDialogOpen]);

  // Move camera programmatically without triggering the pan→update loop
  const moveCameraTo = (lat: number, lng: number, zoom = 17) => {
    isProgrammaticMove.current = true;
    cameraRef.current?.easeTo({
      center: [lng, lat],
      zoom,
      duration: 600,
      easing: 'ease',
    });
    // Reset flag after animation finishes
    setTimeout(() => { isProgrammaticMove.current = false; }, 800);
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
        const res = await fetch(`${API_URL}/location/search?q=${debouncedSearch}`);
        if (!res.ok) throw new Error('API failed');
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch (e) {}
    };
    fetchLocations();
  }, [debouncedSearch]);

  const handleLocationSelect = async (lat: number, lng: number, addressStr?: string) => {
    try {
      setOutOfRange(false);
      
      if (!addressStr) {
        const revRes = await fetch(`${API_URL}/location/reverse?lat=${lat}&lon=${lng}`);
        if (!revRes.ok) throw new Error('API failed');
        const revData = await revRes.json();
        addressStr = revData.address;
      }
      
      const res = await fetch(`${API_URL}/location/distance?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      
      if(data.success) {
        const distKm = data.distanceValue / 1000;
        let fee = 0;
        
        if(distKm > 10) {
          setOutOfRange(true);
          setFormData(prev => ({ ...prev, coordinates: { lat, lng }, address: addressStr as string, distanceText: data.distanceText, deliveryFee: 0 }));
          return;
        }

        if(distKm > 2) {
          const extraKm = Math.ceil(distKm - 2);
          fee = 50 + (extraKm * 10);
        }
        
        setFormData(prev => ({ ...prev, coordinates: { lat, lng }, address: addressStr as string, distanceText: data.distanceText, deliveryFee: fee }));
      }
    } catch(e) {
      console.log("Error calculating distance:", e);
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
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address || !formData.coordinates) {
      toast.error("Label, Address and Map Location are required");
      return;
    }
    if(outOfRange) {
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

  // ★ MapLibre Map Style for Google Hybrid
  const mapStyleJSON = JSON.stringify({
    version: 8,
    sources: {
      'google-hybrid': {
        type: 'raster',
        tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: 'google-hybrid-layer',
        type: 'raster',
        source: 'google-hybrid',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  });

  const defaultLat = formData.coordinates?.lat || 22.717958;
  const defaultLng = formData.coordinates?.lng || 88.260207;

  // When map finishes panning, grab the center and set that as pin location
  const onRegionDidChange = async () => {
    setIsPanning(false);
    // Skip if this was a programmatic camera move (GPS/search) to avoid feedback loop
    if (isProgrammaticMove.current) return;
    try {
      const center = await mapRef.current?.getCenter();
      if (center) {
        const [lng, lat] = center;
        handleLocationSelect(lat, lng);
      }
    } catch (e) {
      console.log('Region change error:', e);
    }
  };

  // Tap on a spot to jump camera there (onRegionDidChange will then update address)
  const onMapPress = (feature: any) => {
    try {
      if (feature?.geometry?.coordinates) {
        const [lng, lat] = feature.geometry.coordinates;
        // Don't set isProgrammaticMove — we WANT onRegionDidChange to fire after this
        cameraRef.current?.easeTo({ center: [lng, lat], zoom: 17, duration: 300 });
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
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          maximumAge: 0,
        });
        handleLocationSelect(loc.coords.latitude, loc.coords.longitude);
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
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
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
                <View key={addrId} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
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
                        <Text className="text-sm text-gray-500 font-medium leading-5 font-sans mb-3">{addr.address}</Text>
                        
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
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-6 right-6">
  <TouchableOpacity 
    onPress={() => handleOpenDialog()} 
    activeOpacity={0.8}
    className="h-16 w-16 bg-primary rounded-full items-center justify-center shadow-lg"
    style={{ 
      position: 'absolute', 
      bottom: 80, 
      right: 24,  
      shadowColor: '#e11d48', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.4, 
      shadowRadius: 8, 
      elevation: 8 
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

          {/* ── Header ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', zIndex: 10 }}>
                <TouchableOpacity onPress={closeDialog} style={{ padding: 8, marginRight: 12, backgroundColor: '#f3f4f6', borderRadius: 50 }}>
                  <ChevronLeft size={20} color="#374151" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{editingId ? 'Edit Address' : 'Add New Address'}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Pan the map to place your pin</Text>
                </View>
              </View>

              {/* ── STICKY MAP (does not scroll) ── */}
              <View
                style={{ height: 260, width: '100%', backgroundColor: '#e5e7eb', position: 'relative' }}
                onTouchStart={() => setModalScrollEnabled(false)}
                onTouchEnd={() => setModalScrollEnabled(true)}
                onTouchCancel={() => setModalScrollEnabled(true)}
              >
                {!isMapReady ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }}>
                    <ActivityIndicator size="large" color="#e11d48" />
                  </View>
                ) : (
                  <Map
                    ref={mapRef}
                    style={{ flex: 1, width: '100%' }}
                    mapStyle={mapStyleJSON}
                    onPress={onMapPress}
                    onRegionWillChange={() => setIsPanning(true)}
                    onRegionDidChange={onRegionDidChange}
                    compass={false}
                    logo={false}
                    attribution={false}
                  >
                    {/* Restrict camera panning to a 10km box around the restaurant */}
                    <Camera
                      ref={cameraRef}
                      initialViewState={{ center: [defaultLng, defaultLat], zoom: 17 }}
                      maxBounds={[88.162807, 22.628158, 88.357607, 22.807758]}
                    />
                  </Map>
                )}

                {/* ── Premium 3D crosshair pin (always at visual center) ── */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
                  {/* Outer pulsing ring */}
                  <View style={{
                    position: 'absolute',
                    width: 60, height: 60, borderRadius: 30,
                    borderWidth: 2, borderColor: 'rgba(225,29,72,0.25)',
                    backgroundColor: 'rgba(225,29,72,0.08)',
                    transform: [{ translateY: -38 }],
                  }} />
                  {/* Pin body — teardrop shape */}
                  <View style={{ transform: [{ translateY: -38 }], alignItems: 'center' }}>
                    {/* Head: gradient-style layered 3D circles */}
                    <View style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundColor: '#e11d48',
                      justifyContent: 'center', alignItems: 'center',
                      shadowColor: '#e11d48', shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isPanning ? 0.8 : 0.5, shadowRadius: isPanning ? 12 : 8,
                      elevation: isPanning ? 14 : 10,
                      borderWidth: 2.5, borderColor: '#fff',
                      transform: [{ scale: isPanning ? 1.15 : 1 }],
                      overflow: 'hidden'
                    }}>
                      {/* 3D Highlight top */}
                      <View style={{
                        position: 'absolute', top: 2, left: 6,
                        width: 14, height: 6, borderRadius: 6,
                        backgroundColor: 'rgba(255,255,255,0.4)',
                        transform: [{ rotate: '-35deg' }]
                      }} />
                      {/* 3D Shadow bottom right */}
                      <View style={{
                        position: 'absolute', bottom: -5, right: -5,
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: 'rgba(0,0,0,0.15)'
                      }} />
                      {/* Inner crosshair */}
                      <View style={{ width: 10, height: 1.5, backgroundColor: '#fff', position: 'absolute' }} />
                      <View style={{ width: 1.5, height: 10, backgroundColor: '#fff', position: 'absolute' }} />
                    </View>
                    {/* Sharp tail */}
                    <View style={{
                      width: 0, height: 0,
                      borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 12,
                      borderLeftColor: 'transparent', borderRightColor: 'transparent',
                      borderTopColor: '#e11d48',
                      marginTop: -1,
                    }} />
                    {/* Ground shadow */}
                    <View style={{
                      width: isPanning ? 6 : 14, height: isPanning ? 3 : 5,
                      borderRadius: 10,
                      backgroundColor: 'rgba(0,0,0,0.22)',
                      marginTop: isPanning ? 8 : 3,
                    }} />
                  </View>
                </View>

                {/* GPS loading overlay */}
                {isFetchingLocation ? (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center', elevation: 10 }}>
                      <ActivityIndicator size="large" color="#e11d48" />
                      <Text style={{ marginTop: 10, fontSize: 13, fontWeight: '700', color: '#111' }}>Getting your location…</Text>
                      <Text style={{ marginTop: 3, fontSize: 11, color: '#6b7280' }}>GPS + all sensors active</Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: isPanning ? 'rgba(0,0,0,0.75)' : 'rgba(225,29,72,0.9)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                      {isPanning ? '🗺️  Move map to reposition' : '📍  Pan the map to change location'}
                    </Text>
                  </View>
                )}

                {/* Distance badge top-right */}
                {formData.distanceText !== '' && !isFetchingLocation && (
                  <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: outOfRange ? '#ef4444' : '#16a34a', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, zIndex: 10 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                      {outOfRange ? `❌ ${formData.distanceText}` : `📍 ${formData.distanceText}`}
                    </Text>
                  </View>
                )}

                {/* Relocate to my location button */}
                <TouchableOpacity
                  onPress={relocateToMyLocation}
                  disabled={isRelocating || isFetchingLocation}
                  style={{
                    position: 'absolute', bottom: 12, right: 12,
                    backgroundColor: '#fff',
                    width: 44, height: 44, borderRadius: 22,
                    justifyContent: 'center', alignItems: 'center',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2, shadowRadius: 6,
                    elevation: 8,
                    borderWidth: 1, borderColor: '#e5e7eb',
                  }}
                >
                  {isRelocating || isFetchingLocation
                    ? <ActivityIndicator size={20} color="#3b82f6" />
                    : <LocateFixed size={22} color="#3b82f6" />}
                </TouchableOpacity>
              </View>


              {/* ── SCROLLABLE FORM ── */}
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                scrollEnabled={modalScrollEnabled}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
              >

                {/* Address Label */}
                <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>Address Label</Text>
                  <TextInput
                    value={formData.name}
                    onChangeText={(t) => setFormData({...formData, name: t})}
                    placeholder="e.g. Home, Office"
                    placeholderTextColor="#9ca3af"
                    style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 12 }}
                  />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {PRESET_LABELS.map((label) => (
                      <TouchableOpacity
                        key={label}
                        onPress={() => setFormData({...formData, name: label})}
                        style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, borderWidth: 1.5, borderColor: formData.name === label ? '#e11d48' : '#e5e7eb', backgroundColor: formData.name === label ? '#e11d48' : '#fff' }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: formData.name === label ? '#fff' : '#6b7280' }}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Search */}
                <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, zIndex: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>Search Location</Text>
                  <View style={{ position: 'relative' }}>
                    <View style={{ position: 'absolute', left: 12, top: 13, zIndex: 1 }}><Search size={16} color="#9ca3af" /></View>
                    <TextInput
                      placeholder="Search area, landmark..."
                      value={searchQuery}
                      onChangeText={(t) => { setSearchQuery(t); if (t.length === 0) setShowSuggestions(false); }}
                      placeholderTextColor="#9ca3af"
                      style={{ paddingLeft: 38, paddingRight: 14, height: 44, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, fontSize: 14, fontWeight: '500', color: '#111827' }}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <View style={{ position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', maxHeight: 200, overflow: 'hidden', zIndex: 50, elevation: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10 }}>
                        <ScrollView keyboardShouldPersistTaps="handled">
                          {suggestions.map((item: any) => (
                            <TouchableOpacity
                              key={item.place_id}
                              onPress={() => handleSelectSearchItem(item)}
                              style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'flex-start' }}
                            >
                              <MapPin size={15} color="#e11d48" style={{ marginTop: 1, marginRight: 10, flexShrink: 0 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }} numberOfLines={1}>{item.main_text}</Text>
                                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }} numberOfLines={1}>{item.secondary_text}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                {/* Detailed Address */}
                <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>Detailed Address</Text>
                  <TextInput
                    value={formData.address}
                    onChangeText={(t) => setFormData({...formData, address: t})}
                    placeholder="House no., street, landmark..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontWeight: '500', color: '#111827', minHeight: 90 }}
                  />
                </View>

                {/* Delivery info */}
                {formData.distanceText !== '' && (
                  <View style={{ backgroundColor: outOfRange ? '#fef2f2' : '#f0fdf4', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: outOfRange ? '#fecaca' : '#bbf7d0', flexDirection: 'row', alignItems: 'center' }}>
                    <AlertCircle size={18} color={outOfRange ? '#dc2626' : '#16a34a'} style={{ marginRight: 10 }} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: outOfRange ? '#b91c1c' : '#15803d' }}>
                        Delivery Fee: {outOfRange ? 'Out of range' : formData.deliveryFee === 0 ? 'FREE 🎉' : formatPrice(formData.deliveryFee)}
                      </Text>
                      <Text style={{ fontSize: 11, color: outOfRange ? '#ef4444' : '#16a34a', marginTop: 2 }}>
                        {outOfRange ? `${formData.distanceText} — outside 10km range` : `Distance: ${formData.distanceText}`}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Set as Default */}
                <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Set as Default</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Auto-selected at checkout</Text>
                  </View>
                  <Switch
                    value={formData.isDefault}
                    onValueChange={(c) => setFormData({...formData, isDefault: c})}
                    trackColor={{ false: '#e5e7eb', true: '#e11d48' }}
                    thumbColor="#fff"
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSaving || outOfRange || !formData.coordinates}
                  style={{ height: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isSaving || outOfRange || !formData.coordinates ? '#d1d5db' : '#e11d48', shadowColor: '#e11d48', shadowOffset: { width: 0, height: 4 }, shadowOpacity: isSaving || outOfRange || !formData.coordinates ? 0 : 0.35, shadowRadius: 10, elevation: isSaving || outOfRange || !formData.coordinates ? 0 : 6 }}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{editingId ? '✓ Update Address' : '✓ Save Address'}</Text>
                  )}
                </TouchableOpacity>

              </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
      </View>
    </View>
  );
}