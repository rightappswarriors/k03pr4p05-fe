import React from 'react'
import { View, Text } from 'react-native'
import { TrendingDown, Calendar, AlertTriangle } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { InventoryForecast } from '@/services/supplierService/supplierInventoryService'

function Row({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
    const { colors } = useTheme()
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
            <Icon size={15} color={color ?? colors.textSecondary} />
            <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{label}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: color ?? colors.text }}>{value}</Text>
        </View>
    )
}

export function ForecastCard({ forecast }: { forecast: InventoryForecast }) {
    const { colors } = useTheme()

    if (!forecast.hasData) {
        return (
            <View style={{ padding: 24, alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 12 }}>
                <TrendingDown size={24} color={colors.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Not enough sales data yet</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
                    Forecasting needs at least one recorded sale in the last 30 days.
                </Text>
            </View>
        )
    }

    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16 }}>
            {forecast.isLowStockPredicted && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F59E0B15', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                    <AlertTriangle size={15} color="#F59E0B" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B' }}>Predicted to hit low stock soon</Text>
                </View>
            )}
            <Row icon={TrendingDown} label="Avg. Daily Consumption" value={forecast.avgDailyConsumption != null ? forecast.avgDailyConsumption.toFixed(1) : '—'} />
            <Row icon={Calendar} label="Estimated Days Remaining" value={forecast.daysRemaining != null ? `${Math.round(forecast.daysRemaining)} days` : '—'} color={forecast.daysRemaining != null && forecast.daysRemaining < 7 ? '#EF4444' : undefined} />
            <Row icon={Calendar} label="Expected Stockout Date" value={forecast.expectedStockoutDate ? new Date(forecast.expectedStockoutDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'} />
            <Row icon={Calendar} label="Suggested Reorder Qty" value={forecast.suggestedReorderQty != null ? String(forecast.suggestedReorderQty) : 'Set a reorder level to enable'} />
            <Row icon={Calendar} label="Suggested Reorder Date" value={forecast.suggestedReorderDate ? new Date(forecast.suggestedReorderDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'} />
        </View>
    )
}