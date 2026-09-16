import AsyncStorage from '@react-native-async-storage/async-storage'

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000
export const SESSION_ACTIVITY_KEY = 'portal_session_last_activity_at'

const STORAGE_WRITE_THROTTLE_MS = 15 * 1000

let lastActivityAt: number | null = null
let lastStorageWriteAt = 0

function validTimestamp(value: string | null) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function readStoredActivity() {
  return validTimestamp(await AsyncStorage.getItem(SESSION_ACTIVITY_KEY))
}

async function persistActivity(timestamp: number) {
  lastStorageWriteAt = timestamp
  await AsyncStorage.setItem(SESSION_ACTIVITY_KEY, String(timestamp))
}

export async function restoreSessionActivity() {
  const stored = await readStoredActivity()
  if (stored != null) {
    lastActivityAt = Math.max(lastActivityAt ?? 0, stored)
    lastStorageWriteAt = Math.max(lastStorageWriteAt, stored)
  }
  return lastActivityAt
}

export async function startSessionActivity(now = Date.now()) {
  lastActivityAt = now
  await persistActivity(now)
  return now
}

export function recordSessionActivity(now = Date.now()) {
  lastActivityAt = now
  if (now - lastStorageWriteAt >= STORAGE_WRITE_THROTTLE_MS) {
    void persistActivity(now).catch(() => {})
  }
}

export function recordSessionActivityIfActive(now = Date.now()) {
  if (lastActivityAt != null && sessionInactivityElapsed(now, lastActivityAt)) return false
  recordSessionActivity(now)
  return true
}

export async function flushSessionActivity() {
  if (lastActivityAt != null && lastActivityAt > lastStorageWriteAt) {
    await persistActivity(lastActivityAt)
  }
}

export async function isSessionInactive(now = Date.now(), reloadStored = false) {
  if (reloadStored || lastActivityAt == null) await restoreSessionActivity()
  return lastActivityAt != null && now - lastActivityAt >= INACTIVITY_TIMEOUT_MS
}

export async function clearSessionActivity() {
  lastActivityAt = null
  lastStorageWriteAt = 0
  await AsyncStorage.removeItem(SESSION_ACTIVITY_KEY)
}

export function sessionInactivityElapsed(now: number, activityAt: number) {
  return now - activityAt >= INACTIVITY_TIMEOUT_MS
}
