import React from 'react';

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('Unhandled application error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 text-center" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold">خطایی در نمایش صفحه رخ داد</h1>
          <p className="mt-3 text-muted-foreground">لطفاً صفحه را دوباره بارگذاری کنید.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-primary px-5 py-3 text-primary-foreground"
          >
            بارگذاری دوباره
          </button>
        </div>
      </main>
    );
  }
}

export default AppErrorBoundary;
