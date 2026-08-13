// Metro (the RN bundler) resolves `DateTimePicker.native.tsx` / `DateTimePicker.web.tsx`
// automatically for `@/components/DateTimePicker` at build time — but the TypeScript
// language server/compiler doesn't know that convention on its own. This tells it,
// scoped to just this one module specifier, so it doesn't affect resolution for any
// other package (unlike a global `moduleSuffixes` tsconfig setting).
declare module '@/components/DateTimePicker' {
  import type { ComponentType } from 'react'
  import type { DateTimePickerProps } from '@/components/DateTimePicker.types'

  const DateTimePicker: ComponentType<DateTimePickerProps>
  export default DateTimePicker

  export type {
    DateTimePickerMode,
    DateTimePickerDisplay,
    DateTimePickerChangeEvent,
    DateTimePickerProps,
  } from '@/components/DateTimePicker.types'
}