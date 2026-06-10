export type DateRangeFilter = 'today' | 'this_week' | 'this_month' | 'custom'

// dateHelpers.ts
export type DateRange = {
    startDate: Date    // ✅ Date not string
    endDate: Date
    label: string
}

export const getDateRange = (
    filter: DateRangeFilter,
    customStart?: Date,
    customEnd?: Date
): DateRange => {
    const now = new Date()
    const start = new Date(now)
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)

    switch (filter) {
        case 'today':
            start.setHours(0, 0, 0, 0)
            break
        case 'this_week':
            start.setDate(now.getDate() - now.getDay())
            start.setHours(0, 0, 0, 0)
            break
        case 'this_month':
            start.setDate(1)
            start.setHours(0, 0, 0, 0)
            break
        case 'custom':
            if (!customStart || !customEnd) {
                start.setHours(0, 0, 0, 0)
                return { startDate: start, endDate: end, label: 'Custom' }  // ✅ Date objects
            }
            return {
                startDate: customStart,   // ✅ already Date objects
                endDate: customEnd,
                label: `${formatShortDate(customStart)} → ${formatShortDate(customEnd)}`
            }
    }

    return {
        startDate: start,   // ✅ Date objects, not .toISOString()
        endDate: end,
        label: { today: 'Today', this_week: 'This Week', this_month: 'This Month', custom: 'Custom' }[filter]!
    }
}
export const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// FIX: Safe date parser — prevents NaN propagation from invalid ISO strings
// that can come from the backend (null, undefined, empty string, malformed).
export function safeParseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return date;
}


// FIX: Uses safeParseDate; handles null, future dates, and all edge cases.
export function timeAgo(iso?: string | null): string {
  const date = safeParseDate(iso);
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  if (diff < 0 || !isFinite(diff)) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// FIX: Uses safeParseDate; never throws or returns "Invalid Date".
export function formatTime(iso?: string | null): string {
  const date = safeParseDate(iso);
  if (!date) return '—';
  try {
    return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export function formatDateTime(iso?: string | null): string {
  const date = safeParseDate(iso);
  if (!date) return '—';

  try {
    const time = date.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const datePart = date.toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return `${time} ${datePart}`;
  } catch {
    return '—';
  }
}
