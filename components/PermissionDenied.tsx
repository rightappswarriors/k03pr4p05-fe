import { ShieldX } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

export default function PermissionDenied() {
  const { colors } = useTheme();
  return (
    <View style={styles.root} accessibilityRole="alert">
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ShieldX size={28} color={colors.textSecondary} />
        <Text style={[styles.title, { color: colors.text }]}>Access unavailable</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>You don&apos;t have permission to view this page.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 18, padding: 28 },
  title: { fontSize: 18, fontWeight: '800' },
  message: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
