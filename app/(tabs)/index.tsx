import React from 'react'
import POSScreen from '../../components/pos/Pos'
import { CartProvider } from "@/contexts/POSContext"
import { Platform } from "react-native"
import RootView from '@/components/ui/RootView'
// remove direct react-native-gesture-handler dependency for web
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
        <RootView style={{ flex: 1 }}>
          {user?.role === 'MANAGER' || user?.role === "OWNER" ? <DashboardScreen /> : <POSScreen />}
        </RootView>
      ) : (
        <POSScreen />
      )}

    </DisplayProvider>
  )
})

