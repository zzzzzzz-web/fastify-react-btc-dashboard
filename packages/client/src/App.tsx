import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Trade {
  price: number
  volume: number
  timestamp: number
  buyerMaker: boolean
}

interface ChartPoint {
  time: string
  price: number
}

interface ServerMessage {
  type: 'backfill' | 'trade' | 'candle' | 'price'
  trades?: Trade[]
  trade?: Trade
  price?: number
}

const MAX_CHART_POINTS = 300
const MAX_TRADES = 100

export default function App() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/stream`)
    wsRef.current = ws

    ws.addEventListener('open', () => {
      if (wsRef.current !== ws) return
      setStatus('connected')
    })
    ws.addEventListener('close', () => {
      if (wsRef.current !== ws) return
      setStatus('disconnected')
    })

    ws.addEventListener('message', (event: MessageEvent<string>) => {
      if (wsRef.current !== ws) return
      const msg = JSON.parse(event.data) as ServerMessage

      if (msg.type === 'backfill' && msg.trades) {
        const sorted = [...msg.trades].reverse()
        setTrades(msg.trades.slice(0, MAX_TRADES))
        setChartData(sorted.map(toChartPoint))
      }

      if (msg.type === 'trade' && msg.trade) {
        setTrades((prev) => [msg.trade!, ...prev].slice(0, MAX_TRADES))
        setChartData((prev) => [...prev, toChartPoint(msg.trade!)].slice(-MAX_CHART_POINTS))
      }

      if (msg.type === 'price' && msg.price !== undefined) {
        setCurrentPrice(msg.price)
      }
    })

    return () => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener('open', () => ws.close(), { once: true })
      } else {
        ws.close()
      }
    }
  }, [])

  const displayPrice = currentPrice ?? trades[0]?.price

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>BTC / USD</h1>
        <span style={{ ...styles.badge, background: status === 'connected' ? '#16a34a' : '#dc2626' }}>
          {status}
        </span>
      </header>

      {displayPrice !== undefined && (
        <div style={styles.price}>
          ${displayPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      )}

      <div style={styles.chart}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 4 }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#f0f0f0' }}
            />
            <Line type="monotone" dataKey="price" dot={false} stroke="#4ade80" strokeWidth={1.5} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.tradeList}>
        {trades.map((t, i) => (
          <div key={i} style={styles.tradeRow}>
            <span style={{ color: t.buyerMaker ? '#f87171' : '#4ade80' }}>
              {t.buyerMaker ? 'SELL' : 'BUY '}
            </span>
            <span style={styles.tradePrice}>
              ${t.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span style={styles.tradeVol}>{t.volume.toFixed(5)} BTC</span>
            <span style={styles.tradeTime}>{format(t.timestamp, 'HH:mm:ss.SSS')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function toChartPoint(trade: Trade): ChartPoint {
  return { time: format(trade.timestamp, 'HH:mm:ss'), price: trade.price }
}

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: 'monospace', background: '#0f0f0f', minHeight: '100vh', color: '#e0e0e0', padding: '1.5rem' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' },
  title: { fontSize: '1.5rem', margin: 0 },
  badge: { fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 9999, color: '#fff' },
  price: { fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f0f0f0' },
  chart: { marginBottom: '1.5rem' },
  tradeList: { display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '50vh', overflowY: 'auto' },
  tradeRow: { display: 'grid', gridTemplateColumns: '4rem 1fr 1fr 1fr', gap: '1rem', padding: '0.2rem 0.5rem', background: '#1a1a1a', fontSize: '0.8rem' },
  tradePrice: { color: '#f0f0f0' },
  tradeVol: { color: '#9ca3af' },
  tradeTime: { color: '#6b7280', textAlign: 'right' },
}
