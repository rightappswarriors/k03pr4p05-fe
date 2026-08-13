import React from 'react'
import SupplierLinksScreen from './supplier/SupplierLinksScreen'

/** Retailer-facing supplier relationship workspace. */
export default function RetailerSupplierLinksScreen() {
  return <SupplierLinksScreen portal="retailer" />
}
