import { useRouter } from 'expo-router';
import { AlertCircle, Briefcase, Home, Info, Loader2, MapPin, Pencil, Plus, Search, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { useAlert } from '@/components/ui/CustomAlert';
import WebViewMapPicker from '@/components/shop/WebViewMapPicker';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';
const PRESET_LABELS = ["Home", "Work", "Office", "Mom's Place", "Other"];

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
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

export default function AccountAddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isInitialized } = useAuthStore();
  const { showAlert } = useAlert();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    address: '', 
    isDefault: false,
    coordinates: null as { lat: number; lng: number } | null,
    distanceText: '',
    deliveryFee: 0
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [outOfRange, setOutOfRange] = useState(false);

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
    if (isInitialized && user) {
      fetchAddresses();
    }
  }, [isInitialized, user]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch(`${API_URL}/user/addresses`);
      const data = await res.json();
      if (data.success) setAddresses(data.addresses || []);
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
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch (e) {}
    };
    fetchLocations();
  }, [debouncedSearch]);

  // When user taps on a search suggestion
  const handleSelectSearchItem = async (item: any) => {
    setSearchQuery(item.main_text);
    setShowSuggestions(false);
    // Directly call reverse geocode to get address and distance
    await handleLocationSelect(item.lat, item.lon, item.description);
  };

  const handleLocationSelect = async (lat: number, lng: number, addressStr?: string) => {
    try {
      toast.loading("Calculating delivery distance...", { id: 'dist' });
      setOutOfRange(false);
      
      if (!addressStr) {
        const revRes = await fetch(`${API_URL}/location/reverse?lat=${lat}&lon=${lng}`);
        const revData = await revRes.json();
        addressStr = revData.address;
      }
      
      const res = await fetch(`${API_URL}/location/distance?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      
      if(data.success) {
        const distKm = data.distanceValue / 1000;
        let fee = 0;
        
        if(distKm > 50) {
          setOutOfRange(true);
          toast.error(`Distance: ${data.distanceText}. Outside 50km delivery range!`, { id: 'dist', duration: 4000 });
          setFormData(prev => ({ ...prev, coordinates: { lat, lng }, address: addressStr as string, distanceText: data.distanceText, deliveryFee: 0 }));
          return;
        }

        if(distKm > 2) {
          const extraKm = Math.ceil(distKm - 2);
          fee = 50 + (extraKm * 10);
        }
        
        setFormData(prev => ({ ...prev, coordinates: { lat, lng }, address: addressStr as string, distanceText: data.distanceText, deliveryFee: fee }));
        toast.success(`Distance: ${data.distanceText}. Delivery Fee: ${fee === 0 ? 'FREE' : formatPrice(fee)}`, { id: 'dist' });
      } else {
        toast.error("Failed to calculate distance.", { id: 'dist' });
      }
    } catch(e) {
      toast.error("Error calculating distance.", { id: 'dist' });
    }
  };

  const handleOpenDialog = (address?: Address) => {
    const id = address?.id || address?._id;
    if (address && id) {
      setEditingId(id);
      setFormData({
        name: address.name || '',
        address: address.address,
        isDefault: address.isDefault,
        coordinates: address.coordinates || null,
        distanceText: address.distanceText || '',
        deliveryFee: address.deliveryFee || 0
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
      toast.error("Location is outside our 50km delivery range.");
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
        setIsDialogOpen(false);
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

  const getIcon = (name: string | undefined) => {
    const safeName = (name || "").toLowerCase();
    if (safeName.includes('home')) return <Home size={20} color="#e11d48" />;
    if (safeName.includes('work') || safeName.includes('office')) return <Briefcase size={20} color="#e11d48" />;
    return <MapPin size={20} color="#e11d48" />;
  };

  if (isLoading || !isInitialized) {
    return <View className="flex-1 justify-center items-center bg-gray-50"><ActivityIndicator size="large" color="#e11d48" /></View>;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
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
              if (!addrId) return null;
              return (
                <View key={addrId} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-row flex-1 mr-4">
                      <View className="h-12 w-12 rounded-2xl bg-primary/10 items-center justify-center mr-4 mt-1">
                        {getIcon(addr.name)}
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                          <Text className="font-bold text-lg text-gray-900 font-sans">
                            {addr.name || "Address"}
                          </Text>
                          {addr.isDefault && (
                            <View className="bg-green-100 px-2 py-0.5 rounded border border-green-200">
                              <Text className="text-[10px] font-bold text-green-700 uppercase font-sans">Default</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-sm text-gray-500 font-medium leading-5 font-sans mb-3">
                          {addr.address || "No address provided"}
                        </Text>
                        
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
                      <TouchableOpacity onPress={() => confirmDelete(addrId)} className="p-2.5 bg-red-50 rounded-xl">
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

      {/* Floating Add Button */}
      <View className="absolute bottom-6 right-6">
        <TouchableOpacity 
          onPress={() => handleOpenDialog()} 
          activeOpacity={0.8}
          className="h-16 w-16 bg-primary rounded-full items-center justify-center shadow-lg"
          style={{ shadowColor: '#e11d48', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 }}
        >
          <Plus size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* --- ADD / EDIT MODAL --- */}
      <Modal visible={isDialogOpen} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setIsDialogOpen(false)}>
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
            <Text className="text-xl font-bold text-gray-900 font-sans">{editingId ? 'Edit Address' : 'Add New Address'}</Text>
            <TouchableOpacity onPress={() => setIsDialogOpen(false)} className="p-2 bg-gray-100 rounded-full">
              <X size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            
            {/* Label Section */}
            <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-4">
              <Text className="text-sm font-bold text-gray-700 font-sans mb-3">Address Label</Text>
              <TextInput 
                value={formData.name} 
                onChangeText={(t) => setFormData({...formData, name: t})} 
                placeholder="e.g. Home, Office" 
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-medium font-sans mb-3"
              />
              <View className="flex-row flex-wrap gap-2">
                {PRESET_LABELS.map((label) => (
                  <TouchableOpacity 
                    key={label} 
                    onPress={() => setFormData({...formData, name: label})}
                    className={`px-4 py-2 rounded-full border ${formData.name.toLowerCase() === label.toLowerCase() ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
                  >
                    <Text className={`text-xs font-bold font-sans ${formData.name.toLowerCase() === label.toLowerCase() ? 'text-white' : 'text-gray-600'}`}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Map & Search Section */}
            <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-4 z-20">
              <Text className="text-sm font-bold text-gray-700 font-sans mb-3">Locate on Map</Text>
              
              <View className="relative z-50 mb-3">
                <View className="absolute left-3 top-3.5 z-10"><Search size={18} color="#9ca3af" /></View>
                <TextInput 
                  placeholder="Search area (e.g. Janai...)" 
                  value={searchQuery} 
                  onChangeText={(t) => { setSearchQuery(t); if(t.length === 0) setShowSuggestions(false); }} 
                  placeholderTextColor="#9ca3af"
                  className="pl-10 pr-4 h-12 bg-gray-50 border border-gray-200 rounded-xl font-medium font-sans text-gray-900" 
                />
                
                {showSuggestions && suggestions.length > 0 && (
                  <View className="absolute top-14 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-hidden z-50">
                    <ScrollView keyboardShouldPersistTaps="handled">
                      {suggestions.map((item: any) => (
                        <TouchableOpacity 
                          key={item.place_id} 
                          onPress={() => handleSelectSearchItem(item)} 
                          className="p-3 border-b border-gray-100 flex-row items-start"
                        >
                          <MapPin size={16} color="#e11d48" className="mt-0.5 mr-3 shrink-0" />
                          <View className="flex-1 pr-2">
                            <Text className="text-sm font-bold text-gray-900 font-sans" numberOfLines={1}>{item.main_text}</Text>
                            <Text className="text-xs text-gray-500 font-medium font-sans mt-0.5" numberOfLines={1}>{item.secondary_text}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* ★ WebView Map Picker (No API Key Needed) ★ */}
              <WebViewMapPicker 
                onLocationSelect={handleLocationSelect} 
                selectedLocation={formData.coordinates} 
              />

              {/* Warning Tip */}
              <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex-row items-start mt-4">
                <Info size={20} color="#ca8a04" className="mt-0.5 mr-3 shrink-0" />
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-bold text-yellow-800 font-sans mb-0.5">Delivery tip:</Text>
                  <Text className="text-xs text-yellow-700 font-medium leading-relaxed font-sans">Tap on map to place pin, or drag the existing pin. We'll auto-calculate delivery fee.</Text>
                </View>
              </View>

              {/* Distance Result */}
              {formData.distanceText !== '' && (
                <View className={`p-3 rounded-xl border flex-row items-center mt-3 ${outOfRange ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <AlertCircle size={20} color={outOfRange ? '#dc2626' : '#16a34a'} className="mr-3" />
                  <View>
                    <Text className={`text-sm font-bold font-sans ${outOfRange ? 'text-red-700' : 'text-green-700'}`}>
                      Delivery Fee: {outOfRange ? 'N/A' : (formData.deliveryFee === 0 ? 'FREE' : formatPrice(formData.deliveryFee))}
                    </Text>
                    <Text className={`text-xs font-medium font-sans mt-0.5 ${outOfRange ? 'text-red-600' : 'text-green-600'}`}>
                      {outOfRange ? `Distance: ${formData.distanceText}. Too far!` : `Distance: ${formData.distanceText}`}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Detailed Address Section */}
            <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-4">
              <Text className="text-sm font-bold text-gray-700 font-sans mb-3">Detailed Address</Text>
              <TextInput 
                value={formData.address} 
                onChangeText={(t) => setFormData({...formData, address: t})} 
                placeholder="House No, Street, Landmark..." 
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-medium font-sans min-h-[90px]"
              />
            </View>

            {/* Default Switch */}
            <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-base font-bold text-gray-900 font-sans">Set as Default</Text>
                <Text className="text-xs text-gray-500 font-medium mt-0.5 font-sans">Auto select for checkout.</Text>
              </View>
              <Switch 
                value={formData.isDefault} 
                onValueChange={(c) => setFormData({...formData, isDefault: c})} 
                trackColor={{ false: '#e5e7eb', true: '#e11d48' }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              onPress={handleSave} 
              disabled={isSaving || outOfRange || !formData.coordinates} 
              className={`w-full h-14 rounded-2xl flex-row items-center justify-center shadow-md ${isSaving || outOfRange || !formData.coordinates ? 'bg-gray-300' : 'bg-primary'}`}
            >
              {isSaving ? <ActivityIndicator color="#ffffff" /> : <Text className="text-white font-bold text-lg font-sans">{editingId ? 'Update Address' : 'Save Address'}</Text>}
            </TouchableOpacity>
            
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}