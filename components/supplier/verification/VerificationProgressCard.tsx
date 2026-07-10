import React, { useEffect, useRef } from 'react'
import { View, Text, Animated } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { DashboardCard } from '@/screens/supplier/SupplierDashboardScreen'
import { FadeInView } from '@/components/supplier/FadeInView'

export function VerificationProgressCard({
  approvedCount,
  requiredCount,
  progressPct,
}: {
  approvedCount: number
  requiredCount: number
  progressPct: number
}) {
  const { colors } = useTheme()
  const widthAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progressPct,
      duration: 600,
      useNativeDriver: false, // width isn't a transform-friendly prop
    }).start()
  }, [progressPct, widthAnim])

  const barColor = progressPct >= 100 ? '#059669' : progressPct >= 50 ? '#2563EB' : '#D97706'

  return (
    <FadeInView delay={60}>
      <DashboardCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Verification Progress</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: barColor }}>{Math.round(progressPct)}%</Text>
        </View>

        <View style={{ height: 10, borderRadius: 6, backgroundColor: colors.background, overflow: 'hidden' }}>
          <Animated.View
            style={{
              height: '100%',
              borderRadius: 6,
              backgroundColor: barColor,
              width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            }}
          />
        </View>

        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
          {approvedCount} of {requiredCount} required documents approved
        </Text>
      </DashboardCard>
    </FadeInView>
  )
}