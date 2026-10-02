import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 font-sans ml-2">Privacy Policy</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
            <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

              <Text className="font-bold text-gray-700">Last Updated:</Text> 07/10/2024
            
</Text>

            <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

              Bumba's Kitchen is committed to protecting your privacy and ensuring your personal information is handled in a secure and responsible manner. This Privacy Policy explains how we collect, use, and share your personal data when you interact with our services, including home delivery and pickup. We also explain your rights regarding your personal information and how you can exercise them.
            
</Text>


            <View>
              <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
1. Information We Collect
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                We collect various types of information depending on how you interact with us, including:
              
</Text>


              <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
1.1 Personal Information
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                When you use our services or place an order, we collect personal data that allows us to provide our service to you. This may include:
              
</Text>

              <View className="pl-2 mb-6">

                <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Name:</Text> Used to identify you as a customer.</Text>

                <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Contact Details:</Text> Phone number and delivery address are used for order confirmation, communication, and delivery purposes. We do not collect or save your email address.</Text>

                <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Payment Information:</Text> We only accept Cash on Delivery (COD) for all orders. Therefore, we do not collect, process, or store any payment information, such as credit/debit card details or billing addresses.</Text>

              
</View>


              <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
1.2 Order Information
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                We collect information related to your orders, such as:
              
</Text>

              <View className="pl-2 mb-6">

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• Items ordered, delivery instructions, and preferences.</Text>

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• History of previous orders, so we can provide a personalized experience (e.g., suggesting frequently ordered items).</Text>

              
</View>


              <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
1.3 Usage Information
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                When you interact with our website or mobile app, we collect data that helps us understand how you use our services:
              
</Text>

              <View className="pl-2 mb-6">

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Device Information:</Text> The type of device, operating system, and browser you use.</Text>

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">IP Address and Location Data:</Text> For purposes such as delivering the best service, preventing fraud, and offering localized promotions or services.</Text>

              
</View>


              <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
1.4 Location Data
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                With your explicit permission, we may collect precise geolocation data from your mobile device or browser to:
              
</Text>

              <View className="pl-2 mb-6">

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• Facilitate accurate delivery services.</Text>

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• Provide location-based promotions or suggestions.</Text>

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• Optimize pickup experiences.</Text>

              
</View>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
You can control this by adjusting your device settings or browser permissions.
</Text>


              <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
1.5 Communication Data
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                When you contact us by phone, email, or via our website chat services, we may collect:
              
</Text>

              <View className="pl-2 mb-6">

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• Recordings or transcripts of your communication with our support team.</Text>

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• Feedback or survey responses to improve customer service.</Text>

              
</View>

            </View>

            <View>
              <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
2. How We Use Your Information
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                We primarily use your data to fulfill your orders, but also for various other purposes related to improving our services and customer experience. Specifically, your information is used for:
              
</Text>

              <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
2.1 Order Fulfillment and Service Delivery
</Text>

              <View className="pl-2 mb-6">

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Processing Orders:</Text> We use your personal information to process and complete orders.</Text>

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Home Delivery and Pickup:</Text> We rely on your location data and address to deliver your orders in a timely and efficient manner.</Text>

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Communications:</Text> We send confirmations, order updates, and alerts regarding the status of your delivery or pickup.</Text>

              
</View>

              <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
2.2 Customer Support and Interaction
</Text>

              <View className="pl-2 mb-6">

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• Responding to inquiries or complaints via phone, email, or other communication channels.</Text>

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• Managing any feedback or reviews you may leave on our website or social media platforms.</Text>

              
</View>

              <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
2.3 Personalization and Enhancements
</Text>

              <View className="pl-2 mb-6">

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">User Experience:</Text> We use your previous order history and preferences to provide personalized recommendations and promotions.</Text>

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Marketing Communications:</Text> With your consent, we may send you promotional materials or special offers. You can unsubscribe at any time by using the “unsubscribe” link in our emails or by contacting customer support.</Text>

              
</View>

              <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
2.4 Security and Fraud Prevention
</Text>

              <View className="pl-2 mb-6">

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Fraud Detection:</Text> We monitor transactions and activities for suspicious behavior to protect your data and prevent unauthorized access.</Text>

                  <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Legal Compliance:</Text> We process your data when required by law or to enforce our legal rights.</Text>

              
</View>

               <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
2.5 Improving Our Services
</Text>

               <View className="pl-2 mb-6">

                    <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• We analyze usage data to enhance our website, app, and services. This includes:</Text>

                    <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• Debugging issues and improving system performance.</Text>

                    <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• A/B testing new features and layout designs to improve customer experience.</Text>

                    <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• Identifying patterns and trends in customer behavior.</Text>

                
</View>

            </View>

            <View>
              <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
