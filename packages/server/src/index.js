import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import WebSocket from 'ws'
import { createBinanceFeed } from './binance.js'
import { connectRedis, storeTrade, getRecentTrades } from './redis.js'
import { connectPostgres, storeCandle } from './postgres.js'
import { createCandleAccumulator } from './candles.js'

const fastify = Fastify({ logger: true })
await fastify.register(fastifyWebsocket)

const redis = await connectRedis()
const sql = connectPostgres()
const clients = new Set()

function broadcast(msg) {
  const str = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(str)
  }
}

const accumulate = createCandleAccumulator(async (candle) => {
  await storeCandle(sql, candle)
  broadcast({ type: 'candle', candle })
})

let lastBroadcast = 0

const binance = createBinanceFeed(fastify.log)
binance.on('tick', (trade) => {
  accumulate(trade)

  const now = Date.now()
  if (now - lastBroadcast < 100) return
  lastBroadcast = now

  storeTrade(redis, trade)
    .then(() => broadcast({ type: 'trade', trade }))
    .catch((err) => fastify.log.error(err, 'store trade failed'))
})

fastify.get('/stream', { websocket: true }, (socket) => {
  clients.add(socket)

  socket.on('close', () => clients.delete(socket))
  socket.on('error', (err) => fastify.log.error(err, 'ws client error'))

  getRecentTrades(redis)
    .then((trades) => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'backfill', trades }))
      }
    })
    .catch((err) => fastify.log.error(err, 'backfill failed'))
})

await fastify.listen({ port: 3000, host: '0.0.0.0' })
