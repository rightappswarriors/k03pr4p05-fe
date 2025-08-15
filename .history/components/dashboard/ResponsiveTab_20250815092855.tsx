import { ShoppingCart, History } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, useWindowDimensions, Text, TouchableOpacity} from 'react-native'

interface ResponsiveTabLayoutProps {
     children : React.ReactNode
     currentRoute: string
     onRouteChange: (route: string) => void
}

const TABS = [
     { name: 'index', title: 'POS', icon: ShoppingCart},
     { name: 'history', title: 'Orders', icon: History},
     { name: 'printer', title: 'Orders', icon: History},
     { name: 'settings', title: 'Settings', icon: History},
]
