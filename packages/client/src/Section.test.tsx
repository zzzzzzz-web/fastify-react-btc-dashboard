import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Section from './Section'

describe('Section', () => {
  it('renders the title', () => {
    render(
      <Section title="CANDLES">
        <div>content</div>
      </Section>,
    )
    expect(screen.getByText('CANDLES')).toBeInTheDocument()
  })

  it('shows children by default', () => {
    render(
      <Section title="TEST">
        <div>content</div>
      </Section>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('hides children after clicking the toggle button', () => {
    render(
      <Section title="TEST">
        <div>content</div>
      </Section>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('content')).not.toBeInTheDocument()
  })

  it('shows children again after toggling twice', () => {
    render(
      <Section title="TEST">
        <div>content</div>
      </Section>,
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('starts closed when defaultOpen=false', () => {
    render(
      <Section title="TEST" defaultOpen={false}>
        <div>content</div>
      </Section>,
    )
    expect(screen.queryByText('content')).not.toBeInTheDocument()
  })

  it('opens after clicking when defaultOpen=false', () => {
    render(
      <Section title="TEST" defaultOpen={false}>
        <div>content</div>
      </Section>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
