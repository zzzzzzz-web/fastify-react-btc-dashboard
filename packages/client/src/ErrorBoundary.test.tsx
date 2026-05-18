import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function Throws(): never {
  throw new Error('test error')
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(<ErrorBoundary><div>content</div></ErrorBoundary>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders error UI when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Throws /></ErrorBoundary>)
    expect(screen.getByText('something went wrong')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('displays the error message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Throws /></ErrorBoundary>)
    expect(screen.getByText('test error')).toBeInTheDocument()
    spy.mockRestore()
  })
})
