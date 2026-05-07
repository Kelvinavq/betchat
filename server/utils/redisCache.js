import { config } from '../config/config.js'

let clientPromise = null
let warnedMissingPackage = false
let warnedConnection = false

async function getRedisClient() {
  if (!config.redis.enabled) return null
  if (clientPromise) return clientPromise

  clientPromise = (async () => {
    try {
      const { createClient } = await import('redis')
      const client = createClient({ url: config.redis.url })
      client.on('error', (error) => {
        if (!warnedConnection) {
          warnedConnection = true
          console.warn('Redis cache unavailable:', error.message)
        }
      })
      await client.connect()
      return client
    } catch (error) {
      clientPromise = null
      if (error?.code === 'ERR_MODULE_NOT_FOUND' && !warnedMissingPackage) {
        warnedMissingPackage = true
        console.warn('Redis package is not installed. Run "npm install redis" in server/ to enable message cache.')
      } else if (!warnedConnection) {
        warnedConnection = true
        console.warn('Redis cache disabled:', error.message)
      }
      return null
    }
  })()

  return clientPromise
}

export async function getCacheJson(key) {
  const client = await getRedisClient()
  if (!client) return null

  try {
    const value = await client.get(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export async function setCacheJson(key, value, ttlSeconds = config.redis.messageTtlSeconds) {
  const client = await getRedisClient()
  if (!client) return

  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds })
  } catch {
    // Cache writes are best-effort; MySQL remains the source of truth.
  }
}

export async function deleteCache(key) {
  const client = await getRedisClient()
  if (!client) return

  try {
    await client.del(key)
  } catch {
    // Best-effort invalidation.
  }
}

export async function deleteCachePattern(pattern) {
  const client = await getRedisClient()
  if (!client) return

  try {
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      await client.del(key)
    }
  } catch {
    // Best-effort invalidation.
  }
}
