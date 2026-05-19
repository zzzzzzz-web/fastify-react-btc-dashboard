import { useEffect, useRef } from 'react'
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'

export interface PricePoint {
  price: number
  timestamp: number
}

interface LiveChartProps {
  data: PricePoint[]
}

const chartOptions = {
  layout: { background: { color: '#0f0f0f' }, textColor: '#9ca3af' },
  grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
  timeScale: {
    timeVisible: true,
    secondsVisible: true,
    borderColor: '#2a2a2a',
  },
  rightPriceScale: { borderColor: '#2a2a2a' },
  crosshair: {
    vertLine: { labelBackgroundColor: '#1a1a1a' },
    horzLine: { labelBackgroundColor: '#1a1a1a' },
  },
} as const

export default function LiveChart({ data }: LiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      ...chartOptions,
      height: 220,
      handleScroll: { mouseWheel: false },
      handleScale: { mouseWheel: false },
    })
    const series = chart.addSeries(LineSeries, {
      color: '#4ade80',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      lastValueVisible: true,
      priceLineVisible: false,
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
    if (!seriesRef.current || data.length === 0) return

    // Deduplicate by second — keep latest value per second
    const bySecond = new Map<number, number>()
    for (const p of data) {
      bySecond.set(Math.floor(p.timestamp / 1000), p.price)
    }
    const points = [...bySecond.entries()]
      .sort(([a], [b]) => a - b)
      .map(([time, value]) => ({ time: time as UTCTimestamp, value }))

    seriesRef.current.setData(points)
  }, [data])

  return <div ref={containerRef} style={{ width: '100%', height: 220 }} />
}
