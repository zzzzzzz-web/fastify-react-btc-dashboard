import WebSocket from 'ws'
import closeWithGrace from 'close-with-grace'
import { createCoinbaseFeed } from './coinbase.js'
import {
  connectRedis,
  storeTrade,
  getRecentTrades,
  storePrice,
  getRecentPrices,
} from './redis.js'
import { connectPostgres, storeCandle, getCandles } from './postgres.js'
import { createCandleAccumulator } from './candles.js'
import { buildApp } from './app.js'
import type { Trade, Candle } from './types.js'

const redis = await connectRedis()
const sql = connectPostgres()

const app = await buildApp({
  getCandles: (range) => getCandles(sql, range),
  getRecentTrades: () => getRecentTrades(redis),
  getRecentPrices: () => getRecentPrices(redis),
})

const clients = new Set<WebSocket>()

function broadcast(msg: unknown): void {
  const str = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(str)
  }
}

const accumulate = createCandleAccumulator((candle: Candle) => {
  storeCandle(sql, candle)
    .then(() => broadcast({ type: 'candle', candle }))
    .catch((err: unknown) => app.log.error(err, 'store candle failed'))
})

let lastTradeBroadcast = 0

const coinbase = createCoinbaseFeed(app.log)

coinbase.on('trade', (trade: Trade) => {
  accumulate(trade)

  const now = Date.now()
  if (now - lastTradeBroadcast < 100) return
  lastTradeBroadcast = now

  storeTrade(redis, trade)
    .then(() => broadcast({ type: 'trade', trade }))
    .catch((err: unknown) => app.log.error(err, 'store trade failed'))
})

coinbase.on('price', (price: number) => {
  const timestamp = Date.now()
  storePrice(redis, price, timestamp).catch((err: unknown) =>
    app.log.error(err, 'store price failed'),
  )
  broadcast({ type: 'price', price, timestamp })
})

await app.listen({ port: 3000, host: '0.0.0.0' })

closeWithGrace({ delay: 10_000 }, async ({ err }) => {
  if (err) app.log.error(err)
  for (const client of clients) client.close()
  await app.close()
  await redis.quit()
  await sql.end()
})
