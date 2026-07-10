import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { ShieldQuestion } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { withAlpha } from '@/utils/color'

export function EmptyVerificationState({ onStart }: { onStart: () => void }) {
    const { colors } = useTheme()

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
            <View
                style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: withAlpha(colors.primary, '14'),
                }}
            >
                <ShieldQuestion size={30} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>No verification started</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', maxWidth: 320 }}>
                Submit your business documents to get verified and appear in retailer searches.
            </Text>
            <TouchableOpacity
                onPress={onStart}
                style={{ marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }}
            >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Start Verification</Text>
            </TouchableOpacity>
        </View>
    )
}