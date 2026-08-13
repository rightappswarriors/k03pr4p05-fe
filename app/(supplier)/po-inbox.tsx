import React, { useState } from 'react'
import { View } from 'react-native'
import POInboxScreen from '@/screens/supplier/POInboxScreen'
import { RFQDetailScreen } from '@/screens/supplier/RFQDetailScreen'

export default function POInboxRoute() {
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null)

  const handleRfqPress = (rfqId: string) => {
    setSelectedRfqId(rfqId)
  }

  const handlePOCreated = (_poId: string, _poNumber: string) => {
    setSelectedRfqId(null)
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

  return <POInboxScreen onRfqPress={handleRfqPress} />
}
