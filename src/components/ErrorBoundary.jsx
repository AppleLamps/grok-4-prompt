import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface errors to the console for debugging; avoids breaking the UI
    // eslint-disable-next-line no-console
    console.error('Uncaught UI error:', error, info);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-ui p-8 sm:p-12 lg:p-16 text-center space-y-4">
          <div className="text-2xl sm:text-3xl font-bold text-premium-100 premium-text">Something went wrong.</div>
          <p className="text-premium-200">We hit an unexpected issue. Please try again.</p>
          <button
            type="button"
            onClick={this.handleReload}
            className="copy-button px-4 py-2 inline-flex items-center justify-center gap-2"
            aria-label="Reload the page"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

