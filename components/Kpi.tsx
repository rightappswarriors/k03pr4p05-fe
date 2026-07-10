import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import { View, Text } from "react-native";
import { FadeInView } from "./supplier/FadeInView";
import { LucideIcon } from "lucide-react-native";



export function Kpis({ items }: { items: Array<React.ComponentProps<typeof InsightCard>> }) {
  return (
    <KpiGrid>
      {items.map((item, index) => (
        <View key={item.title} style={{ flexGrow: 1, flexBasis: 185, minWidth: 165 }}>
          <FadeInView delay={index * 25}><InsightCard {...item} /></FadeInView>
        </View>
      ))}
    </KpiGrid>
  )
}


export function InsightCard({ title, value, subtitle, icon: Icon, accent }: { title: string; value: string; subtitle?: string; icon: LucideIcon; accent: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, padding: 15, gap: 9, minHeight: 124 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: '800' }}>{title}</Text>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: `${accent}18`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={19} color={accent} />
        </View>
      </View>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900' }} numberOfLines={1}>{value}</Text>
      {subtitle ? <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{subtitle}</Text> : null}
    </View>
  )
}


export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{children}</View>
}
