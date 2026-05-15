const DEFAULT_TZ = 'America/Bogota'
const LOCALE = 'es'

const d = (date) => (date instanceof Date ? date : new Date(date))
const parseInput = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  const raw = String(value).trim()
  if (!raw) return null
  if (/Z$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) return new Date(raw)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) return new Date(raw.replace(' ', 'T') + 'Z')
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T00:00:00Z`)
  return new Date(raw)
}

export const formatTime = (date, timezone = DEFAULT_TZ) =>
  d(date).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: timezone })

export const formatDate = (date, timezone = DEFAULT_TZ) =>
  d(date).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', timeZone: timezone })

export const formatDateShort = (date, timezone = DEFAULT_TZ) =>
  d(date).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', timeZone: timezone })

export const formatDateTime = (date, timezone = DEFAULT_TZ) =>
  d(date).toLocaleString(LOCALE, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone,
  })

export const formatDateMed = (date, timezone = DEFAULT_TZ) =>
  d(date).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: timezone })

// Returns YYYY-MM-DD string in the given timezone
export const toDateStr = (date, timezone = DEFAULT_TZ) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).formatToParts(d(date))
  const get = (t) => parts.find(p => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

export const relativeTime = (date, timezone = DEFAULT_TZ) => {
  const now = new Date()
  const ms = now - d(date)
  const mins = Math.floor(ms / 60000)

  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`

  const todayStr = toDateStr(now, timezone)
  const dateStr  = toDateStr(date, timezone)

  const [ty, tm, td] = todayStr.split('-').map(Number)
  const [dy, dm, dd] = dateStr.split('-').map(Number)
  const todayDate = new Date(Date.UTC(ty, tm - 1, td))
  const thatDate  = new Date(Date.UTC(dy, dm - 1, dd))
  const diffDays  = Math.round((todayDate - thatDate) / 86400000)

  if (diffDays === 1) return 'ayer'
  if (diffDays < 7)  return `hace ${diffDays} días`
  return formatDateShort(date, timezone)
}

// "Cargar día anterior" label from a YYYY-MM-DD string
export const prevDayLabel = (dateString, timezone = DEFAULT_TZ) => {
  if (!dateString) return 'Cargar día anterior'
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return `Cargar ${formatDateShort(date, timezone)}`
}

export const parseDateValue = (value) => parseInput(value)
