import { query } from '../config/database.js'

const columnCache = new Map()

function cacheKey(tableName, columnName) {
  return `${String(tableName).toLowerCase()}.${String(columnName).toLowerCase()}`
}

export async function hasColumn(tableName, columnName) {
  const key = cacheKey(tableName, columnName)
  if (columnCache.has(key)) {
    return columnCache.get(key)
  }

  const { rows, error } = await query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  )

  if (error) {
    return false
  }

  const exists = Number(rows?.[0]?.total || 0) > 0
  columnCache.set(key, exists)
  return exists
}
