import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            color: '#f87171',
            padding: '24px',
            background: '#0a0a1e',
            zIndex: 9999,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#ef4444' }}>
            OpenRally Encountered an Issue
          </h2>
          <p style={{ color: '#9ca3af', marginBottom: '20px', maxWidth: '600px', fontSize: '14px' }}>
            A rendering or physics exception occurred. You can reload the game or restore safe mobile defaults.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload Game
            </button>
            <button
              onClick={() => {
                if (typeof localStorage !== 'undefined') {
                  localStorage.removeItem('openrally_settings');
                }
                window.location.reload();
              }}
              style={{
                padding: '10px 20px',
                background: '#374151',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Graphics to Safe Defaults
            </button>
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '12px',
              background: '#111827',
              color: '#d1d5db',
              padding: '16px',
              borderRadius: '8px',
              maxWidth: '800px',
              textAlign: 'left',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
