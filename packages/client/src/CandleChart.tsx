import { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'

export type CandleRange = 'day' | 'week' | 'month' | 'year'

export interface CandlePoint {
  time: number
  open: number
  high: number
  low: number
  close: number
}

interface CandleChartProps {
  data: CandlePoint[]
  range: CandleRange
  onRangeChange: (r: CandleRange) => void
}

const RANGES: CandleRange[] = ['day', 'week', 'month', 'year']

const chartOptions = {
  layout: { background: { color: '#0f0f0f' }, textColor: '#9ca3af' },
  grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
  timeScale: { timeVisible: true, borderColor: '#2a2a2a' },
  rightPriceScale: { borderColor: '#2a2a2a' },
  crosshair: {
    vertLine: { labelBackgroundColor: '#1a1a1a' },
    horzLine: { labelBackgroundColor: '#1a1a1a' },
  },
} as const

export default function CandleChart({
  data,
  range,
  onRangeChange,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      ...chartOptions,
      height: 300,
      handleScroll: { mouseWheel: false },
      handleScale: { mouseWheel: false },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#4ade80',
      downColor: '#f87171',
      borderVisible: false,
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    })

    chartRef.current = chart
    seriesRef.current = series

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift')
        chart.applyOptions({
          handleScroll: { mouseWheel: true },
          handleScale: { mouseWheel: true },
        })
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift')
        chart.applyOptions({
          handleScroll: { mouseWheel: false },
          handleScale: { mouseWheel: false },
        })
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current!.offsetWidth })
    })
    ro.observe(containerRef.current)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current) return
    seriesRef.current.setData(
      data.map((c) => ({ ...c, time: c.time as UTCTimestamp })),
    )
    if (data.length > 0) chartRef.current?.timeScale().fitContent()
  }, [data])

  return (
    <div style={styles.wrapper}>
      <div style={styles.controls}>
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => onRangeChange(r)}
            style={{
              ...styles.btn,
              background: r === range ? '#2a2a2a' : 'transparent',
              color: r === range ? '#f0f0f0' : '#6b7280',
              borderColor: r === range ? '#444' : '#2a2a2a',
            }}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>
      <div ref={containerRef} style={{ width: '100%', height: 300 }} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { marginBottom: '1.5rem' },
  controls: { display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' },
  btn: {
    border: '1px solid #2a2a2a',
    borderRadius: 4,
    padding: '0.15rem 0.5rem',
    fontSize: '0.7rem',
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
}
