import { Alert } from 'react-native'

interface ConfirmActionOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}

/**
 * Standard confirm-before-mutating prompt. Use this anywhere an action
 * changes or removes data — Save Changes, Archive, Reject, Withdraw, etc. —
 * instead of calling Alert.alert directly, so the wording/behavior stays
 * consistent across the app.
 */
export function confirmAction({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmActionOptions) {
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ])
}