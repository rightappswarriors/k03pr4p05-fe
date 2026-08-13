// components/DateRangePickerModal.tsx
import React, { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Platform, TextInput
} from 'react-native'
import { Calendar, X, ChevronRight } from 'lucide-react-native'
import { formatShortDate } from '@/utils/dateHelpers'

// Conditionally import DateTimePicker only on native
let DateTimePicker: any = null
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default
}

interface Props {
  visible: boolean
  onClose: () => void
  onApply: (startDate: Date, endDate: Date) => void
  initialStart?: Date
  initialEnd?: Date
}

// Helper: Date → "YYYY-MM-DD" for <input type="date">
function toInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Helper: "YYYY-MM-DD" → Date
function fromInputValue(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Web-only date input rendered via dangerouslySetInnerHTML equivalent
function WebDateInput({
  value,
  max,
  onChange,
  active,
}: {
  value: Date
  max: Date
  onChange: (date: Date) => void
  active: boolean
}) {
  // React Native Web supports passing style as object to View,
  // and we can render a raw <input> via a web-specific trick
  if (Platform.OS !== 'web') return null

  return (
    <input
      type="date"
      value={toInputValue(value)}
      max={toInputValue(max)}
      onChange={(e) => {
        if (e.target.value) onChange(fromInputValue(e.target.value))
      }}
      style={{
        marginTop: 8,
        padding: '10px 12px',
        fontSize: 14,
        borderRadius: 10,
        border: active ? '1.5px solid #2563EB' : '1.5px solid #E5E7EB',
        backgroundColor: active ? '#EFF6FF' : 'white',
        width: '100%',
        boxSizing: 'border-box',
        color: '#1F2937',
        outline: 'none',
        cursor: 'pointer',
      }}
    />
  )
}

export default function DateRangePickerModal({
  visible, onClose, onApply, initialStart, initialEnd
}: Props) {
  const today = new Date()

  const [startDate, setStartDate] = useState<Date>(initialStart ?? today)
  const [endDate, setEndDate] = useState<Date>(initialEnd ?? today)
  // Only used on native (controls which picker is open)
  const [pickingFor, setPickingFor] = useState<'start' | 'end' | null>(null)

  const handleApply = () => {
    if (startDate > endDate) {
      onApply(endDate, startDate)
    } else {
      onApply(startDate, endDate)
    }
    onClose()
  }

  const handleNativeDateChange = (_: any, selected?: Date) => {
    if (!selected) return
    if (Platform.OS === 'android') setPickingFor(null)

    if (pickingFor === 'start') {
      const s = new Date(selected)
      s.setHours(0, 0, 0, 0)
      setStartDate(s)
    } else {
      const e = new Date(selected)
      e.setHours(23, 59, 59, 999)
      setEndDate(e)
    }
  }

  const handleWebStartChange = (date: Date) => {
    const s = new Date(date)
    s.setHours(0, 0, 0, 0)
    setStartDate(s)
  }

  const handleWebEndChange = (date: Date) => {
    const e = new Date(date)
    e.setHours(23, 59, 59, 999)
    setEndDate(e)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Calendar size={18} color="#2563EB" />
              <Text style={styles.headerTitle}>Select Date Range</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {Platform.OS === 'web' ? (
            // ── Web: two always-visible date inputs ──
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateBoxLabel}>From</Text>
                <WebDateInput
                  value={startDate}
                  max={today}
                  onChange={handleWebStartChange}
                  active={false}
                />
              </View>

              <ChevronRight size={16} color="#9CA3AF" style={{ marginTop: 20 }} />

              <View style={{ flex: 1 }}>
                <Text style={styles.dateBoxLabel}>To</Text>
                <WebDateInput
                  value={endDate}
                  max={today}
                  onChange={handleWebEndChange}
                  active={false}
                />
              </View>
            </View>
          ) : (
            // ── Native: tap-to-open boxes ──
            <>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.dateBox, pickingFor === 'start' && styles.dateBoxActive]}
                  onPress={() => setPickingFor(pickingFor === 'start' ? null : 'start')}
                >
                  <Text style={styles.dateBoxLabel}>From</Text>
                  <Text style={styles.dateBoxValue}>{formatShortDate(startDate)}</Text>
                </TouchableOpacity>

                <ChevronRight size={16} color="#9CA3AF" />

                <TouchableOpacity
                  style={[styles.dateBox, pickingFor === 'end' && styles.dateBoxActive]}
                  onPress={() => setPickingFor(pickingFor === 'end' ? null : 'end')}
                >
                  <Text style={styles.dateBoxLabel}>To</Text>
                  <Text style={styles.dateBoxValue}>{formatShortDate(endDate)}</Text>
                </TouchableOpacity>
              </View>

              {pickingFor !== null && DateTimePicker && (
                <DateTimePicker
                  value={pickingFor === 'start' ? startDate : endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  maximumDate={today}
                  onChange={handleNativeDateChange}
                />
              )}
            </>
          )}

          {/* Validation warning */}
          {startDate > endDate && (
            <Text style={styles.warning}>⚠️ Start date is after end date — they will be swapped.</Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
  },
  dateBoxActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  dateBoxLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  dateBoxValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  warning: {
    fontSize: 12,
    color: '#D97706',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: '600',
    color: '#6B7280',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  applyText: {
    fontWeight: '600',
    color: 'white',
  },
})