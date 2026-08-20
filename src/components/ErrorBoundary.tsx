import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
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
    console.error('Unhandled React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="card p-6 my-4 border-l-4 border-red-500 bg-surface-1 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-600 text-lg flex items-center gap-2">
              <span>⚠️</span> Error al cargar la vista
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Reintentar vista
            </button>
          </div>
          <p className="text-sm text-secondary mb-3">
            Ocurrió un problema de renderizado. Puede presionar Reintentar o recargar la página.
          </p>
          {this.state.error && (
            <pre className="text-xs p-3 rounded bg-surface-2 overflow-x-auto text-red-500 font-mono">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
