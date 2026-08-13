import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
import { MediaService } from './mediaService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: number;
  userId: number;
  shiftId: number;
  shiftDate: string;
  status: 'PRESENT' | 'ON_BREAK' | 'OFF_DUTY' | 'ABSENT';
  // Time In
  timeIn: string | null;
  photoIn: string | null;
  noteIn: string | null;
  // Break Start
  breakStart: string | null;
  photoBreakStart: string | null;
  noteBreakStart: string | null;
  // Break End
  breakEnd: string | null;
  photoBreakEnd: string | null;
  noteBreakEnd: string | null;
  // Time Out
  timeOut: string | null;
  photoOut: string | null;
  noteOut: string | null;
  // Relations
  user?: { id: number; name: string; role: string; email: string };
  shift?: { id: number; name: string; startTime: string; endTime: string };
}

export interface PerformanceSummary {
  userId: number;
  totalWorkdays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  lateLogins: number;
  attendanceRate: number;       // 0.0–1.0
  avgLoginTimeMinutes: number | null;
}

export interface PaginatedAttendance {
  items: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UserAttendanceEntry {
  user: { id: number; name: string; role: string; email: string };
  attendance: AttendanceRecord | null;
  status: string;
}

export interface PaginatedUserAttendance {
  items: UserAttendanceEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type AttendanceActionType = 'timeIn' | 'startBreak' | 'endBreak' | 'timeOut';

// ─── Fragments ────────────────────────────────────────────────────────────────

const ATTENDANCE_FIELDS = gql`
  fragment AttendanceFields on Attendance {
    id userId shiftId shiftDate status
    timeIn photoIn noteIn
    breakStart photoBreakStart noteBreakStart
    breakEnd photoBreakEnd noteBreakEnd
    timeOut photoOut noteOut
    user { id name role email }
    shift { id name startTime endTime }
  }
`;

// ─── Service ──────────────────────────────────────────────────────────────────

export class AttendanceService {

  // ── Queries ────────────────────────────────────────────────────────────────

  static async getMyAttendanceToday(): Promise<AttendanceRecord | null> {
    const QUERY = gql`
      ${ATTENDANCE_FIELDS}
      query MyAttendanceToday {
        myAttendanceToday { ...AttendanceFields }
      }
    `;
    try {
      const res = await graphQLRequest<{ myAttendanceToday: AttendanceRecord | null }>(QUERY);
      return res.myAttendanceToday;
    } catch (error) {
      if (__DEV__) console.error('[AttendanceService] getMyAttendanceToday failed:', error);
      throw error;
    }
  }

  static async getMyAttendanceHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedAttendance> {
    const QUERY = gql`
      ${ATTENDANCE_FIELDS}
      query MyAttendanceHistory($page: Int, $limit: Int) {
        myAttendanceHistory(page: $page, limit: $limit) {
          items { ...AttendanceFields }
          total page limit hasMore
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ myAttendanceHistory: PaginatedAttendance }>(
        QUERY, { page, limit }
      );
      return res.myAttendanceHistory;
    } catch (error) {
      if (__DEV__) console.error('[AttendanceService] getMyAttendanceHistory failed:', error);
      throw error;
    }
  }

  static async getMyPerformanceSummary(
    from: string,
    to: string
  ): Promise<PerformanceSummary> {
    const QUERY = gql`
      query MyPerformanceSummary($from: String!, $to: String!) {
        myPerformanceSummary(from: $from, to: $to) {
          userId totalWorkdays presentDays absentDays
          halfDays lateLogins attendanceRate avgLoginTimeMinutes
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ myPerformanceSummary: PerformanceSummary }>(
        QUERY, { from, to }
      );
      return res.myPerformanceSummary;
    } catch (error) {
      if (__DEV__) console.error('[AttendanceService] getMyPerformanceSummary failed:', error);
      throw error;
    }
  }

  // ── Owner Queries ──────────────────────────────────────────────────────────

  static async getTodayAttendanceByOrg(
    page: number = 1,
    limit: number = 20,
    role?: string
  ): Promise<PaginatedUserAttendance> {
    const QUERY = gql`
      query TodayAttendanceByOrg($page: Int, $limit: Int, $role: String) {
        todayAttendanceByOrg(page: $page, limit: $limit, role: $role) {
          items {
            user { id name role email }
            attendance {
              id status timeIn breakStart breakEnd timeOut
              photoIn photoBreakStart photoBreakEnd photoOut
            }
            status
          }
          total page limit hasMore
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ todayAttendanceByOrg: PaginatedUserAttendance }>(
        QUERY, { page, limit, role: role || null }
      );
      return res.todayAttendanceByOrg;
    } catch (error) {
      if (__DEV__) console.error('[AttendanceService] getTodayAttendanceByOrg failed:', error);
      throw error;
    }
  }

  static async getUserAttendanceHistory(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedAttendance> {
    const QUERY = gql`
      ${ATTENDANCE_FIELDS}
      query UserAttendanceHistory($userId: Int!, $page: Int, $limit: Int) {
        userAttendanceHistory(userId: $userId, page: $page, limit: $limit) {
          items { ...AttendanceFields }
          total page limit hasMore
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ userAttendanceHistory: PaginatedAttendance }>(
        QUERY, { userId, page, limit }
      );
      return res.userAttendanceHistory;
    } catch (error) {
      if (__DEV__) console.error('[AttendanceService] getUserAttendanceHistory failed:', error);
      throw error;
    }
  }

