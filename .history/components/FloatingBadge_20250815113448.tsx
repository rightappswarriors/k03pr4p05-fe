import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive'
export default function FloatingBadge() {
     const [showDialog, setShowDialog] = useState(false);
     const { colors } = useTheme()
     const { isMobile } = useResponsive()
     return (
          <>
               {showDialog && (
                    <View style={[styles.dialogBox, , isMobile && { bottom: 80}]}>
                         <Text style={styles.dialogText}>Contact rightapps@gmail.com</Text>
                         <Text style={styles.dialogText}>Upgrade to the <Text style={styles.link}>Pro plan</Text> to Activate pro features.</Text>
                    </View>
               )}
               <TouchableOpacity
                    onPress={() => setShowDialog(!showDialog)}
                    activeOpacity={0.6}
               >
                    <View style={[styles.floatingButton, { backgroundColor: colors.background }, isMobile && { bottom: 50}]}>
                         <Text style={[styles.badgeText, { color: colors.text }]}>Powered by Right Apps</Text>
                    </View>
               </TouchableOpacity>
          </>
     )
}



const styles = StyleSheet.create({
     dialogBox: {
          position: 'absolute', // Position the dialog above the badge
          bottom: 40, // Adjust this value to position it correctly
          width: 200,
          right: 20,
          backgroundColor: 'white',
          borderRadius: 8,
          padding: 12,
          // Add a shadow and border for a tooltip effect
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
     },
     dialogText: {
          fontSize: 12,
          marginBottom: 4,
     },
     link: {
          color: '#007AFF', // A standard blue for links
          textDecorationLine: 'underline',
     },
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