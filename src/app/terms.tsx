import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 font-sans ml-2">Terms of Service</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mb-8">
          
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            Welcome to Bumba's Kitchen! These Terms of Service ("Terms") govern your use of our cloud kitchen service,
            including home delivery and pickup options, operated by Bumba's Kitchen ("we," "us," or "our"). By accessing or
            using our service, you agree to be bound by these Terms. If you do not agree with these Terms, please do not
            access or use our service.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">1. Overview of Services</Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            Bumba's Kitchen is a cloud kitchen offering food for home delivery and pickup. Our platform enables customers to
            place orders for meals prepared by us, which are then delivered to their specified location or available for
            pickup. We aim to provide high-quality meals, crafted with care, and ensure a seamless customer experience.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">2. Eligibility</Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            You must be at least 18 years old to use our service. By accessing or using our services, you confirm that you
            meet this age requirement and have the legal capacity to enter into a binding agreement with us.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">3. Account Registration</Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            To place an order through Bumba's Kitchen, you may need to create an account. You agree to provide accurate and
            complete information during the registration process. You are responsible for maintaining the confidentiality of
            your account information and for all activities that occur under your account.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">4. Orders and Payment</Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            All orders placed through Bumba's Kitchen are subject to acceptance and availability. Once you place an order,
            you will receive an order confirmation email. We reserve the right to cancel any order for any reason. Payment
            for your order must be made via the methods we provide, and you agree to pay all fees and applicable taxes
            associated with your order.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">5. Pricing</Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            Prices for menu items are displayed on our website and are subject to change at any time. While we strive to
            ensure that pricing information is accurate, we are not responsible for any pricing errors. In the event of a
            pricing error, we reserve the right to cancel any orders placed at the incorrect price.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">6. Delivery and Pickup</Text>
          <Text className="text-[13px] text-gray-500 mb-2 leading-relaxed">
            <Text className="font-bold text-gray-700">Delivery:</Text> Bumba's Kitchen offers home delivery within specific areas. Delivery times are
            estimated and may vary due to factors beyond our control, such as traffic or weather conditions. You agree to
            provide accurate delivery information, and we will not be responsible for any failed deliveries due to incorrect
            information provided.
          </Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            <Text className="font-bold text-gray-700">Pickup:</Text> If you choose to pick up your order, you will be notified when your order is ready. You
            are responsible for collecting your order within the designated time window. Bumba's Kitchen is not responsible
            for any orders left uncollected beyond this time frame.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">7. Cancellations and Refunds</Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            If you wish to cancel your order, you must do so within a specified timeframe, typically before the order has
            been prepared. Refunds are subject to our discretion and may be processed for cancellations made within the
            allowed window. Once your order has been prepared or delivered, no refunds will be provided.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">8. Allergies and Dietary Preferences</Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            Bumba's Kitchen strives to accommodate various dietary preferences and restrictions. However, we cannot guarantee
            that our meals are completely free from allergens. It is your responsibility to inform us of any food allergies
            or restrictions when placing an order. We are not liable for any allergic reactions or health issues arising
            from the consumption of our meals.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">9. Food Quality and Safety</Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            We take food quality and safety seriously. All meals are prepared in compliance with applicable food safety
            regulations. In the event that you receive an order that you believe does not meet our quality standards, please
            contact us within 24 hours. We will investigate the issue and may, at our discretion, provide a replacement or
            refund.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">10. Prohibited Activities</Text>
          <Text className="text-[13px] text-gray-500 mb-2 leading-relaxed">
            You agree not to engage in any of the following prohibited activities while using our service:
          </Text>
          <View className="pl-2 mb-6 space-y-1">
            <Text className="text-[13px] text-gray-500 leading-relaxed">• Attempting to interfere with the proper functioning of our website or service.</Text>
            <Text className="text-[13px] text-gray-500 leading-relaxed">• Providing false or misleading information when placing an order.</Text>
            <Text className="text-[13px] text-gray-500 leading-relaxed">• Using our service for any unlawful or fraudulent purposes.</Text>
            <Text className="text-[13px] text-gray-500 leading-relaxed">• Attempting to gain unauthorized access to our systems or customer accounts.</Text>
          </View>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">11. Intellectual Property</Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            All content on Bumba's Kitchen, including but not limited to text, graphics, logos, images, and software, is the
            property of Bumba's Kitchen or its licensors and is protected by applicable intellectual property laws. You may
            not use any content from our website or service without prior written permission from us.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">12. Limitation of Liability</Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            Bumba's Kitchen shall not be held liable for any indirect, incidental, or consequential damages arising out of or
            in connection with your use of our service, including but not limited to damages for loss of profits, data, or
            other intangible losses. Our total liability to you for any claim related to the use of our service shall not
            exceed the amount you paid for your order.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">13. Changes to Terms</Text>
          <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            We reserve the right to modify these Terms at any time. Any changes will be effective upon posting the revised
            Terms on our website. Your continued use of our service after the changes have been posted will constitute your
            acceptance of the revised Terms.
          </Text>

          <Text className="text-base font-bold text-gray-900 mt-2 mb-2">14. Contact Information</Text>
          <Text className="text-[13px] text-gray-500 mb-3 leading-relaxed">
            If you have any questions or concerns regarding these Terms, please contact us at:
          </Text>
          <View className="bg-gray-50 p-4 rounded-xl">
            <Text className="text-[13px] text-gray-700 font-bold">Email: <Text className="font-normal text-gray-500">info.bumbaskitchen@gmail.com</Text></Text>
            <Text className="text-[13px] text-gray-700 font-bold mt-1">Phone: <Text className="font-normal text-gray-500">(+91) 8240-690-254</Text></Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
