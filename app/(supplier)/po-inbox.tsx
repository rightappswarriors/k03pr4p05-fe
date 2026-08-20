import React, { useState } from 'react'
import { View } from 'react-native'
import POInboxScreen from '@/screens/supplier/POInboxScreen'
import { RFQDetailScreen } from '@/screens/supplier/RFQDetailScreen'
import PODetailScreen from '@/screens/supplier/PODetailScreen'

export default function POInboxRoute() {
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null)
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null)

  const handleRfqPress = (rfqId: string) => {
    setSelectedRfqId(rfqId)
  }

  const handlePoPress = (poId: string) => {
    setSelectedPoId(poId)
  }

  const handlePOCreated = (_poId: string, _poNumber: string) => {
    setSelectedRfqId(null)
  }

  const handlePoAccepted = () => {
    // Optionally refresh or show a toast
  }

  const handlePoRejected = () => {
    // Optionally refresh or show a toast
  }

  if (selectedRfqId) {
    return (
      <View style={{ flex: 1 }}>
        <RFQDetailScreen
          rfqId={selectedRfqId}
          onBack={() => setSelectedRfqId(null)}
          onPOCreated={handlePOCreated}
        />
      </View>
    )
  }

  if (selectedPoId) {
    return (
      <View style={{ flex: 1 }}>
        <PODetailScreen
          poId={selectedPoId}
          onBack={() => setSelectedPoId(null)}
          onAccepted={handlePoAccepted}
          onRejected={handlePoRejected}
        />
      </View>
    )
  }

  return (
    <POInboxScreen
      onRfqPress={handleRfqPress}
      onPoPress={handlePoPress}
    />
  )
}
