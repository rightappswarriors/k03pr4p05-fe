import React from 'react'
import POSScreen from '../../components/pos/Pos'
import {CartProvider} from "@/contexts/POSContext"
//import LoadingScreen from '@/components/dashboard/LoadingScreen'

export default React.memo( function MainScreen(){

  // if (isLoading || !user) return <LoadingScreen title={user?.role === 'owner'?'Dasboard' : 'POS Screen'}/>;
  // user.role === 'owner' ? <DashboardScreen/> : 
  return (
    <CartProvider>
      <POSScreen/>
    </CartProvider>
  )
})

