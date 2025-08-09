import React from 'react'
import { useAuth} from '@/contexts/AuthContext'
import POSScreen from '../../components/pos/Pos'

//import LoadingScreen from '@/components/dashboard/LoadingScreen'

export default function MainScreen(){
  const { user, isLoading } = useAuth() 

  // if (isLoading || !user) return <LoadingScreen title={user?.role === 'owner'?'Dasboard' : 'POS Screen'}/>;
  // user.role === 'owner' ? <DashboardScreen/> : 
  return <POSScreen/>;
}

