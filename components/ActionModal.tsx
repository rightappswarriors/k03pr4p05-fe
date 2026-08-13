import React, { useMemo } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/contexts/ThemeContext'

export interface ActionOption {
  label: string
  onPress: () => void | Promise<void>
  icon?: keyof typeof Ionicons.glyphMap
  destructive?: boolean
}

interface ActionModalProps {
  visible: boolean
  title?: string
  description?: string
  options: ActionOption[]
  onClose: () => void
  maxWidth?: number
  showCancel?: boolean
  cancelLabel?: string
}

/**
 * Generic action sheet. Pass 2–4 `options` and it lays them out with an
 * optional icon each. `onClose` fires both on backdrop tap AND after an
 * option finishes running — see useDocumentPickerModal.tsx for how to
 * tell those two cases apart when you need to.
 */
export function ActionModal({
  visible,
  title,
  description,
  options,
  onClose,
  maxWidth = 420,
  showCancel = true,
  cancelLabel = 'Cancel',
}: ActionModalProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* stopPropagation-style: swallow taps inside the card */}
        <Pressable style={[styles.card, { maxWidth }]} onPress={() => {}}>
          {(title || description) && (
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              {description && <Text style={styles.description}>{description}</Text>}
            </View>
          )}

          <View style={styles.options}>
            {options.map((option, index) => (
              <Pressable
                key={option.label}
                style={({ pressed }) => [
                  styles.option,
                  index < options.length - 1 && styles.optionBorder,
                  pressed && styles.optionPressed,
                ]}
                onPress={async () => {
                  // Run the action first, THEN close — closing first would
                  // race the caller's own promise resolution.
                  await option.onPress()
                  onClose()
                }}
              >
                {option.icon && (
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={option.destructive ? colors.error : colors.text}
                    style={styles.optionIcon}
                  />
                )}
                <Text style={[styles.optionLabel, option.destructive && { color: colors.error }]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {showCancel && (
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelLabel}>{cancelLabel}</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    options: {
      paddingHorizontal: 20,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
    },
    optionBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionPressed: {
      opacity: 0.6,
    },
    optionIcon: {
      marginRight: 12,
    },
    optionLabel: {
      fontSize: 15,
      color: colors.text,
    },
    cancel: {
      marginTop: 12,
      marginHorizontal: 20,
      marginBottom: 20,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.sidebarMuted,
      alignItems: 'center',
    },
    cancelLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
  })
}