3. Sharing Your Information
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
We respect your privacy and only share your data in the following circumstances:
</Text>

                <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
3.1 Service Providers and Partners
</Text>

                <View className="pl-2 mb-6">

                    <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• We work with trusted third-party service providers that perform functions such as website hosting and data analytics.</Text>

                
</View>

                <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
These service providers have access to your personal data only to perform specific tasks on our behalf and are obligated to maintain the confidentiality and security of your information.
</Text>

                <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
3.2 Legal Obligations
</Text>

                <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
We may share your data if required to comply with legal processes, enforce agreements, or protect the rights, property, or safety of Bumba's Kitchen, our customers, or others. This includes cooperating with law enforcement or addressing claims or disputes.
</Text>

                <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
3.3 Business Transfers
</Text>

                <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
If Bumba's Kitchen is involved in a merger, acquisition, or asset sale, your information may be transferred as part of that transaction. You will be notified if your data becomes subject to a new privacy policy due to a business transfer.
</Text>

            </View>
            
            <View>
                <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
4. Data Security
</Text>

                <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
We take the security of your information seriously and implement a range of technical and organizational measures to protect your personal data from unauthorized access, loss, or misuse. These measures include:
</Text>

                <View className="pl-2 mb-6">

                    <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Encryption:</Text> We use SSL encryption for sensitive data transmissions.</Text>

                    <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Access Controls:</Text> Only authorized personnel have access to your personal data, and they are bound by confidentiality agreements.</Text>

                    <Text className="text-[13px] text-gray-500 mb-1 leading-relaxed">• <Text className="font-bold text-gray-700">Data Minimization:</Text> We collect only the information needed for the specific purposes outlined in this policy.</Text>

                
</View>

                <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
Despite these precautions, no system is completely secure. We encourage you to take steps to protect your information, such as using strong passwords and not sharing your account information.
</Text>

            </View>

            <View>
                <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
5. Your Rights and Choices
</Text>

                <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
You have several rights regarding your personal information. These rights include:
</Text>

                <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
5.1 Access and Correction
</Text>

                <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
You can request access to the personal data we hold about you and ask that we correct any inaccuracies. If you have an account with us, you may also update your information directly by logging in.
</Text>

                <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
5.2 Deletion
</Text>

                <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
You can request that we delete your personal information, including your account and associated data, subject to certain legal obligations (e.g., retention for tax or regulatory purposes). <Link href="/delete-account" className="text-primary hover:underline font-medium">Click here to request account deletion</Link>.
</Text>

                <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
5.3 Opt-Out of Marketing Communications
</Text>

                <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
You can opt out of receiving promotional communications (such as SMS) at any time by contacting us directly.
</Text>

                <Text className="text-sm font-bold text-gray-800 mt-2 mb-1">
5.4 Data Portability
</Text>

                <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
Where applicable, you can request a copy of your personal data in a machine-readable format to transfer it to another service.
</Text>

            </View>

            <View>
              <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
6. Cookies and Tracking Technologies
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                We use cookies and other tracking technologies to enhance your experience on our website and app. Cookies help us understand your preferences, track your orders, and improve our services.
              
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">
You can control the use of cookies through your browser settings. However, disabling cookies may affect your ability to use certain features of our site.
</Text>

            </View>
            
            <View>
              <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
7. Data Retention
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected, or to comply with legal, regulatory, or reporting obligations. When your data is no longer needed, we will securely delete or anonymize it.
              
</Text>

            </View>

            <View>
              <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
8. Children's Privacy
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                Bumba's Kitchen does not knowingly collect or store personal information from children under the age of 16. If you believe that a child under 16 has provided us with personal information, please contact us, and we will take appropriate steps to remove such information.
              
</Text>

            </View>

            <View>
              <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
9. International Data Transfers
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                If you are located outside the region where our services are offered, please note that your information may be transferred to and processed in a country that may not have the same data protection laws as your jurisdiction. However, we take steps to ensure your privacy is protected in compliance with applicable laws.
              
</Text>

            </View>

            <View>
              <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
10. Changes to This Policy
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                We may update this Privacy Policy periodically to reflect changes in our practices, technologies, or legal requirements. We will notify you of significant changes by posting the updated policy on our website and updating the effective date. We encourage you to review this policy regularly to stay informed.
              
</Text>

            </View>

            <View>
              <Text className="text-base font-bold text-gray-900 mt-2 mb-2">
11. Contact Us
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please contact us at:
              
</Text>

              <Text className="text-[13px] text-gray-500 mb-6 leading-relaxed">

                Bumba's Kitchen
                Address: Janai , Garbagan , Hooghly
                Email: info.bumbaskitchen@gmail.com
                Phone: +91 82406 90254
              
</Text>

            </View>
          
      </ScrollView>
    </View>
  );
}
