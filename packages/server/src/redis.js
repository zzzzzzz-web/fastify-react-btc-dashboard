import { createClient } from 'redis'

const TRADE_KEY = 'btc:trades'
const MAX_TRADES = 500

export async function connectRedis() {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })
  await client.connect()
  return client
}

export async function storeTrade(client, trade) {
  await client.lPush(TRADE_KEY, JSON.stringify(trade))
  await client.lTrim(TRADE_KEY, 0, MAX_TRADES - 1)
}

// Returns trades newest-first (index 0 = most recent)
export async function getRecentTrades(client) {
  const items = await client.lRange(TRADE_KEY, 0, -1)
  return items.map(JSON.parse)
}
