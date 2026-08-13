// PendingAgentModal.tsx — Modal for viewing pending procurement agent details,
// approving, and rejecting agent join requests.
import React, { useState, useCallback, useEffect } from 'react';
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
  Check,
  ChevronDown,
  ChevronUp,
  Download,
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
import {
  AgentDetails,
  approveOrganizationAgent,
  rejectOrganizationAgent,
} from '@/services/procurementAgentService';

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

interface PendingAgentModalProps {
  visible: boolean;
  agent: AgentDetails | null;
  onClose: () => void;
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
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
  doc: AgentDetails['verifications'][number];
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

export function PendingAgentModal({ visible, agent, onClose, onApprove, onReject, onRefresh }: PendingAgentModalProps) {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (visible) setActiveTab('overview');
  }, [visible]);

  const handleApprove = useCallback(async () => {
    if (!agent?.id) return;
    setProcessing(true);
    try {
      await approveOrganizationAgent(agent.id);
      if (__DEV__) console.log('[PendingAgentModal] Agent approved', { agentId: agent.id });
      onApprove?.();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to approve agent.');
    } finally {
      setProcessing(false);
    }
  }, [agent, onApprove]);

  const handleReject = useCallback(async () => {
    if (!agent?.id) return;
    if (!rejectReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for rejection.');
      return;
    }
    setProcessing(true);
    try {
      await rejectOrganizationAgent(agent.id, rejectReason.trim());
      if (__DEV__) console.log('[PendingAgentModal] Agent rejected', { agentId: agent.id, reason: rejectReason.trim() });
      setRejectReason('');
      onReject?.();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to reject agent.');
    } finally {
      setProcessing(false);
    }
  }, [agent, rejectReason, onReject]);

  const handleRejectPress = useCallback(() => {
    Alert.alert(
      'Reject Agent',
      'Are you sure you want to reject this agent request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            if (!rejectReason.trim()) {
              Alert.alert('Reason Required', 'Please provide a reason for rejection.');
              return;
            }
            handleReject();
          },
        },
      ],
    );
  }, [rejectReason, handleReject]);

  const handlePreview = useCallback((url: string) => {
    setPreviewUrl(url);
  }, []);


  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'personal', label: 'Personal Info' },
    { key: 'invitation', label: 'Invitation' },
    { key: 'documents', label: 'Documents' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <TouchableOpacity style={{ position: 'absolute', inset: 0 }} onPress={onClose} activeOpacity={1} />
        {agent ? (
          <AgentDetailsContent
            agent={agent}
            colors={colors}
            isDesktop={isDesktop}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabs={tabs}
            onApprove={onApprove}
            onReject={onReject}
            processing={processing}
            handleApprove={handleApprove}
            handleRejectPress={handleRejectPress}
            handlePreview={handlePreview}
            onClose={onClose}
          />
        ) : (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', gap: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>No agent data available</Text>
            <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// New sub-component — agent is required here, so TS knows it's non-null
function AgentDetailsContent({
  agent, colors, isDesktop, activeTab, setActiveTab, tabs,
  onApprove, onReject, processing, handleApprove, handleRejectPress,
  handlePreview, onClose,
}: {
  agent: AgentDetails; // <-- non-null
  colors: any; isDesktop: boolean;
  activeTab: TabKey; setActiveTab: (t: TabKey) => void;
  tabs: Array<{ key: TabKey; label: string }>;
  onApprove?: () => Promise<void>; onReject?: () => Promise<void>;
  processing: boolean;
  handleApprove: () => void; handleRejectPress: () => void;
  handlePreview: (url: string) => void; onClose: () => void;
}) {

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  return (
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
          <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text }} numberOfLines={1}>{agent?.fullname || 'Unknown Agent'}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>{agent?.email}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color={colors.textSecondary} />
        </TouchableOpacity>
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
                onPress={() => setActiveTab(tab.key)}
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
              <InfoRow label="Submitted At" value={agent.submittedAt ? new Date(agent?.submittedAt).toLocaleDateString() : '—'} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {agent.preferences?.interestedIndustries?.map(ind => (
                  <View key={ind} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: `${colors.primary}14`, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{ind}</Text>
                  </View>
                )) || <Text style={{ fontSize: 12, color: colors.textSecondary }}>No industries specified</Text>}
              </View>
            </InfoSection>

            <InfoSection title="Quick Actions">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {onApprove && (
                  <TouchableOpacity
                    onPress={handleApprove}
                    disabled={processing}
                    style={{
                      flex: 1,
                      backgroundColor: processing ? '#86EFAC' : '#16A34A', // lighter green
                      borderRadius: 10,
                      padding: 12,
                      alignItems: 'center',
                      opacity: processing ? 0.7 : 1, // optional
                    }}
                  >
                    <Text
                      style={{
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                    >
                      Approve
                    </Text>
                  </TouchableOpacity>
                )}

                {onReject && (
                  <TouchableOpacity
                    onPress={handleRejectPress}
                    disabled={processing}
                    style={{
                      flex: 1,
                      backgroundColor: processing ? '#FCA5A5' : '#DC2626', // lighter red
                      borderRadius: 10,
                      padding: 12,
                      alignItems: 'center',
                      opacity: processing ? 0.7 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                    >
                      Reject
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
              <InfoRow label="Full Name" value={agent?.fullname} />
              <InfoRow label="Email" value={agent.email} mono />
              <InfoRow label="Phone" value={agent.phone ?? '—'} />
              <InfoRow label="Birthday" value={agent.personalInfo?.dateOfBirth ? new Date(agent.personalInfo.dateOfBirth).toLocaleDateString() : '—'} />
              <InfoRow label="Gender" value={agent.personalInfo?.gender ?? '—'} />
              <InfoRow label="Civil Status" value={agent.personalInfo?.civilStatus ?? '—'} />
              <InfoRow label="Emergency Contact" value={agent.personalInfo?.emergencyContact ?? '—'} />
              <InfoRow label="Address" value={agent.personalInfo?.address ?? '—'} />
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <InfoRow label="City" value={agent.personalInfo?.city ?? '—'} />
                </View>
                <View style={{ flex: 1 }}>
                  <InfoRow label="Province" value={agent.personalInfo?.province ?? '—'} />
                </View>
              </View>
              <InfoRow label="Zip Code" value={agent.personalInfo?.zipCode ?? '—'} mono />
            </InfoSection>

            <InfoSection title="Experience">
              <InfoRow label="Experience Level" value={agent.preferences?.experienceLevel ?? '—'} />
              <InfoRow
                label="Interested Industries"
                value={agent.preferences?.interestedIndustries?.join(', ') ?? '—'}
              />
            </InfoSection>
          </View>
        )}

        {activeTab === 'invitation' && (
          <View style={{ gap: 12 }}>
            <InfoSection title="Invitation Information">
              <InfoRow label="Organization" value={agent.organization?.name ?? '—'} />
              <InfoRow label="Position" value={agent.invitation?.positionName ?? '—'} />
              <InfoRow label="Submitted" value={agent.submittedAt ? new Date(agent.submittedAt).toLocaleDateString() : '—'} />
              <InfoRow label="Invitation Status" value={agent.invitation?.status ?? '—'} />
              {agent.invitation?.expiresAt && (
                <InfoRow label="Expires" value={new Date(agent.invitation.expiresAt).toLocaleDateString()} />
              )}
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
            {previewUrl.endsWith('.pdf') || previewUrl.match(/\.(pdf|jpg|jpeg|png|gif|webp)$/i) ? (
              <Text style={{ color: '#fff', fontSize: 14 }}>Preview: {previewUrl}</Text>
            ) : (
              <Text style={{ color: '#fff', fontSize: 14 }}>Document preview not available</Text>
            )}
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
  );
}