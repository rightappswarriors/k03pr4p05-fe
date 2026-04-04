// components/RestockDatePickerModal.tsx
// Restock scheduling date/time picker modal
// Supports: once, daily (with per-day times), weekly, monthly, custom (multi-date)
//
// FIX: Wheel scroll jump bug.
// Root cause: onScrollEndDrag fired BEFORE momentum was fully settled, causing
// snapToIndex() to land on the wrong item. Then onMomentumScrollEnd fired again
// with the correct offset but the isTouching guard was already cleared, causing a
// second snap that created a visible jump.
//
// Fix strategy:
// 1. Track gesture state with a ref (isScrolling) that stays true until momentum ends.
// 2. Only call snapToIndex from onMomentumScrollEnd — never from onScrollEndDrag.
// 3. For slow drags that produce NO momentum, use a short debounce timer so the
//    value commits cleanly after the drag settles.
// 4. The sync useEffect still guards with isScrolling so external value changes
//    don't fight an active scroll.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Recurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface DaySchedule {
  date: Date;
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
}

export interface ScheduleResult {
  recurrence: Recurrence;
  onceDate?: Date;
  onceHour?: number;
  onceMinute?: number;
  oncePeriod?: 'AM' | 'PM';
  dailyDays?: DaySchedule[];
  weeklyStartDate?: Date;
  weeklyEndDate?: Date;
  weeklyDayOfWeek?: number;
  weeklyHour?: number;
  weeklyMinute?: number;
  weeklyPeriod?: 'AM' | 'PM';
  monthlyStartDate?: Date;
  monthlyEndDate?: Date;
  monthlyDayOfMonth?: number;
  monthlyHour?: number;
  monthlyMinute?: number;
  monthlyPeriod?: 'AM' | 'PM';
  customDays?: DaySchedule[];
}

