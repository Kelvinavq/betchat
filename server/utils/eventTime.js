import moment from 'moment-timezone'

const MYSQL_TS_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

export function parseMysqlUtc(value) {
  if (!value) return null
  if (value instanceof Date) return moment(value)
  if (moment.isMoment(value)) return value.clone()

  const raw = String(value).trim()
  if (!raw) return null
  if (MYSQL_TS_RE.test(raw)) return moment.utc(raw, 'YYYY-MM-DD HH:mm:ss', true)
  return moment.parseZone(raw)
}

export function toMysqlUtc(value) {
  const m = parseMysqlUtc(value)
  return m && m.isValid() ? m.utc().format('YYYY-MM-DD HH:mm:ss') : null
}

export function toTimezoneIso(value, timezone) {
  if (!value) return value ?? null
  const m = parseMysqlUtc(value)
  if (!m || !m.isValid()) return value
  return timezone ? m.tz(timezone).format('YYYY-MM-DDTHH:mm:ssZ') : m.utc().format('YYYY-MM-DDTHH:mm:ss[Z]')
}
