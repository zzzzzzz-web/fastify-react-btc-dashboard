import postgres from 'postgres'
import type { Candle } from './types.js'

export function connectPostgres(): postgres.Sql {
  return postgres(
    process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/fastws',
  )
}

export async function storeCandle(
  sql: postgres.Sql,
  candle: Candle,
): Promise<void> {
  await sql`
    INSERT INTO candles_1m (time, open, high, low, close, volume)
    VALUES (${candle.time}, ${candle.open}, ${candle.high}, ${candle.low}, ${candle.close}, ${candle.volume})
    ON CONFLICT (time) DO UPDATE SET
      close  = EXCLUDED.close,
      high   = GREATEST(candles_1m.high, EXCLUDED.high),
      low    = LEAST(candles_1m.low, EXCLUDED.low),
      volume = candles_1m.volume + EXCLUDED.volume
  `
}

export type CandleRange = 'day' | 'week' | 'month' | 'year'

interface CandleRow {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export const rangeConfig: Record<
  CandleRange,
  { view: string; interval: string }
> = {
  day: { view: 'candles_1m', interval: '1 day' },
  week: { view: 'candles_1h', interval: '7 days' },
  month: { view: 'candles_1d', interval: '1 month' },
  year: { view: 'candles_1d', interval: '1 year' },
}

export async function getCandles(
  sql: postgres.Sql,
  range: CandleRange,
): Promise<CandleRow[]> {
  const { view, interval } = rangeConfig[range]
  return sql<CandleRow[]>`
    SELECT
      EXTRACT(EPOCH FROM time)::integer AS time,
      open, high, low, close, volume
    FROM ${sql(view)}
    WHERE time >= NOW() - ${interval}::interval
    ORDER BY time ASC
  `
}
