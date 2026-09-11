// Kpi.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FadeInView } from './FadeInView';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InsightCardProps {
  title: string;
  value: string;
  subtitle?: string;
  subtitleColor?: string;
  valueFontSize?: number;
  icon?: LucideIcon;
  accent: string;
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {children}
    </View>
  );
}

// ─── Kpis (list wrapper) ────────────────────────────────────────────────────────

export function Kpis({ items }: { items: InsightCardProps[] }) {
  return (
    <KpiGrid>
      {items.map((item, index) => (
        <View key={`${item.title}-${index}`} style={{ flexGrow: 1, flexBasis: 185, minWidth: 165 }}>
          <FadeInView delay={index * 25}>
            <InsightCard {...item} />
          </FadeInView>
        </View>
      ))}
    </KpiGrid>
  );
}

// ─── InsightCard ────────────────────────────────────────────────────────────────

export function InsightCard({ title, value, subtitle, subtitleColor, valueFontSize = 24, icon: Icon, accent }: InsightCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 15,
        gap: 9,
        minHeight: 124,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: '800' }}>
          {title}
        </Text>
        {Icon ? (
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              backgroundColor: `${accent}18`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={19} color={accent} />
          </View>
        ) : null}
      </View>
      <Text style={{ color: colors.text, fontSize: valueFontSize, fontWeight: '900' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
        {value}
      </Text>
      {subtitle ? (
        <Text style={{ color: subtitleColor ?? colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