  static async getUserPerformanceSummary(
    userId: number,
    from: string,
    to: string
  ): Promise<PerformanceSummary> {
    const QUERY = gql`
      query UserPerformanceSummary($userId: Int!, $from: String!, $to: String!) {
        userPerformanceSummary(userId: $userId, from: $from, to: $to) {
          userId totalWorkdays presentDays absentDays
          halfDays lateLogins attendanceRate avgLoginTimeMinutes
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ userPerformanceSummary: PerformanceSummary }>(
        QUERY, { userId, from, to }
      );
      return res.userPerformanceSummary;
    } catch (error) {
      if (__DEV__) console.error('[AttendanceService] getUserPerformanceSummary failed:', error);
      throw error;
    }
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  static async timeIn(
    photoFile: any,
    note: string,
    orgId: string
  ): Promise<AttendanceRecord> {
    const MUTATION = gql`
      ${ATTENDANCE_FIELDS}
      mutation TimeIn($photoIn: String!, $noteIn: String!) {
        timeIn(photoIn: $photoIn, noteIn: $noteIn) { ...AttendanceFields }
      }
    `;
    try {
      const { publicUrl } = await MediaService.uploadMedia(photoFile, orgId);
      const res = await graphQLRequest<{ timeIn: AttendanceRecord }>(MUTATION, {
        photoIn: publicUrl,
        noteIn: note,
      });
      return res.timeIn;
    } catch (error) {
      if (__DEV__) console.error('[AttendanceService] timeIn failed:', error);
      throw error;
    }
  }

  static async startBreak(
    photoFile: any,
    note: string,
    orgId: string
  ): Promise<AttendanceRecord> {
    const MUTATION = gql`
      ${ATTENDANCE_FIELDS}
      mutation StartBreak($photoBreakStart: String!, $noteBreakStart: String!) {
        startBreak(photoBreakStart: $photoBreakStart, noteBreakStart: $noteBreakStart) {
          ...AttendanceFields
        }
      }
    `;
    try {
      const { publicUrl } = await MediaService.uploadMedia(photoFile, orgId);
      const res = await graphQLRequest<{ startBreak: AttendanceRecord }>(MUTATION, {
        photoBreakStart: publicUrl,
        noteBreakStart: note,
      });
      return res.startBreak;
    } catch (error) {
      if (__DEV__) console.error('[AttendanceService] startBreak failed:', error);
      throw error;
    }
  }

  static async endBreak(
    photoFile: any,
    note: string,
    orgId: string
  ): Promise<AttendanceRecord> {
    const MUTATION = gql`
      ${ATTENDANCE_FIELDS}
      mutation EndBreak($photoBreakEnd: String!, $noteBreakEnd: String!) {
        endBreak(photoBreakEnd: $photoBreakEnd, noteBreakEnd: $noteBreakEnd) {
          ...AttendanceFields
        }
      }
    `;
    try {
      const { publicUrl } = await MediaService.uploadMedia(photoFile, orgId);
      const res = await graphQLRequest<{ endBreak: AttendanceRecord }>(MUTATION, {
        photoBreakEnd: publicUrl,
        noteBreakEnd: note,
      });
      return res.endBreak;
    } catch (error) {
      if (__DEV__) console.error('[AttendanceService] endBreak failed:', error);
      throw error;
    }
  }

  static async timeOut(
    photoFile: any,
    note: string,
    orgId: string
  ): Promise<AttendanceRecord> {
    const MUTATION = gql`
      ${ATTENDANCE_FIELDS}
      mutation TimeOut($photoOut: String!, $noteOut: String!) {
        timeOut(photoOut: $photoOut, noteOut: $noteOut) { ...AttendanceFields }
      }
    `;
    try {
      const { publicUrl } = await MediaService.uploadMedia(photoFile, orgId);
      const res = await graphQLRequest<{ timeOut: AttendanceRecord }>(MUTATION, {
        photoOut: publicUrl,
        noteOut: note,
      });
      return res.timeOut;
    } catch (error) {
      if (__DEV__) console.error('[AttendanceService] timeOut failed:', error);
      throw error;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Format avgLoginTimeMinutes (e.g. 542) → "9:02 AM" */
  static formatAvgLoginTime(minutes: number | null): string {
    if (minutes === null) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  /** Get default date range: first day of current month → today */
  static defaultDateRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const to = now.toISOString().split('T')[0];
    return { from, to };
  }

  /** Derive step lock state from a record */
  static getStepState(record: AttendanceRecord | null) {
    return {
      canTimeIn: !record?.timeIn,
      canStartBreak: !!record?.timeIn && !record?.breakStart && !record?.timeOut,
      canEndBreak: !!record?.breakStart && !record?.breakEnd,
      canTimeOut: !!record?.timeIn && !record?.timeOut,
      isDone: !!record?.timeOut,
    };
  }
}