interface Props {
  visible: boolean;
  recurrence: Recurrence;
  onClose: () => void;
  onConfirm: (result: ScheduleResult) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function midnight(d: Date): Date {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  return m;
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatDateLabel(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function formatDayOfWeek(d: Date): string {
  return DAY_NAMES[d.getDay()];
}
function buildDateTime(
  base: Date,
  hour: number,
  minute: number,
  period: 'AM' | 'PM',
): Date {
  let h = hour % 12;
  if (period === 'PM') h += 12;
  const d = new Date(base);
  d.setHours(h, minute, 0, 0);
  return d;
}
function isInPast(
  date: Date,
  hour: number,
  minute: number,
  period: 'AM' | 'PM',
): boolean {
  return buildDateTime(date, hour, minute, period) <= new Date();
}
function daysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = midnight(start);
  const last = midnight(end);
  while (cur <= last) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ─── TimeSelector ─────────────────────────────────────────────────────────────

interface TimeSelectorProps {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
  onChange: (h: number, m: number, p: 'AM' | 'PM') => void;
  colors: any;
  compact?: boolean;
}

// Web version — text inputs
function WebTimeSelector({
  hour,
  minute,
  period,
  onChange,
  colors,
  compact,
}: TimeSelectorProps) {
  const [hStr, setHStr] = useState(String(hour).padStart(2, '0'));
  const [mStr, setMStr] = useState(String(minute).padStart(2, '0'));
  const [localPeriod, setLocalPeriod] = useState<'AM' | 'PM'>(period);

  useEffect(() => {
    setHStr(String(hour).padStart(2, '0'));
    setMStr(String(minute).padStart(2, '0'));
    setLocalPeriod(period);
  }, [hour, minute, period]);

  const commitHour = (raw: string) => {
    let n = parseInt(raw, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > 12) n = 12;
    setHStr(String(n).padStart(2, '0'));
    onChange(n, minute, localPeriod);
  };
  const commitMinute = (raw: string) => {
    let n = parseInt(raw, 10);
    if (isNaN(n) || n < 0) n = 0;
    if (n > 59) n = 59;
    setMStr(String(n).padStart(2, '0'));
    onChange(hour, n, localPeriod);
  };
  const togglePeriod = (p: 'AM' | 'PM') => {
    setLocalPeriod(p);
    onChange(hour, minute, p);
  };

  const fontSize = compact ? 16 : 20;
  const padV = compact ? 8 : 12;
  const padH = compact ? 10 : 14;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '600',
            color: colors.textSecondary,
            marginBottom: 4,
            letterSpacing: 0.4,
          }}
        >
          HR
        </Text>
        <TextInput
          
          style={{
            fontSize,
            fontWeight: '700',
            color: colors.text,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingVertical: padV,
            paddingHorizontal: padH,
            textAlign: 'center',
            minWidth: compact ? 54 : 64,
            /* @ts-ignore */ outlineColor: colors.primary,
          }}
          value={hStr}
          onChangeText={setHStr}
          onBlur={() => commitHour(hStr)}
          onSubmitEditing={() => commitHour(hStr)}
          keyboardType="number-pad"
          maxLength={2}
          
          selectTextOnFocus
        />
      </View>
      <Text
        style={{
          fontSize: compact ? 20 : 26,
          fontWeight: '700',
          color: colors.textSecondary,
          paddingBottom: padV + 2,
        }}
      >
        :
      </Text>
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '600',
            color: colors.textSecondary,
            marginBottom: 4,
            letterSpacing: 0.4,
          }}
        >
          MIN
        </Text>
        <TextInput
          style={{
            fontSize,
            fontWeight: '700',
            color: colors.text,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingVertical: padV,
            paddingHorizontal: padH,
            textAlign: 'center',
            minWidth: compact ? 54 : 64,
            /* @ts-ignore */ outlineColor: colors.primary,
          }}
          value={mStr}
          onChangeText={setMStr}
          onBlur={() => commitMinute(mStr)}
          onSubmitEditing={() => commitMinute(mStr)}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
        />
      </View>
      <View style={{ gap: 4, paddingBottom: 1, flexDirection: 'row', alignItems: 'center', justifyContent: "center" }}>
        {(['AM', 'PM'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            activeOpacity={0.7}
            onPress={() => togglePeriod(p)}
            style={{
              paddingHorizontal: compact ? 12 : 14,
              paddingVertical: compact ? 6 : 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: localPeriod === p ? colors.primary : colors.border,
              backgroundColor:
                localPeriod === p ? colors.primary : colors.surface,
              alignItems: 'center',
              minWidth: compact ? 46 : 52,
            }}
          >
            <Text
              style={{
                fontSize: compact ? 12 : 13,
                fontWeight: '700',
                color: localPeriod === p ? '#fff' : colors.text,
              }}
            >
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Native scroll-wheel ──────────────────────────────────────────────────────

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ['AM', 'PM'] as const;

interface WheelProps {
  items: number[] | typeof PERIODS;
  selected: number | string;
  onSelect: (v: any) => void;
  colors: any;
  itemHeight: number;
  width: number;
}

function Wheel({
  items,
  selected,
  onSelect,
  colors,
  itemHeight,
  width,
}: WheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  // True while a finger is on the wheel OR momentum is still running.
  // Prevents the sync useEffect from fighting the gesture.
  const isScrolling = useRef(false);
  // Timer ref for slow-drag fallback commit (no-momentum drags).
  const dragSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the last offset reported during dragging to avoid double-snapping.
  const lastDragOffset = useRef<number | null>(null);

  // Sync wheel position when the controlled value changes externally.
  useEffect(() => {
    if (isScrolling.current) return;
    const idx = (items as any[]).findIndex((v) => v === selected);
    if (idx < 0) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: idx * itemHeight, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, [selected, itemHeight]);

  /** Clamp offset, pick item, call onSelect, scroll to snap position. */
  const snapToOffset = useCallback(
    (offsetY: number) => {
      const idx = Math.max(
        0,
        Math.min(Math.round(offsetY / itemHeight), (items as any[]).length - 1),
      );
      const value = (items as any[])[idx];
      // Snap scroll to exact position
      scrollRef.current?.scrollTo({ y: idx * itemHeight, animated: true });
      // Only call onSelect if value actually changed to avoid noisy re-renders.
      if (value !== selected) {
        onSelect(value);
      }
    },
    [items, itemHeight, selected, onSelect],
  );

  return (
    <View
      style={{
        width,
        height: itemHeight * 3,
        overflow: 'hidden',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Centre-slot highlight */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
          backgroundColor: colors.primary + '18',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.primary + '50',
          zIndex: 1,
        }}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: itemHeight }}
        // ── Gesture lifecycle ──────────────────────────────────────────────
        onScrollBeginDrag={() => {
          isScrolling.current = true;
          lastDragOffset.current = null;
          // Cancel any pending slow-drag settle timer
          if (dragSettleTimer.current) {
            clearTimeout(dragSettleTimer.current);
            dragSettleTimer.current = null;
          }
        }}
        onScroll={(e) => {
          // Track offset during drag for the slow-drag fallback.
          if (isScrolling.current) {
            lastDragOffset.current = e.nativeEvent.contentOffset.y;
          }
        }}
        onScrollEndDrag={(e) => {
          // DON'T call snapToIndex here — if the platform generates momentum,
          // onMomentumScrollEnd will handle it with the correct final offset.
          // For slow drags that produce no momentum, schedule a debounced commit.
          const offset = e.nativeEvent.contentOffset.y;
          lastDragOffset.current = offset;

          dragSettleTimer.current = setTimeout(() => {
            // If momentum started, this timer is irrelevant — isScrolling stays true
            // until onMomentumScrollEnd fires and calls snapToOffset itself.
            if (!isScrolling.current) return;
            // No momentum detected — commit the slow-drag position.
            isScrolling.current = false;
            snapToOffset(offset);
            dragSettleTimer.current = null;
          }, 80); // 80ms: enough for the OS to start a momentum event if one is coming
        }}
        onMomentumScrollBegin={() => {
          // Cancel the slow-drag timer — momentum is handling it.
          if (dragSettleTimer.current) {
            clearTimeout(dragSettleTimer.current);
            dragSettleTimer.current = null;
          }
        }}
        onMomentumScrollEnd={(e) => {
          isScrolling.current = false;
          snapToOffset(e.nativeEvent.contentOffset.y);
        }}
      >
        {(items as any[]).map((value, index) => {
          const isSelected = value === selected;
          const display =
            typeof value === 'number' ? String(value).padStart(2, '0') : value;
          return (
            <TouchableOpacity
              key={String(value) + index}
              activeOpacity={0.7}
              onPress={() => {
                const idx = (items as any[]).indexOf(value);
                scrollRef.current?.scrollTo({
                  y: idx * itemHeight,
                  animated: true,
                });
                onSelect(value);
              }}
              style={{
                height: itemHeight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: isSelected ? colors.primary : colors.text,
                  fontSize: isSelected ? 20 : 15,
                  fontWeight: isSelected ? '800' : '400',
                  opacity: isSelected ? 1 : 0.4,
                }}
              >
                {display}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function TimeSelector(props: TimeSelectorProps) {
  return <WebTimeSelector {...props} />;
}

// ─── Section: Once ────────────────────────────────────────────────────────────

function OnceSection({
  colors,
  onChange,
}: {
  colors: any;
  onChange: (r: Partial<ScheduleResult>) => void;
}) {
  const now = new Date();
  const [date, setDate] = useState<Date>(now);
  const [hour, setHour] = useState(now.getHours() % 12 || 12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>(
    now.getHours() >= 12 ? 'PM' : 'AM',
  );
  const [showPicker, setShowPicker] = useState(false);
  const [sendNow, setSendNow] = useState(false);

  const update = (d: Date, h: number, m: number, p: 'AM' | 'PM') => {
    onChange({ onceDate: d, onceHour: h, onceMinute: m, oncePeriod: p });
  };
  useEffect(() => {
    update(date, hour, minute, period);
  }, []);

  const onDateChange = (_: any, selected?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selected) {
      setDate(midnight(selected));
      update(midnight(selected), hour, minute, period);
    }
  };
  const onTimeChange = (h: number, m: number, p: 'AM' | 'PM') => {
    setHour(h);
    setMinute(m);
    setPeriod(p);
    update(date, h, m, p);
  };
  const pastWarning = !sendNow && isInPast(date, hour, minute, period);

  return (
    <View style={{ gap: 16 }}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: sendNow ? colors.accent : colors.border,
          backgroundColor: sendNow ? colors.accent + '15' : colors.surface,
        }}
        onPress={() =>
          setSendNow((v) => {
            const next = !v;
            if (next) onChange({ onceDate: undefined });
            else update(date, hour, minute, period);
            return next;
          })
        }
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: sendNow ? colors.accent : colors.border,
            backgroundColor: sendNow ? colors.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {sendNow && (
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>
              ✓
            </Text>
          )}
        </View>
        <View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
            Send immediately
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            Email goes out as soon as you save
          </Text>
        </View>
      </TouchableOpacity>

      {!sendNow && (
        <>
          <View>
            <Text style={styles(colors).label}>Date</Text>
            <TouchableOpacity
              style={styles(colors).dateBtn}
              onPress={() => setShowPicker(true)}
            >
              <Text
                style={{ fontSize: 15, fontWeight: '600', color: colors.text }}
              >
                {formatDateLabel(date)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {formatDayOfWeek(date)}
              </Text>
            </TouchableOpacity>
            {(showPicker || Platform.OS === 'ios') && (
              <DateTimePicker
                value={date}
                mode="date"
                minimumDate={midnight(new Date())}
                onChange={onDateChange}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
              />
            )}
          </View>
          <View>
            <Text style={styles(colors).label}>Time to send</Text>
            <TimeSelector
              hour={hour}
              minute={minute}
              period={period}
              onChange={onTimeChange}
              colors={colors}
            />
            {pastWarning && (
              <Text style={{ fontSize: 12, color: colors.error, marginTop: 6 }}>
                ⚠ This time has already passed today.
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Section: Daily ───────────────────────────────────────────────────────────

function DailySection({
  colors,
  onChange,
}: {
  colors: any;
  onChange: (r: Partial<ScheduleResult>) => void;
}) {
  const today = midnight(new Date());
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 6);
    return d;
  });
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [globalHour, setGlobalHour] = useState(9);
  const [globalMinute, setGlobalMinute] = useState(0);
  const [globalPeriod, setGlobalPeriod] = useState<'AM' | 'PM'>('AM');
  const [perDay, setPerDay] = useState<
    Record<string, { hour: number; minute: number; period: 'AM' | 'PM' }>
  >({});

  const days = useMemo(
    () => daysInRange(startDate, endDate),
    [startDate, endDate],
  );
  const buildResult = useCallback(
    (
      days: Date[],
      pd: typeof perDay,
      gh: number,
      gm: number,
      gp: 'AM' | 'PM',
    ) => {
      onChange({
        dailyDays: days.map((d) => {
          const key = d.toISOString().split('T')[0];
          const t = pd[key] ?? { hour: gh, minute: gm, period: gp };
          return { date: d, ...t };
        }),
      });
    },
    [onChange],
  );

  useEffect(() => {
    buildResult(days, perDay, globalHour, globalMinute, globalPeriod);
  }, [days, perDay, globalHour, globalMinute, globalPeriod]);

  const applyGlobalToAll = (h: number, m: number, p: 'AM' | 'PM') => {
    setGlobalHour(h);
    setGlobalMinute(m);
    setGlobalPeriod(p);
    setPerDay({});
  };
  const setDayTime = (date: Date, h: number, m: number, p: 'AM' | 'PM') => {
    const key = date.toISOString().split('T')[0];
    setPerDay((prev) => ({
      ...prev,
      [key]: { hour: h, minute: m, period: p },
    }));
  };
  const endDateError =
    endDate <= startDate ? 'End date must be after start date' : null;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles(colors).label}>Start date</Text>
          <TouchableOpacity
            style={styles(colors).dateBtn}
            onPress={() => setShowStart(true)}
          >
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: colors.text }}
            >
              {formatDateLabel(startDate)}
            </Text>
          </TouchableOpacity>
          {showStart && (
            <DateTimePicker
              value={startDate}
              mode="date"
              minimumDate={today}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => {
                setShowStart(Platform.OS === 'ios');
                if (d) setStartDate(midnight(d));
              }}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles(colors).label}>End date</Text>
          <TouchableOpacity
            style={styles(colors).dateBtn}
            onPress={() => setShowEnd(true)}
          >
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: colors.text }}
            >
              {formatDateLabel(endDate)}
            </Text>
          </TouchableOpacity>
          {showEnd && (
            <DateTimePicker
              value={endDate}
              mode="date"
              minimumDate={new Date(startDate.getTime() + 86400000)}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => {
                setShowEnd(Platform.OS === 'ios');
                if (d) setEndDate(midnight(d));
              }}
            />
          )}
        </View>
      </View>
      {endDateError && (
        <Text style={{ fontSize: 12, color: colors.error }}>
          {endDateError}
        </Text>
      )}
      {days.length > 0 && (
        <>
          <View
            style={{
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.accent + '60',
              backgroundColor: colors.accent + '08',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.accent,
                letterSpacing: 0.6,
                marginBottom: 10,
              }}
            >
              APPLY SAME TIME TO ALL DAYS
            </Text>
            <TimeSelector
              hour={globalHour}
              minute={globalMinute}
              period={globalPeriod}
              onChange={applyGlobalToAll}
              colors={colors}
              compact
            />
          </View>
          <Text style={styles(colors).label}>Individual day times</Text>
          <ScrollView
            style={{ maxHeight: 380 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 12 }}>
              {days.map((day) => {
                const key = day.toISOString().split('T')[0];
                const t = perDay[key] ?? {
                  hour: globalHour,
                  minute: globalMinute,
                  period: globalPeriod,
                };
                const hasOverride = !!perDay[key];
                const past = isInPast(day, t.hour, t.minute, t.period);
                return (
                  <View
                    key={key}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: past
                        ? colors.error + '60'
                        : hasOverride
                          ? colors.primary + '60'
                          : colors.border,
                      backgroundColor: colors.surface,
                      padding: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <View>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: colors.text,
                          }}
                        >
                          {formatDateLabel(day)}
                        </Text>
                        <Text
                          style={{ fontSize: 11, color: colors.textSecondary }}
                        >
                          {formatDayOfWeek(day)}
                        </Text>
                      </View>
                      {hasOverride && (
                        <TouchableOpacity
                          onPress={() =>
                            setPerDay((prev) => {
                              const n = { ...prev };
                              delete n[key];
                              return n;
                            })
                          }
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.textSecondary,
                            }}
                          >
                            Reset
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TimeSelector
                      hour={t.hour}
                      minute={t.minute}
                      period={t.period}
                      onChange={(h, m, p) => setDayTime(day, h, m, p)}
                      colors={colors}
                      compact
                    />
                    {past && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.error,
                          marginTop: 6,
                        }}
                      >
                        ⚠ This time is in the past
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

// ─── Section: Weekly ──────────────────────────────────────────────────────────

function WeeklySection({
  colors,
  onChange,
}: {
  colors: any;
  onChange: (r: Partial<ScheduleResult>) => void;
}) {
  const today = midnight(new Date());
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(today.getDay());
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  const update = (
    s: Date,
    e: Date | null,
    dow: number,
    h: number,
    m: number,
    p: 'AM' | 'PM',
  ) => {
    onChange({
      weeklyStartDate: s,
      weeklyEndDate: e ?? undefined,
      weeklyDayOfWeek: dow,
      weeklyHour: h,
      weeklyMinute: m,
      weeklyPeriod: p,
    });
  };
  useEffect(() => {
    update(startDate, endDate, dayOfWeek, hour, minute, period);
  }, []);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles(colors).label}>Start date</Text>
          <TouchableOpacity
            style={styles(colors).dateBtn}
            onPress={() => setShowStart(true)}
          >
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: colors.text }}
            >
              {formatDateLabel(startDate)}
            </Text>
          </TouchableOpacity>
          {showStart && (
            <DateTimePicker
              value={startDate}
              mode="date"
              minimumDate={today}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => {
                setShowStart(Platform.OS === 'ios');
                if (d) {
                  setStartDate(midnight(d));
                  update(midnight(d), endDate, dayOfWeek, hour, minute, period);
                }
              }}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles(colors).label}>End date (optional)</Text>
          <TouchableOpacity
            style={styles(colors).dateBtn}
            onPress={() => setShowEnd(true)}
          >
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: colors.text }}
            >
              {endDate ? formatDateLabel(endDate) : 'No end'}
            </Text>
          </TouchableOpacity>
          {showEnd && (
            <DateTimePicker
              value={endDate ?? startDate}
              mode="date"
              minimumDate={new Date(startDate.getTime() + 86400000)}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => {
                setShowEnd(Platform.OS === 'ios');
                if (d) {
                  setEndDate(midnight(d));
                  update(
                    startDate,
                    midnight(d),
                    dayOfWeek,
                    hour,
                    minute,
                    period,
                  );
                }
              }}
            />
          )}
          {endDate && (
            <TouchableOpacity
              onPress={() => {
                setEndDate(null);
                update(startDate, null, dayOfWeek, hour, minute, period);
              }}
            >
              <Text style={{ fontSize: 11, color: colors.error, marginTop: 4 }}>
                Clear end date
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View>
        <Text style={styles(colors).label}>Day of week</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {DAY_SHORT.map((d, i) => (
              <TouchableOpacity
                key={d}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: dayOfWeek === i ? colors.primary : colors.border,
                  backgroundColor:
                    dayOfWeek === i ? colors.primary : colors.surface,
                }}
                onPress={() => {
                  setDayOfWeek(i);
                  update(startDate, endDate, i, hour, minute, period);
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: dayOfWeek === i ? '#fff' : colors.text,
                  }}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      <View>
        <Text style={styles(colors).label}>Time to send</Text>
        <TimeSelector
          hour={hour}
          minute={minute}
          period={period}
          onChange={(h, m, p) => {
            setHour(h);
            setMinute(m);
            setPeriod(p);
            update(startDate, endDate, dayOfWeek, h, m, p);
          }}
          colors={colors}
        />
      </View>
    </View>
  );
}

// ─── Section: Monthly ─────────────────────────────────────────────────────────

function MonthlySection({
  colors,
  onChange,
}: {
  colors: any;
  onChange: (r: Partial<ScheduleResult>) => void;
}) {
  const today = midnight(new Date());
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState(today.getDate());
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

  const update = (
    s: Date,
    e: Date | null,
    dom: number,
    h: number,
    m: number,
    p: 'AM' | 'PM',
  ) => {
    onChange({
      monthlyStartDate: s,
      monthlyEndDate: e ?? undefined,
      monthlyDayOfMonth: dom,
      monthlyHour: h,
      monthlyMinute: m,
      monthlyPeriod: p,
    });
  };
  useEffect(() => {
    update(startDate, endDate, dayOfMonth, hour, minute, period);
  }, []);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles(colors).label}>Start month</Text>
          <TouchableOpacity
            style={styles(colors).dateBtn}
            onPress={() => setShowStart(true)}
          >
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: colors.text }}
            >
              {formatDateLabel(startDate)}
            </Text>
          </TouchableOpacity>
          {showStart && (
            <DateTimePicker
              value={startDate}
              mode="date"
              minimumDate={today}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => {
                setShowStart(Platform.OS === 'ios');
                if (d) {
                  setStartDate(midnight(d));
                  update(
                    midnight(d),
                    endDate,
                    dayOfMonth,
                    hour,
                    minute,
                    period,
                  );
                }
              }}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles(colors).label}>End month (optional)</Text>
          <TouchableOpacity
            style={styles(colors).dateBtn}
            onPress={() => setShowEnd(true)}
          >
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: colors.text }}
            >
              {endDate ? formatDateLabel(endDate) : 'No end'}
            </Text>
          </TouchableOpacity>
          {showEnd && (
            <DateTimePicker
              value={endDate ?? startDate}
              mode="date"
              minimumDate={new Date(startDate.getTime() + 86400000)}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => {
                setShowEnd(Platform.OS === 'ios');
                if (d) {
                  setEndDate(midnight(d));
                  update(
                    startDate,
                    midnight(d),
                    dayOfMonth,
                    hour,
                    minute,
                    period,
                  );
                }
              }}
            />
          )}
        </View>
      </View>
      <View>
        <Text style={styles(colors).label}>Day of month</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 2 }}>
            {DAYS.map((d) => (
              <TouchableOpacity
                key={d}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor:
                    dayOfMonth === d ? colors.primary : colors.border,
                  backgroundColor:
                    dayOfMonth === d ? colors.primary : colors.surface,
                }}
                onPress={() => {
                  setDayOfMonth(d);
                  update(startDate, endDate, d, hour, minute, period);
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: dayOfMonth === d ? '#fff' : colors.text,
                  }}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      <View>
        <Text style={styles(colors).label}>Time to send</Text>
        <TimeSelector
          hour={hour}
          minute={minute}
          period={period}
          onChange={(h, m, p) => {
            setHour(h);
            setMinute(m);
            setPeriod(p);
            update(startDate, endDate, dayOfMonth, h, m, p);
          }}
          colors={colors}
        />
      </View>
    </View>
  );
}

