import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TradeList, { type Trade } from './TradeList'

const buyTrade: Trade = {
  price: 50000.12,
  volume: 0.0015,
  timestamp: new Date('2024-01-01T12:00:00').getTime(),
  buyerMaker: false,
}

const sellTrade: Trade = {
  price: 49999.99,
  volume: 0.002,
  timestamp: new Date('2024-01-01T12:00:01').getTime(),
  buyerMaker: true,
}

describe('TradeList', () => {
  it('renders nothing for an empty list', () => {
    const { container } = render(<TradeList trades={[]} />)
    expect(container.firstChild?.childNodes).toHaveLength(0)
  })

  it('renders BUY for buyerMaker=false', () => {
    render(<TradeList trades={[buyTrade]} />)
    expect(screen.getByText('BUY')).toBeInTheDocument()
  })

  it('renders SELL for buyerMaker=true', () => {
    render(<TradeList trades={[sellTrade]} />)
    expect(screen.getByText('SELL')).toBeInTheDocument()
  })

  it('renders formatted price', () => {
    render(<TradeList trades={[buyTrade]} />)
    expect(screen.getByText('$50,000.12')).toBeInTheDocument()
  })

  it('renders volume with 4 decimal places', () => {
    render(<TradeList trades={[buyTrade]} />)
    expect(screen.getByText('0.0015 BTC')).toBeInTheDocument()
  })

  it('renders multiple trades', () => {
    render(<TradeList trades={[buyTrade, sellTrade]} />)
    expect(screen.getByText('BUY')).toBeInTheDocument()
    expect(screen.getByText('SELL')).toBeInTheDocument()
  })
})
