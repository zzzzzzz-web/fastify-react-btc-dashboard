import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: 'monospace',
            background: '#0f0f0f',
            color: '#f87171',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontSize: '1rem' }}>something went wrong</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {this.state.error.message}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
