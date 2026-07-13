// src/features/home/components/SectionHeading.tsx
import { View, Text } from 'react-native';

interface SectionHeadingProps {
  title: string;
}

export const SectionHeading = ({ title }: SectionHeadingProps) => {
  return (
    <View className="flex-row items-center mb-6 px-1 mt-2">
      <View className="w-1.5 h-6 bg-primary rounded-full mr-3" />
      <Text className="text-xl font-black tracking-widest text-gray-900 uppercase font-sans">
        {title}
      </Text>
    </View>
  );
};
