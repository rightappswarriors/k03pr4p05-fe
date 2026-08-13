// OrganizationAgentModal.tsx — Full details and edit modal for approved Procurement Agents
import React, { useCallback, useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  Eye,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  User,
  UserX,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import type { OrganizationAgent, UpdateOrganizationAgentInput } from '@/services/procurementAgentService';

function Badge({
  label,
  tone = '#2563EB',
  size = 'sm',
}: { label: string; tone?: string; size?: 'xs' | 'sm' | 'md' }) {
  const px = size === 'xs' ? 6 : size === 'md' ? 12 : 8;
  const py = size === 'xs' ? 2 : size === 'md' ? 6 : 4;
  const fs = size === 'xs' ? 10 : size === 'md' ? 13 : 11;
  const { colors } = useTheme();
  return (
    <View style={{ borderRadius: 6, paddingHorizontal: px, paddingVertical: py, backgroundColor: `${tone}1A` }}>
      <Text style={{ fontSize: fs, fontWeight: '700', color: tone }}>{label}</Text>
    </View>
  );
}

interface OrganizationAgentModalProps {
  visible: boolean;
  agent: OrganizationAgent | null;
  mode: 'view' | 'edit';
  onClose: () => void;
  onSave?: (agentId: string, input: UpdateOrganizationAgentInput) => Promise<void>;
  onReject?: (agentId: string, reason: string) => Promise<void>;
}

type TabKey = 'overview' | 'personal' | 'invitation' | 'documents';

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, flexShrink: 0 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'right', flex: 1, fontFamily: mono ? 'monospace' : undefined }}>{value ?? '—'}</Text>
    </View>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{title}</Text>
      </View>
      <View style={{ padding: 14, gap: 4 }}>{children}</View>
    </View>
  );
}

