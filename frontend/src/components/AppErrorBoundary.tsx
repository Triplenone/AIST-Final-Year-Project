import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render failed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-boot-error" role="alert">
          <h1>界面加载失败</h1>
          <p>请按 Ctrl+Shift+R 强制刷新，或在开发者工具中清除本站缓存后重试。</p>
          <pre>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
