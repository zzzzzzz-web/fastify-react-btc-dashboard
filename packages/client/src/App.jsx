import { useEffect, useRef, useState } from 'react'

export default function App() {
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('connecting')
  const wsRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket(`ws://${location.host}/stream`)
    wsRef.current = ws

    ws.addEventListener('open', () => setStatus('connected'))
    ws.addEventListener('close', () => setStatus('disconnected'))
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data)
      setMessages((prev) => [data, ...prev].slice(0, 50))
    })

    return () => ws.close()
  }, [])

  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem', background: '#0f0f0f', minHeight: '100vh', color: '#e0e0e0' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>WebSocket Stream</h1>
      <p style={{ marginBottom: '1rem', color: status === 'connected' ? '#4ade80' : '#f87171' }}>
        {status}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {messages.map((msg) => (
          <div
            key={msg.tick}
            style={{ padding: '0.25rem 0.5rem', background: '#1a1a1a', borderLeft: '3px solid #4ade80' }}
          >
            tick {msg.tick} &mdash; {new Date(msg.timestamp).toISOString()}
          </div>
        ))}
      </div>
    </div>
  )
}
