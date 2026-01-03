import React from 'react';

type State = { hasError: boolean; error?: Error | null };

class RootErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ROOT][ERROR_BOUNDARY]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', fontFamily: 'sans-serif', color: '#ef4444' }}>
          <h2 style={{ marginBottom: '8px' }}>Application error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#0f172a' }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RootErrorBoundary;
