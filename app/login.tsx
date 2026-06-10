import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native'
import LoginScreenDefault from '@/components/login/LoginEmailPass'
import LoginSaved from '@/components/login/LoginSaved'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { USER_DATA_KEY } from '@/services/authService'
import { User } from '@/types'
import { useTheme } from '@/contexts/ThemeContext'
import { useLoading } from '@/contexts/LoadingContext'
export default function Login() {
  const { setLoading } = useLoading()
  const [savedUserExist, setSavedUserExist] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [ isDesktop, setIsDesktop] = useState(false)
  const { colors } = useTheme()
          
  useEffect(() => {
    if (Platform.OS === 'web') setIsDesktop(true)
    checkSavedUser()
  }, [])

  const checkSavedUser = async () => {
    try {
      setLoading(true)
      const userData = await AsyncStorage.getItem(USER_DATA_KEY)
      if (userData) {
        setSavedUserExist(true)
        setUser(JSON.parse(userData))
      } else {
        setSavedUserExist(false)
        setUser(null)
      }
    } catch (error) {
    } finally {
      setLoading(false)
      setIsInitializing(false) // Prevents flicker
    }
  }

  if (isInitializing) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background}]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return savedUserExist && user ? (
    <LoginSaved user={user} onRemoveUser={checkSavedUser}/>
  ) : (
    <LoginScreenDefault/>
  )
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
})
