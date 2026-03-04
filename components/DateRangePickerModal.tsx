// components/DateRangePickerModal.tsx
import React, { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Platform
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Calendar, X, ChevronRight } from 'lucide-react-native'
import { formatShortDate } from '@/utils/dateHelpers'

interface Props {
  visible: boolean
  onClose: () => void
  onApply: (startDate: Date, endDate: Date) => void
  initialStart?: Date
  initialEnd?: Date
}

export default function DateRangePickerModal({
  visible, onClose, onApply, initialStart, initialEnd
}: Props) {
  const today = new Date()

  const [startDate, setStartDate] = useState<Date>(initialStart ?? today)
  const [endDate, setEndDate] = useState<Date>(initialEnd ?? today)
  const [pickingFor, setPickingFor] = useState<'start' | 'end' | null>(null)

  const handleApply = () => {
    if (startDate > endDate) {
      // swap if user picked end before start
      onApply(endDate, startDate)
    } else {
      onApply(startDate, endDate)
    }
    onClose()
  }

  const handleDateChange = (_: any, selected?: Date) => {
    if (!selected) return
    if (Platform.OS === 'android') setPickingFor(null) // android closes itself

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

          {/* Date Row */}
          <View style={styles.dateRow}>
            {/* Start Date */}
            <TouchableOpacity
              style={[styles.dateBox, pickingFor === 'start' && styles.dateBoxActive]}
              onPress={() => setPickingFor(pickingFor === 'start' ? null : 'start')}
            >
              <Text style={styles.dateBoxLabel}>From</Text>
              <Text style={styles.dateBoxValue}>{formatShortDate(startDate)}</Text>
            </TouchableOpacity>

            <ChevronRight size={16} color="#9CA3AF" />

            {/* End Date */}
            <TouchableOpacity
              style={[styles.dateBox, pickingFor === 'end' && styles.dateBoxActive]}
              onPress={() => setPickingFor(pickingFor === 'end' ? null : 'end')}
            >
              <Text style={styles.dateBoxLabel}>To</Text>
              <Text style={styles.dateBoxValue}>{formatShortDate(endDate)}</Text>
            </TouchableOpacity>
          </View>

          {/* Native Picker */}
          {pickingFor !== null && (
            <DateTimePicker
              value={pickingFor === 'start' ? startDate : endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={today}
              onChange={handleDateChange}
            />
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