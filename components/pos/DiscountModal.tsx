import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { RadioButton } from 'react-native-paper'
import { DiscountRadio } from './DiscountRadio'
import { DiscountType } from '@/types'
import { useTheme } from "@/contexts/ThemeContext"
import { X } from 'lucide-react-native'

interface DiscountModalType {
     isVisible: boolean
     onClose: () => void
     isDiscounted: boolean
     setIsDiscounted: () => void
     discountOption: DiscountType
     setDiscountOption: (value: DiscountType) => void
}
export default function DiscountModal({ isVisible, setIsDiscounted, onClose, isDiscounted, discountOption, setDiscountOption }: DiscountModalType) {
     const { colors } = useTheme()
     return (
          <Modal
               visible={isVisible}
               transparent
               animationType="fade"
               onRequestClose={() => {  // Android back button
                    onClose();
                    if (!discountOption || discountOption === "NONE") {
                         setIsDiscounted()
                    }
               }}
          >
               <View style={styles.overlay}>
                    <TouchableOpacity
                         style={StyleSheet.absoluteFillObject}
                         activeOpacity={1}
                         onPress={() => {   // tap outside to close
                              onClose();
                              if (!discountOption || discountOption === "NONE") {
                                   setIsDiscounted()
                              }
                         }}
                    />

                    <View style={[styles.modal, { backgroundColor: colors.card }]}>
                         <View className="flex flex-row justify-between bottom-1 align-center p-2">
                              <Text style={{ color: colors.text }}>Choose Discount</Text>
                              <TouchableOpacity onPress={() => {
                                   onClose();
                                   if (!discountOption || discountOption === "NONE") {
                                        setIsDiscounted()
                                   }
                              }}>
                                   <Text><X size={24} color={colors.textSecondary} /></Text>
                              </TouchableOpacity>
                         </View>

                         <RadioButton.Group
                              onValueChange={(value) => setDiscountOption(value as DiscountType)}
                              value={isDiscounted ? discountOption : "NONE"}
                         >
                              <View className="flex flex-row justify-evenly">
                                   <DiscountRadio label="None" value="NONE" disabled={!isDiscounted} />
                                   <DiscountRadio label="Promo" value="PROMO" disabled={!isDiscounted} />
                                   <DiscountRadio label="Senior" value="SENIOR" disabled={!isDiscounted} />
                                   <DiscountRadio label="PWD" value="PWD" disabled={!isDiscounted} />
                              </View>
                         </RadioButton.Group>
                    </View>
               </View>
          </Modal>

     )
}

const styles = StyleSheet.create({
     overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
     },
     modal: {
          backgroundColor: 'white',
          borderRadius: 16,
          width: '100%',
          maxWidth: 500,
          height: 'auto',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
     },
})
