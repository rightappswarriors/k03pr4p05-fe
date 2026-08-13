import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import type { DateTimePickerMode, DateTimePickerProps } from '@/types/DateTimePicker.types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Format a Date into the value shape the corresponding <input type="..."> expects.
function toInputValue(date: Date, mode: DateTimePickerMode): string {
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const min = pad(date.getMinutes())

  if (mode === 'time') return `${h}:${min}`
  if (mode === 'datetime') return `${y}-${m}-${d}T${h}:${min}`
  return `${y}-${m}-${d}`
}

export default function DateTimePicker({
  value,
  mode = 'date',
  onChange,
  minimumDate,
  maximumDate,
  style,
}: DateTimePickerProps) {
  const { colors } = useTheme()

  const inputType = mode === 'time' ? 'time' : mode === 'datetime' ? 'datetime-local' : 'date'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (!raw) return

    let next: Date
    if (mode === 'time') {
      const [h, m] = raw.split(':').map(Number)
      next = new Date(value)
      next.setHours(h, m, 0, 0)
    } else {
      next = new Date(raw)
    }

    if (Number.isNaN(next.getTime())) return
    onChange({ type: 'set' }, next)
  }

  return (
    <input
      type={inputType}
      value={toInputValue(value, mode)}
      min={minimumDate ? toInputValue(minimumDate, mode) : undefined}
      max={maximumDate ? toInputValue(maximumDate, mode) : undefined}
      onChange={handleChange}
      style={{
        width: '100%',
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 14,
        fontFamily: 'inherit',
        color: colors.text,
        backgroundColor: colors.background,
        outline: 'none',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  )
}

export type {
  DateTimePickerMode,
  DateTimePickerDisplay,
  DateTimePickerChangeEvent,
  DateTimePickerProps,
} from '@/types/DateTimePicker.types'