// ─── Section: Custom ─────────────────────────────────────────────────────────

function CustomSection({
  colors,
  onChange,
}: {
  colors: any;
  onChange: (r: Partial<ScheduleResult>) => void;
}) {
  const today = midnight(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [pickerDate, setPickerDate] = useState<Date>(today);
  const [showPicker, setShowPicker] = useState(false);
  const [globalHour, setGlobalHour] = useState(9);
  const [globalMinute, setGlobalMinute] = useState(0);
  const [globalPeriod, setGlobalPeriod] = useState<'AM' | 'PM'>('AM');
  const [perDay, setPerDay] = useState<
    Record<string, { hour: number; minute: number; period: 'AM' | 'PM' }>
  >({});

  const buildResult = useCallback(
    (
      dates: Date[],
      pd: typeof perDay,
      gh: number,
      gm: number,
      gp: 'AM' | 'PM',
    ) => {
      onChange({
        customDays: dates.map((d) => {
          const key = d.toISOString().split('T')[0];
          const t = pd[key] ?? { hour: gh, minute: gm, period: gp };
          return { date: d, ...t };
        }),
      });
    },
    [onChange],
  );

  useEffect(() => {
    buildResult(selectedDates, perDay, globalHour, globalMinute, globalPeriod);
  }, [selectedDates, perDay, globalHour, globalMinute, globalPeriod]);

  const toggleDate = (d: Date) => {
    const key = d.toISOString().split('T')[0];
    setSelectedDates((prev) => {
      const exists = prev.some((p) => isSameDay(p, d));
      if (exists) {
        setPerDay((pd) => {
          const n = { ...pd };
          delete n[key];
          return n;
        });
        return prev.filter((p) => !isSameDay(p, d));
      }
      return [...prev, midnight(d)].sort((a, b) => a.getTime() - b.getTime());
    });
  };
  const setDayTime = (date: Date, h: number, m: number, p: 'AM' | 'PM') => {
    setPerDay((prev) => ({
      ...prev,
      [date.toISOString().split('T')[0]]: { hour: h, minute: m, period: p },
    }));
  };
  const applyGlobalToAll = (h: number, m: number, p: 'AM' | 'PM') => {
    setGlobalHour(h);
    setGlobalMinute(m);
    setGlobalPeriod(p);
    setPerDay({});
  };

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={styles(colors).label}>Select dates</Text>
        <Text
          style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}
        >
          Tap the calendar to add individual dates.
        </Text>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            minimumDate={today}
            display="inline"
            onChange={(_, d) => {
              if (d) {
                setPickerDate(midnight(d));
                toggleDate(d);
              }
            }}
          />
        ) : (
          <>
            <TouchableOpacity
              style={[styles(colors).dateBtn, { marginBottom: 0 }]}
              onPress={() => setShowPicker(true)}
            >
              <Text
                style={{ fontSize: 14, fontWeight: '600', color: colors.text }}
              >
                Tap to pick a date
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                {selectedDates.length} date
                {selectedDates.length !== 1 ? 's' : ''} selected
              </Text>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                minimumDate={today}
                display="default"
                onChange={(_, d) => {
                  setShowPicker(false);
                  if (d) {
                    setPickerDate(midnight(d));
                    toggleDate(d);
                  }
                }}
              />
            )}
          </>
        )}
        {selectedDates.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 10,
            }}
          >
            {selectedDates.map((d) => {
              const key = d.toISOString().split('T')[0];
              const t = perDay[key] ?? {
                hour: globalHour,
                minute: globalMinute,
                period: globalPeriod,
              };
              return (
                <View
                  key={key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: colors.primary + '15',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: colors.primary + '40',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: colors.primary,
                    }}
                  >
                    {MONTH_NAMES[d.getMonth()].slice(0, 3)} {d.getDate()}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {t.hour}:{String(t.minute).padStart(2, '0')} {t.period}
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleDate(d)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.error,
                        fontWeight: '700',
                      }}
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {selectedDates.length > 0 && (
        <>
          <View
            style={{
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.accent + '60',
              backgroundColor: colors.accent + '08',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.accent,
                letterSpacing: 0.6,
                marginBottom: 10,
              }}
            >
              APPLY SAME TIME TO ALL DATES
            </Text>
            <TimeSelector
              hour={globalHour}
              minute={globalMinute}
              period={globalPeriod}
              onChange={applyGlobalToAll}
              colors={colors}
              compact
            />
          </View>
          <Text style={styles(colors).label}>Per-date times</Text>
          <ScrollView
            style={{ maxHeight: 380 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 12 }}>
              {selectedDates.map((day) => {
                const key = day.toISOString().split('T')[0];
                const t = perDay[key] ?? {
                  hour: globalHour,
                  minute: globalMinute,
                  period: globalPeriod,
                };
                const hasOverride = !!perDay[key];
                const past = isInPast(day, t.hour, t.minute, t.period);
                return (
                  <View
                    key={key}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: past
                        ? colors.error + '60'
                        : hasOverride
                          ? colors.primary + '60'
                          : colors.border,
                      backgroundColor: colors.surface,
                      padding: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <View>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: colors.text,
                          }}
                        >
                          {formatDateLabel(day)}
                        </Text>
                        <Text
                          style={{ fontSize: 11, color: colors.textSecondary }}
                        >
                          {formatDayOfWeek(day)}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 8,
                          alignItems: 'center',
                        }}
                      >
                        {hasOverride && (
                          <TouchableOpacity
                            onPress={() =>
                              setPerDay((prev) => {
                                const n = { ...prev };
                                delete n[key];
                                return n;
                              })
                            }
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                color: colors.textSecondary,
                              }}
                            >
                              Reset
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => toggleDate(day)}>
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.error,
                              fontWeight: '700',
                            }}
                          >
                            × Remove
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TimeSelector
                      hour={t.hour}
                      minute={t.minute}
                      period={t.period}
                      onChange={(h, m, p) => setDayTime(day, h, m, p)}
                      colors={colors}
                      compact
                    />
                    {past && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.error,
                          marginTop: 6,
                        }}
                      >
                        ⚠ This time is in the past
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

