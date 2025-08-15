import { ShoppingCart, History, Settings } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, useWindowDimensions, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
interface ResponsiveTabLayoutProps {
     children: React.ReactNode
     currentRoute: string
     onRouteChange: (route: string) => void
}

const TABS = [
     { name: 'index', title: 'POS', icon: ShoppingCart },
     { name: 'history', title: 'Orders', icon: History },
     { name: 'settings', title: 'Settings', icon: Settings },
]

export default function ResponsiveTab({ children, currentRoute, onRouteChange }: ResponsiveTabLayoutProps) {
     const { width } = useWindowDimensions()
     const isNotMobile = width >= 768
     const { colors } = useTheme()
     if (isNotMobile) {
          return (
               <View style={[styles.desktopContainer, {backgroundColor: colors.background}]}>
                    <View style={[styles.sidebar, { borderColor: colors.border}]}>
                         {TABS.map((tab) => {
                              const IconComponent = tab.icon
                              const isActive = currentRoute === tab.name

                              return (
                                   <TouchableOpacity key={tab.name}
                                        style={[styles.sidebarTab, isActive && styles.sidebarTabActive]}
                                        onPress={()=> onRouteChange(tab.name)}
                                   >
                                        <IconComponent
                                             size={20}
                                             color={isActive ? '#2563EB' :
                                                  '#6b7280'
                                             }
                                        />
                                   </TouchableOpacity>
                              )
                         })}
                    </View>
                    <View style={styles.desktopContent}>
                         {children}
                    </View>
               </View>
          )
     }
     return (
          <View style={styles.mobileContainer}>
               <View style={styles.mobileContent}>
                    {children}
               </View>
               <View style={[styles.bottomBar, {backgroundColor: colors.background}]}>
                    {TABS.map((tab) => {
                         const IconComponent = tab.icon
                         const isActive = currentRoute === tab.name
                         return (
                              <TouchableOpacity
                                   key={tab.name}
                                   style={styles.bottomTab}
                                   onPress={()=> onRouteChange(tab.name)}
                              >
                                   <IconComponent
                                        size={20}
                                        color={isActive ? '#2563EB' : '#6B7280'}
                                   />
                                   <Text style={[styles.bottomTabText, isActive && styles.bottomTabTextActive]}>
                                        {tab.title}
                                   </Text>
                              </TouchableOpacity>
                         )
                    })}
               </View>
          </View>
     )
}

const styles = StyleSheet.create({
     desktopContainer: {
          flex: 1,
          flexDirection: 'row'
     },
     sidebar: {
          width: 55,
          borderRightWidth: 1,
          paddingVertical: 20,
          alignItems: 'center',
          gap: 16
     },
     sidebarTab: {
          width: 40,
          height: 40,
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
     },
     sidebarTabActive: {
          backgroundColor: '#EBF4FF10',
          borderWidth: 2,
          borderColor: '#2563EB'
     },
     desktopContent: {
          flex: 1
     },
     mobileContainer: {
          flex: 1
     },
     mobileContent: {
          flex: 1
     },
     bottomBar: {
          flexDirection: 'row',
          backgroundColor: 'white',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 70
     },
     bottomTab: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4
     },
     bottomTabText: {
          fontSize: 12,
          fontWeight: '500',

     },
     bottomTabTextActive: {
          color: '#2563EB'
     }
})