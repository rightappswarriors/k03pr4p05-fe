// ─── Coming Soon Screen ───────────────────────────────────────────────────────
// Shown for features that are built but not yet ready for production.
// Replace with the real screen + restore nav item when the feature ships.
import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Wrench } from "lucide-react-native";
import { Text, View } from "react-native";
export function ComingSoonScreen({ featureName }: { featureName: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        padding: 32,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* Wrench icon — swap for any lucide-react-native icon you prefer */}
        <Wrench size={28} color={colors.textSecondary} strokeWidth={1.5} />
      </View>

      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: colors.text,
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        {featureName} — Coming Soon
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
          maxWidth: 300,
        }}
      >
        This feature is currently under development. Check back in the next
        update!
      </Text>
    </View>
  );
}