// src/features/home/components/FeaturesSection.tsx
import { Leaf, ShieldCheck, Truck } from 'lucide-react-native';
import { Text, View } from 'react-native';

const FEATURES = [
  { icon: Truck, title: "Safe & Secure", desc: "Get Secured Delivery", color: "#3b82f6", bg: "bg-blue-50" },
  { icon: Leaf, title: "Fresh & Organic", desc: "Farm fresh ingredients", color: "#22c55e", bg: "bg-green-50" },
  { icon: ShieldCheck, title: "Safety First", desc: "100% Hygienic Kitchen", color: "#a855f7", bg: "bg-purple-50" },
];

export const FeaturesSection = () => (
  <View className="flex-row justify-between px-4 py-6 bg-gray-50 border-y border-gray-100 mb-6">
    {FEATURES.map((feat, idx) => (
      <View key={idx} className="flex-1 items-center px-1">
        <View className={`h-12 w-12 rounded-full ${feat.bg} items-center justify-center mb-2`}>
          <feat.icon size={22} color={feat.color} />
        </View>
        <Text className="font-bold text-[11px] text-gray-900 text-center font-sans">
          {feat.title}
        </Text>
      </View>
    ))}
  </View>
);
