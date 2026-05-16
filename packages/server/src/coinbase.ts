import { EventEmitter } from 'events'
import WebSocket from 'ws'
import type { FastifyBaseLogger } from 'fastify'
import type { Trade } from './types.js'

const COINBASE_WS = 'wss://advanced-trade-ws.coinbase.com'

interface CoinbaseTrade {
  trade_id: string
  product_id: string
  price: string
  size: string
  side: 'BUY' | 'SELL'
  time: string
}

interface CoinbaseTicker {
  type: string
  product_id: string
  price: string
}

interface CoinbaseEvent {
  type: 'snapshot' | 'update'
  trades?: CoinbaseTrade[]
  tickers?: CoinbaseTicker[]
}

interface CoinbaseMessage {
  channel: string
  events: CoinbaseEvent[]
}

export function createCoinbaseFeed(log: FastifyBaseLogger): EventEmitter {
  const emitter = new EventEmitter()
  let ws: WebSocket

  function connect(): void {
    log.info('coinbase: connecting...')
    ws = new WebSocket(COINBASE_WS)

    ws.on('open', () => {
      log.info('coinbase: connected')
      ws.send(JSON.stringify({ type: 'subscribe', product_ids: ['BTC-USD'], channel: 'market_trades' }))
      ws.send(JSON.stringify({ type: 'subscribe', product_ids: ['BTC-USD'], channel: 'ticker_batch' }))
    })

    ws.on('message', (data: WebSocket.RawData) => {
      const msg = JSON.parse(data.toString()) as CoinbaseMessage

      if (msg.channel === 'market_trades') {
        for (const event of msg.events) {
          for (const t of event.trades ?? []) {
            const trade: Trade = {
              price: parseFloat(t.price),
              volume: parseFloat(t.size),
              timestamp: new Date(t.time).getTime(),
              buyerMaker: t.side === 'SELL',
            }
            emitter.emit('trade', trade)
          }
        }
      }

      if (msg.channel === 'ticker_batch') {
        for (const event of msg.events) {
          for (const t of event.tickers ?? []) {
            emitter.emit('price', parseFloat(t.price))
          }
        }
      }
    })

    ws.on('close', () => {
      log.warn('coinbase: disconnected, reconnecting in 3s')
      setTimeout(connect, 3000)
    })

    ws.on('error', (err: Error) => {
      log.error(err, 'coinbase: ws error')
      ws.close()
    })
  }

  connect()
  return emitter
}
