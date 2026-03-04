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