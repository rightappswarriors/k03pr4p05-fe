import React from 'react'
import RNDateTimePicker from '@react-native-community/datetimepicker'
import type { DateTimePickerProps } from '@/types/DateTimePicker.types'

export default function DateTimePicker(props: DateTimePickerProps) {
  return <RNDateTimePicker {...props} />
}

export type {
  DateTimePickerMode,
  DateTimePickerDisplay,
  DateTimePickerChangeEvent,
  DateTimePickerProps,
} from '@/types/DateTimePicker.types'