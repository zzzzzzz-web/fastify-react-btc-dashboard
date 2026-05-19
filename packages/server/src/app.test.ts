import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildApp } from './app.js'
import type { FastifyInstance } from 'fastify'

const mockDeps = {
  getCandles: vi.fn().mockResolvedValue([]),
  getRecentTrades: vi.fn().mockResolvedValue([]),
  getRecentPrices: vi.fn().mockResolvedValue([]),
}

let app: FastifyInstance

afterEach(async () => {
  await app?.close()
  vi.clearAllMocks()
})

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    app = await buildApp(mockDeps)
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})

describe('GET /candles', () => {
  it('returns candle data for a valid range', async () => {
    const candles = [
      { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 1 },
    ]
    mockDeps.getCandles.mockResolvedValueOnce(candles)
    app = await buildApp(mockDeps)

    const res = await app.inject({ method: 'GET', url: '/candles?range=day' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual(candles)
    expect(mockDeps.getCandles).toHaveBeenCalledWith('day')
  })

  it('defaults to week when range is omitted', async () => {
    app = await buildApp(mockDeps)
    await app.inject({ method: 'GET', url: '/candles' })
    expect(mockDeps.getCandles).toHaveBeenCalledWith('week')
  })

  it('returns 400 for an invalid range', async () => {
    app = await buildApp(mockDeps)
    const res = await app.inject({
      method: 'GET',
      url: '/candles?range=invalid',
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'invalid range' })
  })

  it.each(['day', 'week', 'month', 'year'])(
    'accepts range=%s',
    async (range) => {
      app = await buildApp(mockDeps)
      const res = await app.inject({
        method: 'GET',
        url: `/candles?range=${range}`,
      })
      expect(res.statusCode).toBe(200)
    },
  )
})
