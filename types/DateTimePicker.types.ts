export type DateTimePickerMode = 'date' | 'time' | 'datetime'
export type DateTimePickerDisplay = 'default' | 'spinner' | 'calendar' | 'clock' | 'inline'

export interface DateTimePickerChangeEvent {
  // Widened to `string` (rather than 'set' | 'dismissed') so this type stays
  // a superset of @react-native-community/datetimepicker's own event union,
  // which also includes values like 'neutralButtonPressed'. Narrowing this
  // breaks assignability in DateTimePicker.native.tsx, which forwards props
  // directly into the real native component.
  type: string
  nativeEvent?: unknown
}

export interface DateTimePickerProps {
  value: Date
  mode?: DateTimePickerMode
  display?: DateTimePickerDisplay
  onChange: (event: DateTimePickerChangeEvent, date?: Date) => void
  minimumDate?: Date
  maximumDate?: Date
  /** Optional style override — CSSProperties on web, ViewStyle-ish on native (passed through). */
  style?: Record<string, unknown>
}