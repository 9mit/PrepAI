// @ts-nocheck
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends React.Component {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, message: (error && error.message) || 'Unexpected error' };
  }

  componentDidCatch(error, info) {
    console.error('PrepAI ErrorBoundary', error, info && info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-8 font-mono">
          <div className="glass-panel p-8 max-w-md border border-red-500/30 space-y-4">
            <h2 className="text-sm uppercase tracking-widest text-red-400">Something went wrong</h2>
            <p className="text-xs text-[var(--text-secondary)]">{this.state.message}</p>
            <button
              type="button"
              className="btn-secondary text-[10px] px-4 py-2"
              onClick={() => this.setState({ hasError: false, message: '' })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
