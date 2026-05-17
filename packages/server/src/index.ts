import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
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
import {
  connectPostgres,
  storeCandle,
  getCandles,
  CandleRange,
} from './postgres.js'
import { createCandleAccumulator } from './candles.js'
import type { Trade, Candle } from './types.js'

const fastify = Fastify({ logger: true })
await fastify.register(fastifyWebsocket)

const redis = await connectRedis()
const sql = connectPostgres()
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
    .catch((err: unknown) => fastify.log.error(err, 'store candle failed'))
})

let lastTradeBroadcast = 0

const coinbase = createCoinbaseFeed(fastify.log)

coinbase.on('trade', (trade: Trade) => {
  accumulate(trade)

  const now = Date.now()
  if (now - lastTradeBroadcast < 100) return
  lastTradeBroadcast = now

  storeTrade(redis, trade)
    .then(() => broadcast({ type: 'trade', trade }))
    .catch((err: unknown) => fastify.log.error(err, 'store trade failed'))
})

coinbase.on('price', (price: number) => {
  const timestamp = Date.now()
  storePrice(redis, price, timestamp).catch((err: unknown) =>
    fastify.log.error(err, 'store price failed'),
  )
  broadcast({ type: 'price', price, timestamp })
})

const VALID_RANGES = new Set<CandleRange>(['day', 'week', 'month', 'year'])

fastify.get<{ Querystring: { range?: string } }>(
  '/candles',
  async (req, reply) => {
    const range = (req.query.range ?? 'week') as CandleRange
    if (!VALID_RANGES.has(range)) {
      return reply.status(400).send({ error: 'invalid range' })
    }
    return getCandles(sql, range)
  },
)

fastify.get('/health', async () => ({ status: 'ok' }))

fastify.get('/stream', { websocket: true }, (socket) => {
  clients.add(socket)

  socket.on('close', () => clients.delete(socket))
  socket.on('error', (err: Error) => fastify.log.error(err, 'ws client error'))

  Promise.all([getRecentTrades(redis), getRecentPrices(redis)])
    .then(([trades, prices]) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'backfill', trades, prices }))
      }
    })
    .catch((err: unknown) => fastify.log.error(err, 'backfill failed'))
})

await fastify.listen({ port: 3000, host: '0.0.0.0' })

closeWithGrace({ delay: 10_000 }, async ({ err }) => {
  if (err) fastify.log.error(err)
  for (const client of clients) client.close()
  await fastify.close()
  await redis.quit()
  await sql.end()
})
