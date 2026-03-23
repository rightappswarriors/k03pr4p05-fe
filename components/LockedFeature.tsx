// components/LockedFeature.tsx
// Fixed: useLimitGuard now reads branches/outlets count synchronously

import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Lock, Star, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

const GOLD_FEATURES = [
  'Unlimited branches & outlets',
  'Full HR module — employees, payroll',
  'Finance & Budget Planner',
  'Sales Analytics & charts',
  'Master File management',
  'Export to Excel & PDF',
  'Real-time WebSocket metrics',
  'Expense Summary (GIS) reports',
];

function UpgradeModal({
  visible,
  onClose,
  featureName,
  limitInfo,
}: {
  visible: boolean;
  onClose: () => void;
  featureName: string;
  limitInfo?: string;
}) {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={um.backdrop}>
        <View style={[um.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[um.closeBtn, { backgroundColor: colors.background }]}
            onPress={onClose}
          >
            <X size={16} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={[um.iconWrap, { backgroundColor: '#E87722' + '20' }]}>
            <Star size={32} color="#E87722" strokeWidth={1.5} />
          </View>
          <View style={um.badge}>
            <Text style={um.badgeTxt}>GOLD PLAN</Text>
          </View>
          <Text style={[um.title, { color: colors.text }]}>
            Upgrade to Unlock
          </Text>
          {limitInfo && (
            <View
              style={[
                um.limitBanner,
                {
                  backgroundColor: colors.error + '12',
                  borderColor: colors.error + '30',
                },
              ]}
            >
              <Text style={[um.limitTxt, { color: colors.error }]}>
                {limitInfo}
              </Text>
            </View>
          )}
          <Text style={[um.sub, { color: colors.textSecondary }]}>
            Upgrade to Gold for {featureName} and the full ERP suite.
          </Text>
          <View style={[um.featList, { borderColor: colors.border }]}>
            {GOLD_FEATURES.map((f) => (
              <View
                key={f}
                style={[um.featRow, { borderBottomColor: colors.border }]}
              >
                <View style={um.featDot} />
                <Text style={[um.featTxt, { color: colors.text }]}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={um.upgradeBtn}
            activeOpacity={0.85}
            onPress={onClose}
          >
            <Star size={16} color="#fff" strokeWidth={2} />
            <Text style={um.upgradeTxt}>Upgrade to Gold</Text>
          </TouchableOpacity>
          <Text style={[um.note, { color: colors.textSecondary }]}>
            Contact your administrator to upgrade
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const um = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#E87722',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  limitBanner: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
    width: '100%',
  },
  limitTxt: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  featList: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  featDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E87722',
    flexShrink: 0,
  },
  featTxt: { fontSize: 13 },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E87722',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    justifyContent: 'center',
  },
  upgradeTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  note: { fontSize: 11, marginTop: 12 },
});

export function LockedNavItem({
  label,
  icon: Icon,
  featureName,
  colors,
  styles,
}: {
  label: string;
  icon: any;
  featureName: string;
  colors: any;
  styles: any;
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[styles.navItem, { opacity: 0.5 }]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Icon size={17} color={colors.textSecondary} strokeWidth={2} />
        <Text
          style={[styles.navLabel, { color: colors.textSecondary, flex: 1 }]}
        >
          {label}
        </Text>
        <Lock size={12} color={colors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>
      <UpgradeModal
        visible={show}
        onClose={() => setShow(false)}
        featureName={featureName}
      />
    </>
  );
}

export function LockedScreen({
  featureName,
  children,
}: {
  featureName: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <View
        style={[
          ls.iconWrap,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Lock size={40} color={colors.textSecondary} strokeWidth={1.5} />
      </View>
      <Text style={[ls.title, { color: colors.text }]}>{featureName}</Text>
      <Text style={[ls.sub, { color: colors.textSecondary }]}>
        This feature is available on the Gold plan.
      </Text>
      <TouchableOpacity
        style={ls.btn}
        onPress={() => setShow(true)}
        activeOpacity={0.85}
      >
        <Star size={16} color="#fff" strokeWidth={2} />
        <Text style={ls.btnTxt}>See Gold Features</Text>
      </TouchableOpacity>
      <UpgradeModal
        visible={show}
        onClose={() => setShow(false)}
        featureName={featureName}
      />
    </View>
  );
}

const ls = StyleSheet.create({
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E87722',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── useLimitGuard — FIXED ─────────────────────────────────────────────────────
// The bug: branches.length was read from stale closure in React state.
// Fix: checkBranch/checkOutlet receive the CURRENT count at call time.

export function useLimitGuard() {
  const { canAddBranch, canAddOutlet, limits, plan } = useSubscription();
  const [show, setShow] = useState(false);
  const [feature, setFeature] = useState('');
  const [limitInfo, setLimitInfo] = useState('');

  const checkBranch = (currentCount: number): boolean => {
    if (canAddBranch(currentCount)) return true;
    setFeature('Additional Branches');
    setLimitInfo(
      `Basic plan allows ${limits.maxBranches} branch. You already have ${currentCount}.`,
    );
    setShow(true);
    return false;
  };

  const checkOutlet = (currentCount: number): boolean => {
    if (canAddOutlet(currentCount)) return true;
    setFeature('Additional Outlets');
    setLimitInfo(
      `Basic plan allows ${limits.maxOutlets} outlets. You already have ${currentCount}.`,
    );
    setShow(true);
    return false;
  };

  const GuardModal = () => (
    <UpgradeModal
      visible={show}
      onClose={() => setShow(false)}
      featureName={feature}
      limitInfo={limitInfo}
    />
  );

  return { checkBranch, checkOutlet, GuardModal };
}
