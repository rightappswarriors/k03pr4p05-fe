import React, { useState } from 'react'
import { View } from 'react-native'
import CatalogScreen from '@/screens/supplier/CatalogScreen'
import SupplierItemFormScreen from '@/screens/supplier/SupplierItemFormScreen'

export default function CatalogRoute() {
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list')
  const [editItemId, setEditItemId] = useState<string | undefined>()

  if (mode === 'add') {
    return (
      <View style={{ flex: 1 }}>
        <SupplierItemFormScreen
          onSaved={() => setMode('list')}
          onCancel={() => setMode('list')}
        />
      </View>
    )
  }

  if (mode === 'edit' && editItemId) {
    return (
      <View style={{ flex: 1 }}>
        <SupplierItemFormScreen
          itemId={editItemId}
          onSaved={() => setMode('list')}
          onCancel={() => setMode('list')}
        />
      </View>
    )
  }

  return (
    <CatalogScreen
      onAddItem={() => setMode('add')}
      onEditItem={id => {
        setEditItemId(id)
        setMode('edit')
      }}
    />
  )
}
