import { useMemo } from 'react'
import { useSystemConfig } from '../context/SystemConfigContext'
import {
  formatTime, formatDate, formatDateShort, formatDateTime,
  formatDateMed, relativeTime, prevDayLabel, toDateStr,
} from '../utils/dateUtils'

export function useDateFormat() {
  const { systemConfig } = useSystemConfig()
  const tz = systemConfig.timezone || 'America/Bogota'

  return useMemo(() => ({
    timezone: tz,
    formatTime:      (date) => formatTime(date, tz),
    formatDate:      (date) => formatDate(date, tz),
    formatDateShort: (date) => formatDateShort(date, tz),
    formatDateTime:  (date) => formatDateTime(date, tz),
    formatDateMed:   (date) => formatDateMed(date, tz),
    relativeTime:    (date) => relativeTime(date, tz),
    prevDayLabel:    (dateStr) => prevDayLabel(dateStr, tz),
    toDateStr:       (date) => toDateStr(date, tz),
  }), [tz])
}