function styles(colors: any) {
  return StyleSheet.create({
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      letterSpacing: 0.3,
    },
    dateBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 4,
    },
  });
}

// ─── Validation ────────────────────────────────────────────────────────────────

function validateResult(
  result: Partial<ScheduleResult>,
  recurrence: Recurrence,
): string | null {
  if (
    recurrence === 'once' &&
    result.onceDate &&
    isInPast(
      result.onceDate,
      result.onceHour ?? 9,
      result.onceMinute ?? 0,
      result.oncePeriod ?? 'AM',
    )
  )
    return 'The selected date and time is in the past.';
  if (recurrence === 'daily') {
    if (!result.dailyDays || result.dailyDays.length === 0)
      return 'Select a date range.';
    if (
      result.dailyDays.every((d) =>
        isInPast(d.date, d.hour, d.minute, d.period),
      )
    )
      return 'All selected times are in the past.';
  }
  if (recurrence === 'custom') {
    if (!result.customDays || result.customDays.length === 0)
      return 'Select at least one date.';
    if (
      result.customDays.every((d) =>
        isInPast(d.date, d.hour, d.minute, d.period),
      )
    )
      return 'All selected times are in the past.';
  }
  return null;
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export default function RestockDatePickerModal({
  visible,
  recurrence,
  onClose,
  onConfirm,
}: Props) {
  const { colors } = useTheme();
  const [partialResult, setPartialResult] = useState<Partial<ScheduleResult>>(
    {},
  );
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible)
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }).start();
    else
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 200,
        useNativeDriver: true,
      }).start();
  }, [visible]);

  const updateResult = useCallback((partial: Partial<ScheduleResult>) => {
    setPartialResult((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleConfirm = () => {
    const err = validateResult(partialResult, recurrence);
    if (err) {
      Alert.alert('Invalid schedule', err);
      return;
    }
    onConfirm({ recurrence, ...partialResult });
    onClose();
  };

  const titles: Record<Recurrence, string> = {
    once: 'One-time Schedule',
    daily: 'Daily Schedule',
    weekly: 'Weekly Schedule',
    monthly: 'Monthly Schedule',
    custom: 'Custom Dates',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '92%',
            paddingBottom: Platform.OS === 'ios' ? 34 : 16,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginTop: 10,
              marginBottom: 4,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 15, color: colors.textSecondary }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              style={{ fontSize: 16, fontWeight: '700', color: colors.text }}
            >
              {titles[recurrence]}
            </Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: colors.primary,
                }}
              >
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {recurrence === 'once' && (
              <OnceSection colors={colors} onChange={updateResult} />
            )}
            {recurrence === 'daily' && (
              <DailySection colors={colors} onChange={updateResult} />
            )}
            {recurrence === 'weekly' && (
              <WeeklySection colors={colors} onChange={updateResult} />
            )}
            {recurrence === 'monthly' && (
              <MonthlySection colors={colors} onChange={updateResult} />
            )}
            {recurrence === 'custom' && (
              <CustomSection colors={colors} onChange={updateResult} />
            )}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 15,
                alignItems: 'center',
                marginTop: 20,
              }}
              onPress={handleConfirm}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                Confirm Schedule
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
