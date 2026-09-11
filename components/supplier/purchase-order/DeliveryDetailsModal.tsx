import React from 'react'
import { Modal, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { Calendar, MapPin, Phone, UserRound, X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { LocationMapPreview } from '@/components/LocationMapPreview'

type DeliveryDetails = {
  scheduledDate?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  recipientName?: string | null
  recipientContact?: string | null
  driverName?: string | null
  driverContact?: string | null
  notes?: string | null
}

interface DeliveryDetailsModalProps {
  visible: boolean
  onClose: () => void
  delivery: DeliveryDetails
  requestedDate?: string | null
  supplierExpectedDeliveryAt?: string | null
  deliveryDateAgreementStatus?: string | null
}

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
  : 'Not set'

const agreementLabel = (status?: string | null) => {
  if (status === 'AGREED') return 'Agreed by buyer and supplier'
  if (status === 'PENDING_BUYER') return 'Awaiting buyer approval'
  return 'Awaiting supplier confirmation'
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value?: string | null }) {
  const { colors } = useTheme()
  if (!value) return null
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Icon size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{value}</Text>
      </View>
    </View>
  )
}

export function DeliveryDetailsModal({
  visible,
  onClose,
  delivery,
  requestedDate,
  supplierExpectedDeliveryAt,
  deliveryDateAgreementStatus,
}: DeliveryDetailsModalProps) {
  const { colors } = useTheme()
  const { width, height: windowHeight } = useWindowDimensions()
  const isDesktop = width >= 900
  const mapHeight = isDesktop ? Math.min(520, windowHeight - 150) : Math.max(260, Math.min(420, windowHeight * 0.42))

  const detailsContent = (
    <View style={{ padding: 20, gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Delivery details</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{agreementLabel(deliveryDateAgreementStatus)}</Text>
      </View>
      <DetailRow icon={Calendar} label="Buyer requested delivery" value={formatDate(requestedDate ?? delivery.scheduledDate)} />
      <DetailRow icon={Calendar} label="Supplier committed delivery" value={supplierExpectedDeliveryAt ? formatDate(supplierExpectedDeliveryAt) : undefined} />
      <DetailRow icon={MapPin} label="Delivery location" value={delivery.address ?? undefined} />
      <DetailRow icon={UserRound} label="Recipient" value={delivery.recipientName ?? undefined} />
      <DetailRow icon={Phone} label="Recipient contact" value={delivery.recipientContact ?? undefined} />
      <DetailRow icon={UserRound} label="Driver" value={delivery.driverName ?? undefined} />
      <DetailRow icon={Phone} label="Driver contact" value={delivery.driverContact ?? undefined} />
      <DetailRow icon={MapPin} label="Coordinates" value={delivery.latitude != null && delivery.longitude != null ? `${delivery.latitude.toFixed(6)}, ${delivery.longitude.toFixed(6)}` : undefined} />
      {delivery.notes ? (
        <View style={{ gap: 5 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Delivery instructions</Text>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{delivery.notes}</Text>
        </View>
      ) : null}
    </View>
  )

  const details = isDesktop ? (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>{detailsContent}</ScrollView>
  ) : detailsContent

  const map = (
    <View style={{ flex: 1, padding: isDesktop ? 20 : 16, paddingTop: isDesktop ? 20 : 0 }}>
      <LocationMapPreview lat={delivery.latitude ?? undefined} lng={delivery.longitude ?? undefined} address={delivery.address ?? undefined} colors={colors} height={mapHeight} interactive />
    </View>
  )

  return (
    <Modal visible={visible} animationType="slide" transparent={isDesktop} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: isDesktop ? '#00000066' : colors.background, alignItems: 'center', justifyContent: 'center', padding: isDesktop ? 24 : 0 }}>
        <View style={{ width: isDesktop ? Math.min(1080, width - 48) : '100%', height: isDesktop ? Math.min(680, windowHeight - 48) : '100%', backgroundColor: colors.surface, borderRadius: isDesktop ? 18 : 0, overflow: 'hidden' }}>
          <View style={{ minHeight: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Delivery location</Text>
            <TouchableOpacity accessibilityLabel="Close delivery details" onPress={onClose} style={{ padding: 8, marginRight: -8 }}><X size={21} color={colors.text} /></TouchableOpacity>
          </View>
          {isDesktop ? (
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flex: 4, borderRightWidth: 1, borderRightColor: colors.border }}>{details}</View>
              <View style={{ flex: 6 }}>{map}</View>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
              {map}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, minHeight: 360 }}>{details}</View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}
