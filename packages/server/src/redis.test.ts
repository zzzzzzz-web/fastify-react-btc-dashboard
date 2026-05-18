import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  storeTrade,
  getRecentTrades,
  storePrice,
  getRecentPrices,
} from './redis.js'
import type { Trade } from './types.js'

const trade: Trade = {
  price: 50000,
  volume: 0.001,
  timestamp: 1000000,
  buyerMaker: false,
}

function mockClient() {
  return {
    lPush: vi.fn().mockResolvedValue(1),
    lTrim: vi.fn().mockResolvedValue('OK'),
    lRange: vi.fn().mockResolvedValue([]),
  }
}

describe('storeTrade', () => {
  it('pushes serialized trade to btc:trades', async () => {
    const client = mockClient()
    await storeTrade(client as never, trade)
    expect(client.lPush).toHaveBeenCalledWith('btc:trades', JSON.stringify(trade))
  })

  it('trims list to 500 entries', async () => {
    const client = mockClient()
    await storeTrade(client as never, trade)
    expect(client.lTrim).toHaveBeenCalledWith('btc:trades', 0, 499)
  })
})

describe('getRecentTrades', () => {
  it('returns empty array when list is empty', async () => {
    const client = mockClient()
    const result = await getRecentTrades(client as never)
    expect(result).toEqual([])
  })

  it('deserializes trades from redis', async () => {
    const client = mockClient()
    client.lRange.mockResolvedValueOnce([JSON.stringify(trade)])
    const result = await getRecentTrades(client as never)
    expect(result).toEqual([trade])
  })

  it('deserializes multiple trades', async () => {
    const client = mockClient()
    const trade2 = { ...trade, price: 51000 }
    client.lRange.mockResolvedValueOnce([
      JSON.stringify(trade),
      JSON.stringify(trade2),
    ])
    const result = await getRecentTrades(client as never)
    expect(result).toHaveLength(2)
    expect(result[1].price).toBe(51000)
  })
})

describe('storePrice', () => {
  it('pushes serialized price point to btc:prices', async () => {
    const client = mockClient()
    await storePrice(client as never, 50000, 123456)
    expect(client.lPush).toHaveBeenCalledWith(
      'btc:prices',
      JSON.stringify({ price: 50000, timestamp: 123456 }),
    )
  })

  it('trims list to 300 entries', async () => {
    const client = mockClient()
    await storePrice(client as never, 50000, 123456)
    expect(client.lTrim).toHaveBeenCalledWith('btc:prices', 0, 299)
  })
})

describe('getRecentPrices', () => {
  it('returns empty array when list is empty', async () => {
    const client = mockClient()
    const result = await getRecentPrices(client as never)
    expect(result).toEqual([])
  })

  it('deserializes price points from redis', async () => {
    const client = mockClient()
    client.lRange.mockResolvedValueOnce([
      JSON.stringify({ price: 50000, timestamp: 1000 }),
    ])
    const result = await getRecentPrices(client as never)
    expect(result).toEqual([{ price: 50000, timestamp: 1000 }])
  })
})