function DocumentCard({
  doc,
  onPreview,
}: {
  doc: OrganizationAgent['verifications'][number];
  onPreview?: (url: string) => void;
}) {
  const { colors } = useTheme();
  const statusTone = doc.status === 'APPROVED' ? '#16A34A' : doc.status === 'REJECTED' ? '#DC2626' : '#F59E0B';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: colors.background, borderRadius: 10, gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{doc.documentType.replace(/_/g, ' ')}</Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Status: {doc.status}</Text>
        {doc.fileUrl ? (
          <Text style={{ fontSize: 10, color: colors.primary, marginTop: 2 }} numberOfLines={1}>{doc.fileUrl}</Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <Badge label={doc.status} tone={statusTone} size="xs" />
        {doc.fileUrl && onPreview && (
          <TouchableOpacity onPress={() => onPreview(doc.fileUrl!)} style={{ padding: 6, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Eye size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function OrganizationAgentModal({ visible, agent, mode, onClose, onSave, onReject }: OrganizationAgentModalProps) {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isEdit = mode === 'edit';
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateOrganizationAgentInput>({
    fullname: agent?.fullname ?? '',
    phone: agent?.phone ?? '',
    address: agent?.address ?? '',
    city: agent?.city ?? '',
    province: agent?.province ?? '',
    zipCode: agent?.zipCode ?? '',
    birthday: agent?.birthday ? new Date(agent.birthday).toISOString().split('T')[0] : '',
    gender: agent?.gender ?? '',
    civilStatus: agent?.civilStatus ?? '',
    emergencyContact: agent?.emergencyContact ?? '',
    experienceLevel: agent?.experienceLevel ?? '',
    interestedIndustries: [...(agent?.interestedIndustries ?? [])],
    positionId: agent?.positionId ?? '',
  });
  const [editIndustries, setEditIndustries] = useState<string[]>([...(agent?.interestedIndustries ?? [])]);

  useEffect(() => {
    if (visible) setActiveTab('overview');
  }, [visible]);

  useEffect(() => {
    if (agent) {
      setEditForm({
        fullname: agent.fullname ?? '',
        phone: agent.phone ?? '',
        address: agent.address ?? '',
        city: agent.city ?? '',
        province: agent.province ?? '',
        zipCode: agent.zipCode ?? '',
        birthday: agent.birthday ? new Date(agent.birthday).toISOString().split('T')[0] : '',
        gender: agent.gender ?? '',
        civilStatus: agent.civilStatus ?? '',
        emergencyContact: agent.emergencyContact ?? '',
        experienceLevel: agent.experienceLevel ?? '',
        interestedIndustries: [...(agent.interestedIndustries ?? [])],
        positionId: agent.positionId ?? '',
      });
      setEditIndustries([...(agent.interestedIndustries ?? [])]);
    }
  }, [agent, visible]);

  const handleSave = useCallback(async () => {
    if (!onSave || !agent) return;
    setProcessing(true);
    try {
      const input: UpdateOrganizationAgentInput = {
        ...(editForm.fullname !== '' && { fullname: editForm.fullname }),
        ...(editForm.phone !== '' && { phone: editForm.phone }),
        ...(editForm.address !== '' && { address: editForm.address }),
        ...(editForm.city !== '' && { city: editForm.city }),
        ...(editForm.province !== '' && { province: editForm.province }),
        ...(editForm.zipCode !== '' && { zipCode: editForm.zipCode }),
        ...(editForm.birthday !== '' && { birthday: new Date(editForm.birthday) }),
        ...(editForm.gender !== '' && { gender: editForm.gender }),
        ...(editForm.civilStatus !== '' && { civilStatus: editForm.civilStatus }),
        ...(editForm.emergencyContact !== '' && { emergencyContact: editForm.emergencyContact }),
        ...(editForm.experienceLevel !== '' && { experienceLevel: editForm.experienceLevel }),
        ...(editIndustries.length > 0 && { interestedIndustries: editIndustries }),
        ...(editForm.positionId !== '' && { positionId: editForm.positionId }),
      };
      await onSave(agent.id, input);
      if (__DEV__) console.log('[OrganizationAgentModal] Agent saved', { agentId: agent.id });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update agent');
    } finally {
      setProcessing(false);
    }
  }, [agent, onSave, editForm, editIndustries]);

  const handleRejectPress = useCallback(async () => {
    if (!agent?.id || !onReject) return;
    if (!rejectReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for rejection.');
      return;
    }
    const ok = await confirm({
      title: 'Reject Approved Agent',
      message: `Are you sure you want to reject this approved agent? They will no longer appear in Procurement Agents.`,
      confirmLabel: 'Reject',
      cancelLabel: 'Cancel',
      destructive: true,
    });
    if (!ok) return;
    setProcessing(true);
    try {
      await onReject(agent.id, rejectReason.trim());
      if (__DEV__) console.log('[OrganizationAgentModal] Agent rejected', { agentId: agent.id });
      setRejectReason('');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to reject agent');
    } finally {
      setProcessing(false);
    }
  }, [agent, rejectReason, onReject, onClose, confirm]);

  const handlePreview = useCallback((url: string) => {
    setPreviewUrl(url);
  }, []);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'personal', label: 'Personal Info' },
    { key: 'invitation', label: 'Invitation' },
    { key: 'documents', label: 'Documents' },
  ];

  if (!agent) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <TouchableOpacity style={{ position: 'absolute', inset: 0 }} onPress={onClose} activeOpacity={1} />
        <View
          style={{
            width: isDesktop ? '90%' : '100%',
            maxWidth: 640,
            height: isDesktop ? '85%' : '90%',
            maxHeight: 720,
            backgroundColor: colors.surface,
            borderRadius: isDesktop ? 20 : 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text }} numberOfLines={1}>{agent.fullname || 'Unknown Agent'}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>{agent.email}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {isEdit ? (
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={processing}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: processing ? '#86EFAC' : '#16A34A',
                    opacity: processing ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                    {processing ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View style={{ flexGrow: 0, flexShrink: 0, height: 44 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              <View style={{ flexDirection: 'row', gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border, height: 44, alignItems: 'center' }}>
                {tabs.map(tab => (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => isEdit ? null : setActiveTab(tab.key)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      height: '100%',
                      justifyContent: 'center',
                      borderBottomWidth: activeTab === tab.key ? 2 : 0,
                      borderBottomColor: colors.primary,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? colors.primary : colors.textSecondary }}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Content */}
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {activeTab === 'overview' && (
              <View style={{ gap: 12 }}>
                <InfoSection title="Status Overview">
                  <InfoRow label="Verification Status" value={agent.verificationStatus} />
                  <InfoRow label="Agent Type" value={agent.agentType} />
                  <InfoRow label="Trust Tier" value={agent.trustTier} />
                  <InfoRow label="Agent Status" value={agent.status} />
                  <InfoRow label="Created" value={agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : '—'} />
                  <InfoRow label="Last Updated" value={agent.updatedAt ? new Date(agent.updatedAt).toLocaleDateString() : '—'} />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {agent.interestedIndustries?.map(ind => (
                      <View key={ind} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: `${colors.primary}14`, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{ind}</Text>
                      </View>
                    )) || <Text style={{ fontSize: 12, color: colors.textSecondary }}>No industries specified</Text>}
                  </View>
                </InfoSection>

                <InfoSection title="Quick Actions">
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {!isEdit && onSave && (
                      <TouchableOpacity
                        onPress={() => {}}
                        style={{ flex: 1, backgroundColor: '#16A34A', borderRadius: 10, padding: 12, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Edit Agent</Text>
                      </TouchableOpacity>
                    )}
                    {onReject && (
                      <TouchableOpacity
                        onPress={handleRejectPress}
                        disabled={processing}
                        style={{
                          flex: 1,
                          backgroundColor: processing ? '#FCA5A5' : '#DC2626',
                          borderRadius: 10,
                          padding: 12,
                          alignItems: 'center',
                          opacity: processing ? 0.7 : 1,
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                          {processing ? 'Rejecting...' : 'Reject Agent'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </InfoSection>
              </View>
            )}

            {activeTab === 'personal' && (
              <View style={{ gap: 12 }}>
                <InfoSection title="Personal Information">
                  {isEdit ? (
                    <>
                      <TextInput
                        value={editForm.fullname}
                        onChangeText={(t) => setEditForm(f => ({ ...f, fullname: t }))}
                        placeholder="Full Name"
                        style={editInputStyle(colors)}
                      />
                      <TextInput
                        value={editForm.phone ?? ''}
                        onChangeText={(t) => setEditForm(f => ({ ...f, phone: t }))}
                        placeholder="Phone"
                        style={editInputStyle(colors)}
                      />
                      <TextInput
                        value={editForm.address ?? ''}
                        onChangeText={(t) => setEditForm(f => ({ ...f, address: t }))}
                        placeholder="Address"
                        style={editInputStyle(colors)}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <TextInput
                            value={editForm.city ?? ''}
                            onChangeText={(t) => setEditForm(f => ({ ...f, city: t }))}
                            placeholder="City"
                            style={editInputStyle(colors)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <TextInput
                            value={editForm.province ?? ''}
                            onChangeText={(t) => setEditForm(f => ({ ...f, province: t }))}
                            placeholder="Province"
                            style={editInputStyle(colors)}
                          />
                        </View>
                      </View>
                      <TextInput
                        value={editForm.zipCode ?? ''}
                        onChangeText={(t) => setEditForm(f => ({ ...f, zipCode: t }))}
                        placeholder="ZIP Code"
                        style={editInputStyle(colors)}
                      />
                      <TextInput
                        value={editForm.birthday ?? ''}
                        onChangeText={(t) => setEditForm(f => ({ ...f, birthday: t }))}
                        placeholder="Birthday (YYYY-MM-DD)"
                        style={editInputStyle(colors)}
                      />
                      <TextInput
                        value={editForm.gender ?? ''}
                        onChangeText={(t) => setEditForm(f => ({ ...f, gender: t }))}
                        placeholder="Gender"
                        style={editInputStyle(colors)}
                      />
                      <TextInput
                        value={editForm.civilStatus ?? ''}
                        onChangeText={(t) => setEditForm(f => ({ ...f, civilStatus: t }))}
                        placeholder="Civil Status"
                        style={editInputStyle(colors)}
                      />
                      <TextInput
                        value={editForm.emergencyContact ?? ''}
                        onChangeText={(t) => setEditForm(f => ({ ...f, emergencyContact: t }))}
                        placeholder="Emergency Contact"
                        style={editInputStyle(colors)}
                      />
                    </>
                  ) : (
                    <>
                      <InfoRow label="Full Name" value={agent.fullname} />
                      <InfoRow label="Email" value={agent.email} mono />
                      <InfoRow label="Phone" value={agent.phone ?? '—'} />
                      <InfoRow label="Birthday" value={agent.birthday ? new Date(agent.birthday).toLocaleDateString() : '—'} />
                      <InfoRow label="Gender" value={agent.gender ?? '—'} />
                      <InfoRow label="Civil Status" value={agent.civilStatus ?? '—'} />
                      <InfoRow label="Emergency Contact" value={agent.emergencyContact ?? '—'} />
                      <InfoRow label="Address" value={agent.address ?? '—'} />
                      <View style={{ flexDirection: 'row', gap: 16 }}>
                        <View style={{ flex: 1 }}>
                          <InfoRow label="City" value={agent.city ?? '—'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <InfoRow label="Province" value={agent.province ?? '—'} />
                        </View>
                      </View>
                      <InfoRow label="ZIP Code" value={agent.zipCode ?? '—'} mono />
                    </>
                  )}
                </InfoSection>

                <InfoSection title="Experience">
                  {isEdit ? (
                    <>
                      <TextInput
                        value={editForm.experienceLevel ?? ''}
                        onChangeText={(t) => setEditForm(f => ({ ...f, experienceLevel: t }))}
                        placeholder="Experience Level"
                        style={editInputStyle(colors)}
                      />
                      <TextInput
                        value={editIndustries.join(', ')}
                        onChangeText={(t) => setEditIndustries(t.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="Interested Industries (comma separated)"
                        style={editInputStyle(colors)}
                      />
                    </>
                  ) : (
                    <>
                      <InfoRow label="Experience Level" value={agent.experienceLevel ?? '—'} />
                      <InfoRow
                        label="Interested Industries"
                        value={agent.interestedIndustries?.join(', ') ?? '—'}
                      />
                    </>
                  )}
                </InfoSection>
              </View>
            )}

            {activeTab === 'invitation' && (
              <View style={{ gap: 12 }}>
                <InfoSection title="Invitation Information">
                  <InfoRow label="Organization" value={agent.organization?.name ?? '—'} />
                  <InfoRow label="Position" value={agent.positionName ?? '—'} />
                  <InfoRow label="Created" value={agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : '—'} />
                  <InfoRow label="Updated" value={agent.updatedAt ? new Date(agent.updatedAt).toLocaleDateString() : '—'} />
                  <InfoRow label="Invitation ID" value={agent.invitationId ?? '—'} />
                  <InfoRow label="Invitation Status" value={agent.invitationStatus ?? '—'} />
                  {agent.organization?.location && (
                    <InfoRow label="Org Location" value={agent.organization.location} />
                  )}
                </InfoSection>
              </View>
            )}

            {activeTab === 'documents' && (
              <View style={{ gap: 12 }}>
                <InfoSection title="Verification Documents">
                  {agent.verifications.length === 0 ? (
                    <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 }}>No documents submitted</Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {agent.verifications.map(doc => (
                        <DocumentCard key={doc.id} doc={doc} onPreview={handlePreview} />
                      ))}
                    </View>
                  )}
                </InfoSection>
              </View>
            )}
          </ScrollView>

          {/* Preview overlay for documents */}
          {previewUrl && (
            <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }} onPress={() => setPreviewUrl(null)}>
                  <X size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontSize: 14 }}>Preview: {previewUrl}</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS === 'web' && navigator?.clipboard) {
                      navigator.clipboard.writeText(previewUrl);
                      Alert.alert('Copied', 'Document URL copied to clipboard');
                    }
                  }}
                  style={{ marginTop: 16, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Copy URL</Text>
                </TouchableOpacity>
              </View>
            </Modal>
          )}
        </View>
      </View>
    </Modal>
  );
}

function editInputStyle(colors: any) {
  return {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: 14,
    marginBottom: 8,
  };
}