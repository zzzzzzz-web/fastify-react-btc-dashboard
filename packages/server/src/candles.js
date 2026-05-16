export function createCandleAccumulator(onClose) {
  let candle = null
  let currentMinute = null

  return function accumulate(trade) {
    const minute = Math.floor(trade.timestamp / 60_000) * 60_000

    if (currentMinute !== null && minute !== currentMinute) {
      onClose(candle)
      candle = null
    }

    currentMinute = minute

    if (!candle) {
      candle = {
        time: new Date(minute).toISOString(),
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.volume,
      }
    } else {
      if (trade.price > candle.high) candle.high = trade.price
      if (trade.price < candle.low) candle.low = trade.price
      candle.close = trade.price
      candle.volume += trade.volume
    }
  }
}
