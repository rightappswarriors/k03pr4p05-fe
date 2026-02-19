import React from 'react'
import POSScreen from '../../components/pos/Pos'
import { CartProvider } from "@/contexts/POSContext"
import { Platform } from "react-native"
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { DisplayProvider } from '@/contexts/DisplayContext';
import { useAuth } from '@/hooks/useAuth'
import DashboardScreen from '@/components/ManagerDashboard'
//import LoadingScreen from '@/components/dashboard/LoadingScreen'

export default React.memo(function MainScreen() {
  const { user, isLoading } = useAuth();
  // if (isLoading || !user) return <LoadingScreen title={user?.role === 'owner'?'Dasboard' : 'POS Screen'}/>;
  // user.role === 'owner' ? <DashboardScreen/> : 
  return (

    <DisplayProvider>
      {Platform.OS !== "web" ? (
        <GestureHandlerRootView className="flex-1">
          <CartProvider>
            {user?.role === 'MANAGER' || user?.role === "OWNER" ? <DashboardScreen />: <POSScreen /> }

          </CartProvider>
        </GestureHandlerRootView>
      ) : (
        <CartProvider>
          <POSScreen />
        </CartProvider>
      )}

    </DisplayProvider>
  )
})

