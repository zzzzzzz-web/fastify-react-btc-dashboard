import { describe, it, expect, vi, beforeEach } from 'vitest'

const MockWebSocket = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter } = require('events')

  class MockWS extends EventEmitter {
    static instances: MockWS[] = []
    url: string
    send = vi.fn()
    close = vi.fn()

    constructor(url: string) {
      super()
      this.url = url
      MockWS.instances.push(this)
    }
  }

  return MockWS
})

vi.mock('ws', () => ({ default: MockWebSocket }))

import { createCoinbaseFeed } from './coinbase.js'

const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as never

beforeEach(() => {
  MockWebSocket.instances = []
  vi.clearAllMocks()
})

function latestWs() {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1]
}

describe('createCoinbaseFeed', () => {
  it('connects to the Coinbase WebSocket URL', () => {
    createCoinbaseFeed(mockLog)
    expect(latestWs().url).toBe('wss://advanced-trade-ws.coinbase.com')
  })

  it('subscribes to market_trades and ticker_batch on open', () => {
    createCoinbaseFeed(mockLog)
    latestWs().emit('open')

    const calls = latestWs().send.mock.calls.map((c: string[]) => JSON.parse(c[0]))
    expect(calls).toContainEqual(
      expect.objectContaining({ type: 'subscribe', channel: 'market_trades' }),
    )
    expect(calls).toContainEqual(
      expect.objectContaining({ type: 'subscribe', channel: 'ticker_batch' }),
    )
  })

  it('emits trade event from market_trades message', () => {
    const feed = createCoinbaseFeed(mockLog)
    const handler = vi.fn()
    feed.on('trade', handler)

    latestWs().emit(
      'message',
      JSON.stringify({
        channel: 'market_trades',
        events: [
          {
            type: 'update',
            trades: [
              {
                trade_id: '1',
                product_id: 'BTC-USD',
                price: '50000.00',
                size: '0.001',
                side: 'BUY',
                time: '2024-01-01T12:00:00.000Z',
              },
            ],
          },
        ],
      }),
    )

    expect(handler).toHaveBeenCalledWith({
      price: 50000,
      volume: 0.001,
      timestamp: new Date('2024-01-01T12:00:00.000Z').getTime(),
      buyerMaker: false,
    })
  })

  it('sets buyerMaker=true for SELL side', () => {
    const feed = createCoinbaseFeed(mockLog)
    const handler = vi.fn()
    feed.on('trade', handler)

    latestWs().emit(
      'message',
      JSON.stringify({
        channel: 'market_trades',
        events: [
          {
            type: 'update',
            trades: [
              { trade_id: '1', product_id: 'BTC-USD', price: '50000', size: '0.001', side: 'SELL', time: '2024-01-01T00:00:00Z' },
            ],
          },
        ],
      }),
    )

    expect(handler.mock.calls[0][0].buyerMaker).toBe(true)
  })

  it('emits price event from ticker_batch message', () => {
    const feed = createCoinbaseFeed(mockLog)
    const handler = vi.fn()
    feed.on('price', handler)

    latestWs().emit(
      'message',
      JSON.stringify({
        channel: 'ticker_batch',
        events: [
          {
            type: 'update',
            tickers: [{ type: 'ticker', product_id: 'BTC-USD', price: '50000.50' }],
          },
        ],
      }),
    )

    expect(handler).toHaveBeenCalledWith(50000.5)
  })

  it('emits multiple trades from a single message', () => {
    const feed = createCoinbaseFeed(mockLog)
    const handler = vi.fn()
    feed.on('trade', handler)

    latestWs().emit(
      'message',
      JSON.stringify({
        channel: 'market_trades',
        events: [
          {
            type: 'update',
            trades: [
              { trade_id: '1', product_id: 'BTC-USD', price: '100', size: '1', side: 'BUY', time: '2024-01-01T00:00:00Z' },
              { trade_id: '2', product_id: 'BTC-USD', price: '200', size: '2', side: 'SELL', time: '2024-01-01T00:00:01Z' },
            ],
          },
        ],
      }),
    )

    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('closes the WebSocket on error', () => {
    createCoinbaseFeed(mockLog)
    const ws = latestWs()
    ws.emit('error', new Error('connection error'))
    expect(ws.close).toHaveBeenCalled()
  })

  it('reconnects after 3s on close', () => {
    vi.useFakeTimers()
    createCoinbaseFeed(mockLog)
    expect(MockWebSocket.instances).toHaveLength(1)

    latestWs().emit('close')
    expect(MockWebSocket.instances).toHaveLength(1)

    vi.advanceTimersByTime(3000)
    expect(MockWebSocket.instances).toHaveLength(2)

    vi.useRealTimers()
  })
})
