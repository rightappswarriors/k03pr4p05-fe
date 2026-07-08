import React, { useState } from 'react'
import { View } from 'react-native'
import POInboxScreen from '@/screens/supplier/POInboxScreen'
import PODetailScreen from '@/screens/supplier/PODetailScreen'

export default function POInboxRoute() {
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null)

  if (selectedPoId) {
    return (
      <View style={{ flex: 1 }}>
        <PODetailScreen
          poId={selectedPoId}
          onBack={() => setSelectedPoId(null)}
        />
      </View>
    )
  }

  return <POInboxScreen />
}
