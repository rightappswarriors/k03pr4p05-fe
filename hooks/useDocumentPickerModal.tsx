import React, { useCallback, useRef, useState } from 'react'
import { ActionModal, ActionOption } from '@/components/ActionModal'
import { useImagePicker, type PickedFile } from './useImagePicker'

interface UseDocumentPickerModalOptions {
  /** Add a third "Choose Document" option, e.g. expo-document-picker */
  onPickOther?: () => Promise<PickedFile | null>
  otherLabel?: string
}

/**
 * Drives ActionModal + useImagePicker together and exposes a single
 * `pickFile()` that resolves to a uri (or null) — same shape as the
 * `onPickFile` prop on DocumentRequirementCard. Render the returned
 * `modal` element once, anywhere in the tree, alongside your screen.
 *
 *   const { pickFile, modal } = useDocumentPickerModal()
 *   <DocumentRequirementCard onPickFile={pickFile} ... />
 *   {modal}
 */
export function useDocumentPickerModal({ onPickOther, otherLabel }: UseDocumentPickerModalOptions = {}) {
  const [visible, setVisible] = useState(false)
  const resolverRef = useRef<((value: PickedFile | null) => void) | null>(null)
  const chosenRef = useRef(false)
  const { pickImage, takePhoto } = useImagePicker()

  const pickFile = useCallback((): Promise<PickedFile | null> => {
    chosenRef.current = false
    setVisible(true)
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = (value: PickedFile | null) => {
    resolverRef.current?.(value)
    resolverRef.current = null
  }

  const options: ActionOption[] = [
    {
      label: 'Take Photo',
      icon: 'camera-outline',
      onPress: async () => {
        chosenRef.current = true
        settle(await takePhoto())
      },
    },
    {
      label: 'Choose from Library',
      icon: 'image-outline',
      onPress: async () => {
        chosenRef.current = true
        settle(await pickImage())
      },
    },
    ...(onPickOther
      ? [
          {
            label: otherLabel ?? 'Choose Document',
            icon: 'document-outline',
            onPress: async () => {
              chosenRef.current = true
              settle(await onPickOther())
            },
          } as ActionOption,
        ]
      : []),
  ]

  const handleClose = () => {
    setVisible(false)
    // Only resolve here for a backdrop dismiss with nothing picked —
    // if an option ran, it already called settle() before this fires.
    if (!chosenRef.current) settle(null)
  }

  const modal = (
    <ActionModal
      visible={visible}
      title="Add Document"
      description="Choose how you'd like to add this file"
      options={options}
      onClose={handleClose}
    />
  )

  return { pickFile, modal }
}