import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: "#0a0a0f" }}>
          <div className="max-w-2xl w-full bg-gray-900 rounded-lg p-8 border border-red-500">
            <div className="flex items-center gap-4 mb-6">
              <AlertTriangle className="w-12 h-12 text-red-500" />
              <div>
                <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
                <p className="text-gray-400 mt-1">The application encountered an unexpected error.</p>
              </div>
            </div>

            {this.state.error && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white mb-2">Error Details:</h2>
                <pre className="bg-black p-4 rounded text-red-400 text-sm overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}

            {this.state.errorInfo && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">Stack Trace:</h2>
                <pre className="bg-black p-4 rounded text-gray-400 text-xs overflow-auto max-h-64">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
