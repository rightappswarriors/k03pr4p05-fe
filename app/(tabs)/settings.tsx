import Settings from "@/components/Settings"
import { usePOS } from "@/contexts/POSContext"
import React from 'react'

export default function SettingsScreen() {
  const { outlet } = usePOS()
  return <Settings outletId={Number(outlet?.id)}/>
}