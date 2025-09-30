// @/app/customer/QRCodeScreen
import { useAuth } from '@/contexts/AuthContext';
import QRCode from "@/components/pos/paymentMethod/QRCodeScreen"
import React from 'react'
import { SafeAreaView, View, Text } from 'react-native'
import Svg, { Path } from "react-native-svg";

export default function QRCodeScreen() {

     const { isAuthenticated } = useAuth();
     return (
          <>
               {isAuthenticated ? <QRCode /> : (
                    <SafeAreaView className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">

                         <View className="w-full max-w-sm">
                         // The modern "No Cashier" screen with a default background color.
                              <View className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl shadow-xl">
                                   <Svg
                                        width={80}
                                        height={80}
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="red"   // you can change this dynamically
                                        strokeWidth={2}
                                        style={{ marginBottom: 16 }}
                                   >
                                        <Path
                                             strokeLinecap="round"
                                             strokeLinejoin="round"
                                             d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                        />
                                   </Svg>
                                   <Text className="text-3xl font-bold text-gray-800">No Cashier Available</Text>
                                   <Text className="mt-2 text-gray-600">
                                        Please check back later or contact a store manager for assistance.
                                   </Text>
                              </View>

                         </View>
                    </SafeAreaView >
               )}
          </>
     );


}
