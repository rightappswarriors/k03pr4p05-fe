// ─── DROP THIS FILE INTO: components/ContactPickerModal.tsx ──────────────────
// Then import it in RestockSchedulerScreen and replace the raw email input
// in both ScheduleFormModal and CycleFormModal.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { AtSign, X } from 'lucide-react-native';
import { ContactService, Contact } from '@/services/contactService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * Called when user confirms a choice.
   * email   = the chosen / typed email
   * contact = the Contact record if picked from list, undefined if typed manually
   */
  onConfirm: (email: string, contact?: Contact) => void;
  /** Pre-fill the manual input when no contact is selected */
  defaultEmail?: string;
  /** If provided, shows branch-specific contacts in addition to globals */
  branchId?: number | null;
  orgId: number;
  colors: any;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContactPickerModal({
  visible, onClose, onConfirm, defaultEmail = '', branchId, orgId, colors,
}: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [tab, setTab] = useState<'pick' | 'manual'>('pick');
  const [selected, setSelected] = useState<Contact | null>(null);

  // ── Load on open ──
  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setManualEmail(defaultEmail);
    setSelected(null);
    setTab('pick');
    load('');
  }, [visible, branchId, orgId]);

  const load = async (q: string) => {
    setLoading(true);
    try {
      const data = await ContactService.getContacts(branchId ?? null, q || undefined);
      setContacts(data);
    } catch (e) {
      if (__DEV__) console.error('Failed to load contacts', e);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => load(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search, visible]);

  // Split into global / branch groups
  const { globals, branch: branchContacts } = useMemo(() => ({
    globals: contacts.filter((c) => c.branchId === null),
    branch: contacts.filter((c) => c.branchId !== null),
  }), [contacts]);

  const handleConfirmPick = () => {
    if (!selected) return;
    onConfirm(selected.email, selected);
    onClose();
  };

  const handleConfirmManual = () => {
    if (!manualEmail.trim()) return;
    onConfirm(manualEmail.trim(), undefined);
    onClose();
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const isSelected = selected?.id === item.id;
    const isGlobal = item.branchId === null;
    return (
      <TouchableOpacity
        onPress={() => setSelected(isSelected ? null : item)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          borderRadius: 10,
          marginBottom: 6,
          borderWidth: isSelected ? 1.5 : 1,
          borderColor: isSelected ? '#0EA5E9' : colors.border,
          backgroundColor: isSelected ? '#0EA5E918' : colors.surface,
        }}
      >
        {/* Scope dot */}
        <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 10, backgroundColor: isGlobal ? '#0EA5E9' : '#10B981' }} />

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
            {item.email}
          </Text>
          {item.position ? (
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.position}</Text>
          ) : null}
        </View>

        {/* Scope badge */}
        <View style={{
          paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
          backgroundColor: (isGlobal ? '#0EA5E9' : '#10B981') + '18', marginLeft: 8,
        }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: isGlobal ? '#0EA5E9' : '#10B981' }}>
            {isGlobal ? 'GLOBAL' : 'BRANCH'}
          </Text>
        </View>

        {/* Checkmark */}
        {isSelected && (
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0EA5E9', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.8, marginBottom: 6, marginTop: 12 }}>
      {title} ({count})
    </Text>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>

        {/* ── Header ── */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: Platform.OS === 'ios' ? 56 : 20,
          paddingBottom: 16, paddingHorizontal: 20,
          backgroundColor: '#0EA5E9',
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Choose Recipient</Text>
          <AtSign size={20} color="rgba(255,255,255,0.7)" strokeWidth={2} />
        </View>

        {/* ── Tabs ── */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {(['pick', 'manual'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1, paddingVertical: 12, alignItems: 'center',
                borderBottomWidth: tab === t ? 2 : 0,
                borderBottomColor: '#0EA5E9',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === t ? '#0EA5E9' : colors.textSecondary }}>
                {t === 'pick' ? '📇  From Contacts' : '✏️  Type Manually'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab: Pick from contacts ── */}
        {tab === 'pick' && (
          <View style={{ flex: 1, padding: 12 }}>
            {/* Search */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1,
              borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10,
              marginBottom: 4,
            }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>🔍</Text>
              <TextInput
                style={{ flex: 1, fontSize: 14, color: colors.text }}
                placeholder="Search contacts…"
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#0EA5E9" />
              </View>
            ) : contacts.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
                <Text style={{ fontSize: 32, marginBottom: 10 }}>📇</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 }}>
                  No contacts found.{'\n'}Add contacts in Master File → Contacts.
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 14, borderWidth: 1, borderColor: '#0EA5E9', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }}
                  onPress={() => setTab('manual')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0EA5E9' }}>Type email manually instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={[]}
                renderItem={null}
                ListHeaderComponent={() => (
                  <>
                    {globals.length > 0 && (
                      <>
                        <SectionHeader title="🌐 Global Contacts" count={globals.length} />
                        {globals.map((item) => (
                          <React.Fragment key={item.id}>{renderContact({ item })}</React.Fragment>
                        ))}
                      </>
                    )}
                    {branchContacts.length > 0 && (
                      <>
                        <SectionHeader title="🏢 Branch Contacts" count={branchContacts.length} />
                        {branchContacts.map((item) => (
                          <React.Fragment key={item.id}>{renderContact({ item })}</React.Fragment>
                        ))}
                      </>
                    )}
                  </>
                )}
                keyExtractor={() => 'list'}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            )}

            {/* Confirm button */}
            {selected && (
              <View style={{ position: 'absolute', bottom: 20, left: 12, right: 12 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#0EA5E9', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                  onPress={handleConfirmPick}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                    Use {selected.label} · {selected.email}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Tab: Manual email ── */}
        {tab === 'manual' && (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.8, marginBottom: 8 }}>
              EMAIL ADDRESS *
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 14, color: colors.text,
              }}
              placeholder="supplier@example.com"
              placeholderTextColor={colors.textSecondary}
              value={manualEmail}
              onChangeText={setManualEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
              To save this email for future use, add it in Master File → Contacts.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: manualEmail.trim() ? '#0EA5E9' : colors.border,
                borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20,
              }}
              onPress={handleConfirmManual}
              disabled={!manualEmail.trim()}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Use This Email</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}