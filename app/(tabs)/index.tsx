import React from 'react'
import POSScreen from '../../components/pos/Pos'
import { CartProvider } from "@/contexts/POSContext"

import { Provider as PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { DisplayProvider } from '@/contexts/DisplayContext';
//import LoadingScreen from '@/components/dashboard/LoadingScreen'

export default React.memo(function MainScreen() {

  // if (isLoading || !user) return <LoadingScreen title={user?.role === 'owner'?'Dasboard' : 'POS Screen'}/>;
  // user.role === 'owner' ? <DashboardScreen/> : 
  return (
    
    <DisplayProvider>
    <PaperProvider>
      <GestureHandlerRootView className="flex-1">
        <CartProvider>
          <POSScreen />
        </CartProvider>
      </GestureHandlerRootView>
    </PaperProvider>
    
    </DisplayProvider>
  )
})

