import { describe, it, expect, vi } from 'vitest'
import { rangeConfig, getCandles } from './postgres.js'
import type { CandleRange } from './postgres.js'

describe('rangeConfig', () => {
  it.each<[CandleRange, string, string]>([
    ['day', 'candles_1m', '1 day'],
    ['week', 'candles_1h', '7 days'],
    ['month', 'candles_1d', '1 month'],
    ['year', 'candles_1d', '1 year'],
  ])('%s uses view=%s and interval=%s', (range, view, interval) => {
    expect(rangeConfig[range].view).toBe(view)
    expect(rangeConfig[range].interval).toBe(interval)
  })

  it('covers all four ranges', () => {
    expect(Object.keys(rangeConfig)).toEqual(['day', 'week', 'month', 'year'])
  })
})

describe('getCandles', () => {
  it('returns rows from sql result', async () => {
    const rows = [
      { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 1 },
    ]
    const mockSql = vi.fn().mockImplementation((...args: unknown[]) => {
      if (Array.isArray(args[0])) return Promise.resolve(rows)
      return args[0]
    })

    const result = await getCandles(mockSql as never, 'day')
    expect(result).toEqual(rows)
  })

  it('passes correct view identifier for each range', async () => {
    const identifiers: string[] = []
    const mockSql = vi.fn().mockImplementation((...args: unknown[]) => {
      if (Array.isArray(args[0])) return Promise.resolve([])
      identifiers.push(args[0] as string)
      return args[0]
    })

    for (const range of ['day', 'week', 'month', 'year'] as CandleRange[]) {
      identifiers.length = 0
      await getCandles(mockSql as never, range)
      expect(identifiers[0]).toBe(rangeConfig[range].view)
    }
  })
})
