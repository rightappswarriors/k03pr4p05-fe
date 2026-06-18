import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Image, ActivityIndicator, RefreshControl,
  Dimensions, Platform, FlatList, Alert, StatusBar, Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  AttendanceService,
  AttendanceRecord,
  UserAttendanceEntry,
  PerformanceSummary,
  AttendanceActionType,
} from '@/services/attendanceService';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;
const IS_WEB = Platform.OS === 'web';

const STEPS: Array<{
  key: AttendanceActionType;
  label: string;
  prompt: string;
  icon: string;
}> = [
    { key: 'timeIn', label: 'Log In', prompt: "What's your plan for today?", icon: '🟢' },
    { key: 'startBreak', label: 'Out for Lunch', prompt: 'Any notes before your break?', icon: '🍽️' },
    { key: 'endBreak', label: 'In from Lunch', prompt: "What are you working on next?", icon: '🔄' },
    { key: 'timeOut', label: 'Out from Work', prompt: "How did your day go?", icon: '🔴' },
  ];

const ROLE_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Staff', value: 'STAFF' },
  { label: 'Cashier', value: 'CASHIER' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatPct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function statusColor(status: string, colors: any): string {
  switch (status) {
    case 'PRESENT': return colors.success;
    case 'ON_BREAK': return colors.warning;
    case 'OFF_DUTY': return colors.textSecondary;
    case 'ABSENT': return colors.error;
    default: return colors.textSecondary;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'PRESENT': return 'Present';
    case 'ON_BREAK': return 'On Break';
    case 'OFF_DUTY': return 'Done';
    case 'ABSENT': return 'Absent';
    default: return status;
  }
}

// ─── Attendance Action Modal ──────────────────────────────────────────────────

interface ActionModalProps {
  visible: boolean;
  step: typeof STEPS[number] | null;
  onConfirm: (photo: any, note: string) => Promise<void>;
  onClose: () => void;
  colors: any;
}

function AttendanceActionModal({ visible, step, onConfirm, onClose, colors }: ActionModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<any>(null);
  const [note, setNote] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPhoto(null);
      setNote('');
      setShowCamera(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Camera access is required to log attendance.');
        return;
      }
    }
    setShowCamera(true);
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      setCapturing(true);
      const result = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false });
      setPhoto(result);
      setShowCamera(false);
    } catch (err) {
      console.error('[AttendanceActionModal] capture failed:', err);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const handleConfirm = async () => {
    if (!photo) {
      Alert.alert('Photo Required', 'Please take a photo before confirming.');
      return;
    }
    if (!note.trim()) {
      Alert.alert('Note Required', 'Please add a note before confirming.');
      return;
    }
    try {
      setSubmitting(true);
      await onConfirm(photo, note.trim());
      setPhoto(null);
      setNote('');
    } catch (err) {
      console.error('[AttendanceActionModal] confirm failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!step) return null;

  const s = modalStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Animated.View style={[s.sheet, { opacity: fadeAnim }]}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.icon}>{step.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{step.label}</Text>
              <Text style={s.subtitle}>{step.prompt}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} disabled={submitting}>
              <Text style={s.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {/* Camera / Photo area */}
            {showCamera ? (
              <View style={s.cameraContainer}>
                <CameraView ref={cameraRef} style={s.camera} facing="front">
                  <View style={s.cameraOverlay}>
                    <TouchableOpacity
                      style={[s.captureBtn, capturing && { opacity: 0.6 }]}
                      onPress={handleCapture}
                      disabled={capturing}
                    >
                      {capturing
                        ? <ActivityIndicator color="#fff" />
                        : <View style={s.captureInner} />
                      }
                    </TouchableOpacity>
                  </View>
                </CameraView>
              </View>
            ) : (
              <TouchableOpacity style={s.photoArea} onPress={handleOpenCamera} activeOpacity={0.85}>
                {photo ? (
                  <>
                    <Image source={{ uri: photo.uri }} style={s.photoPreview}
                      defaultSource={require('@/assets/images/placeholder.png')}
                    />
                    <View style={s.retakeOverlay}>
                      <Text style={s.retakeText}>📸 Retake</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={s.cameraIcon}>📷</Text>
                    <Text style={s.photoHint}>Tap to take a photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Note */}
            <View style={s.noteSection}>
              <Text style={s.noteLabel}>Note</Text>
              <TextInput
                style={s.textarea}
                placeholder={step.prompt}
                placeholderTextColor={colors.textSecondary}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, (!photo || !note.trim() || submitting) && s.confirmDisabled]}
              onPress={handleConfirm}
              disabled={!photo || !note.trim() || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.confirmText}>Confirm ✓</Text>
              }
            </TouchableOpacity>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Performance Card ─────────────────────────────────────────────────────────

function PerformanceCard({ perf, colors }: { perf: PerformanceSummary; colors: any }) {
  const s = perfStyles(colors);
  const stats = [
    { label: 'Present', value: String(perf.presentDays), accent: colors.success },
    { label: 'Absent', value: String(perf.absentDays), accent: colors.error },
    { label: 'Late Arrivals', value: String(perf.lateLogins), accent: colors.warning },
    { label: 'Half Days', value: String(perf.halfDays), accent: colors.accent },
    { label: 'Avg. Clock-in', value: AttendanceService.formatAvgLoginTime(perf.avgLoginTimeMinutes), accent: colors.primary },
    { label: 'Rate', value: formatPct(perf.attendanceRate), accent: colors.primaryLight },
  ];

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Performance This Month</Text>
      <View style={s.statsGrid}>
        {stats.map(stat => (
          <View key={stat.label} style={s.statCell}>
            <Text style={[s.statValue, { color: stat.accent }]}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Owner: User Detail Bottom Sheet ─────────────────────────────────────────

interface UserDetailSheetProps {
  entry: UserAttendanceEntry | null;
  visible: boolean;
  onClose: () => void;
  colors: any;
  orgId: string;
}

function UserDetailSheet({ entry, visible, onClose, colors, orgId }: UserDetailSheetProps) {
  const [perf, setPerf] = useState<PerformanceSummary | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [histPage, setHistPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entry || !visible) return;
    loadData();
  }, [entry, visible]);

  const loadData = async () => {
    if (!entry) return;
    setLoading(true);
    try {
      const { from, to } = AttendanceService.defaultDateRange();
      const [perfData, histData] = await Promise.all([
        AttendanceService.getUserPerformanceSummary(entry.user.id, from, to),
        AttendanceService.getUserAttendanceHistory(entry.user.id, 1, 15),
      ]);
      setPerf(perfData);
      setHistory(histData.items);
      setHasMore(histData.hasMore);
      setHistPage(1);
    } catch (err) {
      console.error('[UserDetailSheet] loadData failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreHistory = async () => {
    if (!entry || !hasMore || loading) return;
    try {
      const next = histPage + 1;
      const data = await AttendanceService.getUserAttendanceHistory(entry.user.id, next, 15);
      setHistory(prev => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setHistPage(next);
    } catch (err) {
      console.error('[UserDetailSheet] loadMoreHistory failed:', err);
    }
  };

  if (!entry) return null;
  const s = sheetStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* User Header */}
          <View style={s.userHeader}>
            <View style={[s.avatar, { backgroundColor: colors.primary }]}>
              <Text style={s.avatarText}>{entry.user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{entry.user.name}</Text>
              <Text style={s.userRole}>{entry.user.role} · {entry.user.email}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: statusColor(entry.status, colors) + '22' }]}>
              <Text style={[s.statusText, { color: statusColor(entry.status, colors) }]}>
                {statusLabel(entry.status)}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Today's timeline */}
              {entry.attendance && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Today</Text>
                  <View style={s.timeline}>
                    {[
                      { label: 'Clocked In', time: entry.attendance.timeIn, photo: entry.attendance.photoIn },
                      { label: 'Break Out', time: entry.attendance.breakStart, photo: entry.attendance.photoBreakStart },
                      { label: 'Break In', time: entry.attendance.breakEnd, photo: entry.attendance.photoBreakEnd },
                      { label: 'Clocked Out', time: entry.attendance.timeOut, photo: entry.attendance.photoOut },
                    ].map((ev, i) => (
                      <View key={i} style={s.timelineRow}>
                        <View style={[s.timelineDot, !ev.time && s.timelineDotEmpty]} />
                        <Text style={[s.timelineLabel, !ev.time && { color: colors.textSecondary }]}>
                          {ev.label}
                        </Text>
                        <Text style={s.timelineTime}>{formatTime(ev.time)}</Text>
                        {ev.photo && (
                          <Image source={{ uri: ev.photo }} style={s.timelinePhoto}
                            defaultSource={require('@/assets/images/placeholder.png')} />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Performance */}
              {perf && <PerformanceCard perf={perf} colors={colors} />}

              {/* History */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Attendance History</Text>
                {history.map(rec => (
                  <View key={rec.id} style={s.histRow}>
                    <Text style={s.histDate}>{formatDate(rec.shiftDate)}</Text>
                    <View style={[s.histBadge, { backgroundColor: statusColor(rec.status, colors) + '22' }]}>
                      <Text style={[s.histStatus, { color: statusColor(rec.status, colors) }]}>
                        {statusLabel(rec.status)}
                      </Text>
                    </View>
                    <Text style={s.histTime}>{formatTime(rec.timeIn)} – {formatTime(rec.timeOut)}</Text>
                  </View>
                ))}
                {hasMore && (
                  <TouchableOpacity style={s.loadMore} onPress={loadMoreHistory}>
                    <Text style={[s.loadMoreText, { color: colors.primary }]}>Load more</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}

          <TouchableOpacity style={s.closeBar} onPress={onClose}>
            <Text style={[s.closeBarText, { color: colors.primary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EmployeeAttendanceScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const isOwner = user?.role === 'OWNER';
  const orgId = String(user?.orgId ?? '');

  // Shared state
  const [refreshing, setRefreshing] = useState(false);

  // Staff/Cashier state
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [perf, setPerf] = useState<PerformanceSummary | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const [activeModal, setActiveModal] = useState<typeof STEPS[number] | null>(null);

  // Owner state
  const [ownerList, setOwnerList] = useState<UserAttendanceEntry[]>([]);
  const [ownerTotal, setOwnerTotal] = useState(0);
  const [ownerPage, setOwnerPage] = useState(1);
  const [ownerHasMore, setOwnerHasMore] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerLoadingMore, setOwnerLoadingMore] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [selectedEntry, setSelectedEntry] = useState<UserAttendanceEntry | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadStaffData = useCallback(async () => {
    try {
      setLoadingToday(true);
      const { from, to } = AttendanceService.defaultDateRange();
      const [rec, perfData] = await Promise.all([
        AttendanceService.getMyAttendanceToday(),
        AttendanceService.getMyPerformanceSummary(from, to),
      ]);
      setTodayRecord(rec);
      setPerf(perfData);
    } catch (err) {
      console.error('[EmployeeScreen] loadStaffData failed:', err);
    } finally {
      setLoadingToday(false);
    }
  }, []);

  const loadOwnerData = useCallback(async (role?: string, reset = false) => {
    try {
      if (reset) {
        setOwnerLoading(true);
        setOwnerPage(1);
      } else {
        setOwnerLoadingMore(true);
      }
      const page = reset ? 1 : ownerPage + 1;
      const data = await AttendanceService.getTodayAttendanceByOrg(page, 20, role);
      if (reset) {
        setOwnerList(data.items);
      } else {
        setOwnerList(prev => [...prev, ...data.items]);
        setOwnerPage(page);
      }
      setOwnerTotal(data.total);
      setOwnerHasMore(data.hasMore);
    } catch (err) {
      console.error('[EmployeeScreen] loadOwnerData failed:', err);
    } finally {
      setOwnerLoading(false);
      setOwnerLoadingMore(false);
    }
  }, [ownerPage]);

  useEffect(() => {
    if (isOwner) {
      loadOwnerData(roleFilter, true);
    } else {
      loadStaffData();
    }
  }, [isOwner]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (isOwner) {
      await loadOwnerData(roleFilter, true);
    } else {
      await loadStaffData();
    }
    setRefreshing(false);
  };

  const handleRoleFilter = (role?: string) => {
    setRoleFilter(role);
    loadOwnerData(role, true);
  };

  // ── Attendance action ──────────────────────────────────────────────────────

  const handleAction = async (photo: any, note: string) => {
    if (!activeModal) return;
    try {
      let updated: AttendanceRecord;
      switch (activeModal.key) {
        case 'timeIn': updated = await AttendanceService.timeIn(photo, note, orgId); break;
        case 'startBreak': updated = await AttendanceService.startBreak(photo, note, orgId); break;
        case 'endBreak': updated = await AttendanceService.endBreak(photo, note, orgId); break;
        case 'timeOut': updated = await AttendanceService.timeOut(photo, note, orgId); break;
      }
      setTodayRecord(updated!);
      setActiveModal(null);
    } catch (err: any) {
      console.error('[EmployeeScreen] handleAction failed:', err);
      Alert.alert('Error', err?.message || 'Something went wrong. Please try again.');
      throw err;
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const stepState = AttendanceService.getStepState(todayRecord);

  const isStepEnabled = (key: AttendanceActionType): boolean => {
    switch (key) {
      case 'timeIn': return stepState.canTimeIn;
      case 'startBreak': return stepState.canStartBreak;
      case 'endBreak': return stepState.canEndBreak;
      case 'timeOut': return stepState.canTimeOut;
    }
  };

  const isStepDone = (key: AttendanceActionType): boolean => {
    switch (key) {
      case 'timeIn': return !!todayRecord?.timeIn;
      case 'startBreak': return !!todayRecord?.breakStart;
      case 'endBreak': return !!todayRecord?.breakEnd;
      case 'timeOut': return !!todayRecord?.timeOut;
    }
  };

  const getStepTime = (key: AttendanceActionType): string | null => {
    switch (key) {
      case 'timeIn': return todayRecord?.timeIn ?? null;
      case 'startBreak': return todayRecord?.breakStart ?? null;
      case 'endBreak': return todayRecord?.breakEnd ?? null;
      case 'timeOut': return todayRecord?.timeOut ?? null;
    }
  };

  const s = mainStyles(colors);

  // ── OWNER VIEW ─────────────────────────────────────────────────────────────

  if (isOwner) {
    const presentCount = ownerList.filter(e => ['PRESENT', 'ON_BREAK', 'OFF_DUTY'].includes(e.status)).length;
    const absentCount = ownerList.filter(e => e.status === 'ABSENT').length;

    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        {/* Header */}
        <View style={s.ownerHeader}>
          <View>
            <Text style={s.ownerHeaderTitle}>Today's Attendance</Text>
            <Text style={s.ownerHeaderDate}>
              {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <View style={s.ownerStats}>
            <View style={s.ownerStatChip}>
              <Text style={[s.ownerStatNum, { color: colors.success }]}>{presentCount}</Text>
              <Text style={s.ownerStatLbl}>In</Text>
            </View>
            <View style={s.ownerStatChip}>
              <Text style={[s.ownerStatNum, { color: colors.error }]}>{absentCount}</Text>
              <Text style={s.ownerStatLbl}>Absent</Text>
            </View>
          </View>
        </View>

        {/* Role Filter Tabs */}
        <View style={s.tabRow}>
          {ROLE_FILTERS.map(f => (
            <TouchableOpacity
              key={String(f.value)}
              style={[s.tab, roleFilter === f.value && s.tabActive]}
              onPress={() => handleRoleFilter(f.value)}
            >
              <Text style={[s.tabText, roleFilter === f.value && s.tabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={s.totalLabel}>{ownerTotal} employees</Text>
        </View>

        {/* List */}
        {ownerLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} size="large" />
        ) : (
          <FlatList
            data={ownerList}
            keyExtractor={item => String(item.user.id)}
            contentContainerStyle={s.listContent}
            numColumns={IS_TABLET || IS_WEB ? 2 : 1}
            key={IS_TABLET || IS_WEB ? 'two-col' : 'one-col'}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.employeeCard, (IS_TABLET || IS_WEB) && s.employeeCardTablet]}
                onPress={() => { setSelectedEntry(item); setDetailVisible(true); }}
                activeOpacity={0.82}
              >
                <View style={[s.empAvatar, { backgroundColor: colors.primary + 'CC' }]}>
                  <Text style={s.empAvatarText}>{item.user.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.empName}>{item.user.name}</Text>
                  <Text style={s.empRole}>{item.user.role}</Text>
                  {item.attendance?.timeIn && (
                    <Text style={s.empTime}>In: {formatTime(item.attendance.timeIn)}</Text>
                  )}
                </View>
                <View style={[s.empStatusDot, { backgroundColor: statusColor(item.status, colors) }]} />
                <View>
                  <Text style={[s.empStatusText, { color: statusColor(item.status, colors) }]}>
                    {statusLabel(item.status)}
                  </Text>
                  <Text style={s.empChevron}>›</Text>
                </View>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              ownerHasMore ? (
                <TouchableOpacity
                  style={s.loadMoreBtn}
                  onPress={() => loadOwnerData(roleFilter, false)}
                  disabled={ownerLoadingMore}
                >
                  {ownerLoadingMore
                    ? <ActivityIndicator color={colors.primary} />
                    : <Text style={[s.loadMoreText, { color: colors.primary }]}>Load more employees</Text>
                  }
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>📋</Text>
                <Text style={s.emptyText}>No employees found</Text>
              </View>
            }
          />
        )}

        <UserDetailSheet
          entry={selectedEntry}
          visible={detailVisible}
          onClose={() => setDetailVisible(false)}
          colors={colors}
          orgId={orgId}
        />
      </View>
    );
  }

  // ── STAFF / CASHIER VIEW ───────────────────────────────────────────────────

  const now = new Date();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <ScrollView
        contentContainerStyle={[s.staffScroll, (IS_TABLET || IS_WEB) && s.staffScrollTablet]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting header */}
        <View style={s.staffHeader}>
          <View style={[s.staffAvatar, { backgroundColor: colors.accent }]}>
            <Text style={s.staffAvatarText}>{(user?.name ?? 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.greeting}>Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'},</Text>
            <Text style={s.staffName}>{user?.name ?? 'Employee'}</Text>
            <Text style={s.staffDateLine}>
              {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </View>

        {loadingToday ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} size="large" />
        ) : (
          <>
            {/* Current status pill */}
            {todayRecord && (
              <View style={s.statusPill}>
                <View style={[s.statusDot, { backgroundColor: statusColor(todayRecord.status, colors) }]} />
                <Text style={[s.statusPillText, { color: statusColor(todayRecord.status, colors) }]}>
                  {statusLabel(todayRecord.status)}
                </Text>
              </View>
            )}

            {/* Step Cards */}
            <View style={s.stepsCard}>
              <Text style={s.stepsTitle}>Attendance</Text>
              {STEPS.map((step, index) => {
                const done = isStepDone(step.key);
                const enabled = isStepEnabled(step.key);
                const time = getStepTime(step.key);

                return (
                  <View key={step.key}>
                    {index > 0 && (
                      <View style={[s.stepConnector, done && s.stepConnectorDone]} />
                    )}
                    <TouchableOpacity
                      style={[
                        s.stepRow,
                        done && s.stepRowDone,
                        enabled && !done && s.stepRowActive,
                        !enabled && !done && s.stepRowDisabled,
                      ]}
                      onPress={() => enabled && !done && setActiveModal(step)}
                      disabled={!enabled || done}
                      activeOpacity={0.8}
                    >
                      <View style={[
                        s.stepIconWrap,
                        done && { backgroundColor: colors.success + '22' },
                        enabled && !done && { backgroundColor: colors.primary + '15' },
                      ]}>
                        <Text style={s.stepIconText}>{done ? '✓' : step.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          s.stepLabel,
                          done && { color: colors.success },
                          !enabled && !done && { color: colors.textSecondary },
                        ]}>
                          {step.label}
                        </Text>
                        {time && <Text style={s.stepTime}>{formatTime(time)}</Text>}
                      </View>
                      {enabled && !done && (
                        <View style={[s.stepCTA, { backgroundColor: colors.primary }]}>
                          <Text style={s.stepCTAText}>Tap</Text>
                        </View>
                      )}
                      {done && (
                        <View style={[s.stepCTA, { backgroundColor: colors.success + '22' }]}>
                          <Text style={[s.stepCTAText, { color: colors.success }]}>Done</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Performance Card */}
            {perf && <PerformanceCard perf={perf} colors={colors} />}
          </>
        )}
      </ScrollView>

      <AttendanceActionModal
        visible={!!activeModal}
        step={activeModal}
        onConfirm={handleAction}
        onClose={() => setActiveModal(null)}
        colors={colors}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const mainStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  // Owner header
  ownerHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  ownerHeaderTitle: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 0.2 },
  ownerHeaderDate: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  ownerStats: { flexDirection: 'row', gap: 10 },
  ownerStatChip: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center',
  },
  ownerStatNum: { fontSize: 20, fontWeight: '800' },
  ownerStatLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },

  // Role filter
  tabRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8,
  },
  tab: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  totalLabel: { marginLeft: 'auto' as any, fontSize: 12, color: colors.textSecondary },

  // Employee list
  listContent: { padding: 16, gap: 10 },
  employeeCard: {
    backgroundColor: colors.card, borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2, borderWidth: 1, borderColor: colors.border,
  },
  employeeCardTablet: { flex: 1, margin: 4 },
  empAvatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  empAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  empName: { fontSize: 15, fontWeight: '600', color: colors.text },
  empRole: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  empTime: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  empStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  empStatusText: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  empChevron: { fontSize: 20, color: colors.textSecondary, textAlign: 'right' },

  // Load more / empty
  loadMoreBtn: {
    margin: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
  },
  loadMoreText: { fontWeight: '600', fontSize: 14 },
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 64 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 16 },

  // Staff header
  staffHeader: {
    backgroundColor: colors.primary, paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  staffAvatar: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
  },
  staffAvatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  greeting: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  staffName: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 1 },
  staffDateLine: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },

  // Status pill
  statusPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.surface,
    borderRadius: 20, marginTop: 16, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontWeight: '600' },

  // Steps
  stepsCard: {
    margin: 16, marginTop: 12, backgroundColor: colors.card,
    borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  stepsTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 14 },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 14, gap: 12,
  },
  stepRowDone: { backgroundColor: colors.success + '0A' },
  stepRowActive: { backgroundColor: colors.primary + '08' },
  stepRowDisabled: { opacity: 0.45 },
  stepConnector: {
    width: 2, height: 12, backgroundColor: colors.border,
    marginLeft: 23, marginVertical: 1,
  },
  stepConnectorDone: { backgroundColor: colors.success },
  stepIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.border + '66',
  },
  stepIconText: { fontSize: 18 },
  stepLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  stepTime: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  stepCTA: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10,
  },
  stepCTAText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Staff scroll
  staffScroll: { paddingBottom: 40 },
  staffScrollTablet: { maxWidth: 640, alignSelf: 'center' as any, width: '100%' },
});

const perfStyles = (colors: any) => StyleSheet.create({
  card: {
    margin: 16, marginTop: 0, backgroundColor: colors.card, borderRadius: 20,
    padding: 18, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCell: {
    flex: 1, minWidth: 90, backgroundColor: colors.background,
    borderRadius: 14, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 3, textAlign: 'center' },
});

const modalStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 20,
    maxHeight: '92%',
    ...(IS_WEB || IS_TABLET ? {
      alignSelf: 'center' as any, width: 520,
      borderRadius: 24, marginBottom: 40, marginHorizontal: 'auto' as any,
    } : {}),
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18,
  },
  icon: { fontSize: 28, marginTop: 2 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  closeBtn: { padding: 6 },
  closeX: { fontSize: 16, color: colors.textSecondary },

  cameraContainer: { borderRadius: 16, overflow: 'hidden', height: 260, marginBottom: 16 },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20,
  },
  captureBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  captureInner: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary,
  },

  photoArea: {
    height: 200, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background, marginBottom: 16, overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%', borderRadius: 16 },
  retakeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  retakeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cameraIcon: { fontSize: 36, marginBottom: 8 },
  photoHint: { color: colors.textSecondary, fontSize: 14 },

  noteSection: { marginBottom: 8 },
  noteLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  textarea: {
    backgroundColor: colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, minHeight: 100, fontSize: 14, color: colors.text,
  },

  footer: {
    flexDirection: 'row', gap: 12, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  confirmBtn: {
    flex: 2, padding: 14, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  confirmDisabled: { opacity: 0.45 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

const sheetStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, maxHeight: '88%',
    ...(IS_WEB || IS_TABLET ? {
      alignSelf: 'center' as any, width: 560, borderRadius: 24,
      marginBottom: 40,
    } : {}),
  },
  handle: {
    width: 40, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  userHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  userName: { fontSize: 18, fontWeight: '700', color: colors.text },
  userRole: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  timeline: { gap: 8 },
  timelineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary,
  },
  timelineDotEmpty: { backgroundColor: colors.border },
  timelineLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  timelineTime: { fontSize: 13, color: colors.textSecondary },
  timelinePhoto: { width: 32, height: 32, borderRadius: 8 },

  histRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  histDate: { flex: 1, fontSize: 13, color: colors.text },
  histBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  histStatus: { fontSize: 11, fontWeight: '700' },
  histTime: { fontSize: 11, color: colors.textSecondary },

  loadMore: { paddingVertical: 14, alignItems: 'center' },
  loadMoreText: { fontSize: 14, fontWeight: '600' },

  closeBar: {
    paddingVertical: 14, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4,
  },
  closeBarText: { fontSize: 15, fontWeight: '700' },
});