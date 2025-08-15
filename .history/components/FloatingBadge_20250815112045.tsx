import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
export default function FloatingBadge() {
     const [showDialog, setShowDialog] = useState(false);
     const { colors } = useTheme()
     return (
          <View style={[styles.floatingButton, { backgroundColor: colors.background}]}>
               <Text style={[styles.badgeText, { color: colors.text}]}>Powered by Right Apps</Text>
          </View>
     )
}



const styles = StyleSheet.create({
     floatingButton: {
          position: 'absolute',
          width: 160,
          height: 25,
          alignItems: 'center',
          justifyContent: 'center',
          right: 20,
          bottom: 10,
          backgroundColor: '#03A9F4',
          borderRadius: 30,
          elevation: 8, // for Android shadow
          shadowColor: '#000', // for iOS shadow
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          cursor: 'pointer'
     },
     badgeText: {
          fontSize: 12,
          fontWeight: 'bold',
     },
});