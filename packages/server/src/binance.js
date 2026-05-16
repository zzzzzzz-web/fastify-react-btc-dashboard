import { EventEmitter } from 'events'
import WebSocket from 'ws'

const BINANCE_WS = 'wss://stream.binance.us:9443/ws/btcusdt@aggTrade'

export function createBinanceFeed(log) {
  const emitter = new EventEmitter()
  let ws

  function connect() {
    log.info('binance: connecting...')
    ws = new WebSocket(BINANCE_WS)

    ws.on('open', () => log.info('binance: connected'))

    ws.on('message', (data) => {
      const raw = JSON.parse(data)
      emitter.emit('tick', {
        price: parseFloat(raw.p),
        volume: parseFloat(raw.q),
        timestamp: raw.T,
        buyerMaker: raw.m,
      })
    })

    ws.on('close', () => {
      log.warn('binance: disconnected, reconnecting in 3s')
      setTimeout(connect, 3000)
    })

    ws.on('error', (err) => {
      log.error(err, 'binance: ws error')
      ws.close()
    })
  }

  connect()
  return emitter
}
