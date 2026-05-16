import postgres from 'postgres'

export function connectPostgres() {
  return postgres(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/fastws')
}

export async function storeCandle(sql, candle) {
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
