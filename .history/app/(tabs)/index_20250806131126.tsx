import React from 'react'
import { useAuth} from '@/contexts/AuthContext'
import POSScreen from '../../components/pos/Pos'
import DashboardScreen from '@/components/dashboard/BranchesDashboard'
import LoadingScreen from '@/components/dashboard/LoadingScreen'

export default function MainScreen(){
  const { user, isLoading } = useAuth() 

  if (isLoading || !user) return <LoadingScreen title={user?.role === 'owner'?'Dasboard' : 'POS Screen'}/>;

  return user.role === 'owner' ? <DashboardScreen/> : <POSScreen/>;
}

