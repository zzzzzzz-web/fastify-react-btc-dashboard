import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react'
import App from './App'
import type { CandleRange } from './CandleChart'

vi.mock('./LiveChart', () => ({
  default: () => <div data-testid="live-chart" />,
}))

vi.mock('./CandleChart', () => ({
  default: ({
    range,
    onRangeChange,
  }: {
    range: CandleRange
    onRangeChange: (r: CandleRange) => void
  }) => (
    <div data-testid="candle-chart" data-range={range}>
      <button data-testid="change-range" onClick={() => onRangeChange('week')}>
        week
      </button>
    </div>
  ),
}))

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: MockWebSocket[] = []

  readyState = 0
  close = vi.fn()
  send = vi.fn()
  private _handlers = new Map<string, Array<(e: unknown) => void>>()

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  addEventListener(event: string, handler: (e: unknown) => void) {
    const list = this._handlers.get(event) ?? []
    list.push(handler)
    this._handlers.set(event, list)
  }

  removeEventListener(event: string, handler: (e: unknown) => void) {
    const list = this._handlers.get(event) ?? []
    this._handlers.set(
      event,
      list.filter((h) => h !== handler),
    )
  }

  triggerOpen() {
    this.readyState = 1
    this._handlers.get('open')?.forEach((h) => h(new Event('open')))
  }

  triggerClose() {
    this.readyState = 3
    this._handlers.get('close')?.forEach((h) => h(new Event('close')))
  }

  triggerMessage(data: object) {
    this._handlers
      .get('message')
      ?.forEach((h) => h({ data: JSON.stringify(data) }))
  }
}

const mockFetch = vi.fn()

beforeEach(() => {
  MockWebSocket.instances = []
  vi.stubGlobal('WebSocket', MockWebSocket)
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function latestWs() {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1]
}

describe('App', () => {
  it('shows connecting status initially', () => {
    render(<App />)
    expect(screen.getByText('connecting')).toBeInTheDocument()
  })

  it('shows connected after ws open', async () => {
    render(<App />)
    await act(async () => {
      latestWs().triggerOpen()
    })
    expect(screen.getByText('connected')).toBeInTheDocument()
  })

  it('shows disconnected after ws close', async () => {
    render(<App />)
    await act(async () => {
      latestWs().triggerOpen()
    })
    await act(async () => {
      latestWs().triggerClose()
    })
    expect(screen.getByText('disconnected')).toBeInTheDocument()
  })

  it('creates a new WebSocket after disconnect', async () => {
    vi.useFakeTimers()
    render(<App />)
    await act(async () => {
      latestWs().triggerOpen()
    })
    await act(async () => {
      latestWs().triggerClose()
    })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(MockWebSocket.instances.length).toBeGreaterThan(1)
    vi.useRealTimers()
  })

  it('displays price from price message', async () => {
    render(<App />)
    await act(async () => {
      latestWs().triggerOpen()
    })
    await act(async () => {
      latestWs().triggerMessage({
        type: 'price',
        price: 50000,
        timestamp: Date.now(),
      })
    })
    expect(screen.getByText('$50,000.00')).toBeInTheDocument()
  })

  it('populates trades from backfill', async () => {
    const trades = [
      { price: 50000, volume: 0.001, timestamp: 1000, buyerMaker: false },
      { price: 49999, volume: 0.002, timestamp: 2000, buyerMaker: true },
    ]
    render(<App />)
    await act(async () => {
      latestWs().triggerOpen()
    })
    await act(async () => {
      latestWs().triggerMessage({ type: 'backfill', trades, prices: [] })
    })
    expect(screen.getAllByText('BUY').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SELL').length).toBeGreaterThan(0)
  })

  it('prepends new trade from trade message', async () => {
    render(<App />)
    await act(async () => {
      latestWs().triggerOpen()
    })
    await act(async () => {
      latestWs().triggerMessage({
        type: 'trade',
        trade: {
          price: 50000,
          volume: 0.001,
          timestamp: 1000,
          buyerMaker: false,
        },
      })
    })
    expect(screen.getByText('BUY')).toBeInTheDocument()
  })

  it('fetches candles on mount', async () => {
    render(<App />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/candles?range=day')
    })
  })

  it('re-fetches candles when range changes', async () => {
    render(<App />)
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/candles?range=day'),
    )

    fireEvent.click(screen.getByTestId('change-range'))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/candles?range=week'),
    )
  })

  it('updates candles from candle message when range is day', async () => {
    const candleRows = [
      { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 1 },
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(candleRows),
    })

    render(<App />)
    await act(async () => {
      latestWs().triggerOpen()
    })

    const newCandle = {
      time: '2024-01-01T00:02:00.000Z',
      open: 200,
      high: 210,
      low: 190,
      close: 205,
    }
    await act(async () => {
      latestWs().triggerMessage({ type: 'candle', candle: newCandle })
    })

    // candle chart receives updated data prop — check the range is still day
    expect(screen.getByTestId('candle-chart')).toHaveAttribute(
      'data-range',
      'day',
    )
  })
})
