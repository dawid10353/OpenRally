import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import {
  recordCrash,
  formatCrashReport,
  copyCrashReportToClipboard,
  type CrashLogEntry,
} from '@/utils/diagnostics/crashLogger';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  crashReport: string | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    crashReport: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
    try {
      const entry: CrashLogEntry = recordCrash(error, errorInfo);
      const report = formatCrashReport(entry);
      this.setState({ crashReport: report });
    } catch (e) {
      console.warn('[ErrorBoundary] Suppressed error formatting crash report:', e);
    }
  }

  private handleCopyDiagnostics = async () => {
    const report =
      this.state.crashReport ||
      `# OpenRally Crash Diagnostics\nError: ${this.state.error?.message || 'Unknown'}\nStack: ${this.state.error?.stack || 'N/A'}`;
    const success = await copyCrashReportToClipboard(report);
    if (success) {
      this.setState({ copied: true });
      setTimeout(() => {
        this.setState({ copied: false });
      }, 3000);
    }
  };

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
          <h2 style={{ fontSize: '24px', marginBottom: '8px', color: '#ef4444' }}>
            OpenRally Encountered an Issue
          </h2>
          <p style={{ color: '#9ca3af', marginBottom: '20px', maxWidth: '600px', fontSize: '14px' }}>
            A rendering or physics exception occurred. You can reload the game, copy local diagnostics, or restore safe mobile defaults.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 18px',
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
              onClick={this.handleCopyDiagnostics}
              style={{
                padding: '10px 18px',
                background: this.state.copied ? '#059669' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {this.state.copied ? '✓ Copied to Clipboard!' : '📋 Copy Crash Diagnostics'}
            </button>
            <button
              onClick={() => {
                if (typeof localStorage !== 'undefined') {
                  localStorage.removeItem('openrally_settings');
                }
                window.location.reload();
              }}
              style={{
                padding: '10px 18px',
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
              width: '90%',
              textAlign: 'left',
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {this.state.crashReport || this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
