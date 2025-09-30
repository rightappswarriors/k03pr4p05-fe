
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Image, ActivityIndicator, Platform } from 'react-native'

import { router } from 'expo-router'
// Auth
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
export default function SplashScreen() {
     const { colors } = useTheme()
     const { user, isLoading, isAuthenticated } = useAuth()
     const [ isDesktop, setIsDesktop] = useState(false)
     useEffect(() => {
          if (Platform.OS === 'web') setIsDesktop(true)
          if (!isLoading) {
               if (isAuthenticated && user) {
                    // Route based on the User role
                    router.replace('/(tabs)')
               } else {
                    router.replace('/login')
               }
          }
     }, [isLoading, isAuthenticated, user])

     return (
          
          <View style={[styles.container, { backgroundColor: colors.background}]}>
               <View style={styles.content}>
                    <Image source={{ uri: 'https://images.pexels.com/photos/30403369/pexels-photo-30403369.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' }}
                         style={styles.logo}
                    />
                    <Text style={[styles.title, { color:colors.text}]}>Right Apps</Text>
                    <Text style={[styles.subtitle, {color:colors.textSecondary}]}>POS Vine</Text>
                    <View style={styles.loadingContainer}>
                         <ActivityIndicator size='large' color='#3B82F6' />
                         <Text style={[styles.loadingText, {color:colors.textSecondary}]}> Loading...</Text>
                    </View>
               </View>
          </View>
     )
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: '#1F2937',
          justifyContent: 'center',
          alignItems: 'center'
     },
     content: {
          alignItems: 'center'
     },
     logo: {
          width: 120,
          height: 120,
          borderRadius: 60,
          marginBottom: 24,
     },
     title: {
          fontSize: 24,
          fontWeight: '800',
          color: 'white',
          marginBottom: 8
     },
     subtitle: {
          fontSize: 16,
          color: '#9CA3AF',
          marginBottom: 48
     },
     loadingContainer: {
          alignItems: 'center',
          gap: 12
     },
     loadingText: {
          fontSize: 14,
          color: '#6B7280'
     }
})