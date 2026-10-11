import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Called before the boundary re-renders its children, so callers can drop transient state that may have caused the error. */
  onRecover?: () => void;
  /** Compact fallback for a sub-tree (e.g. the 3D canvas) instead of the full-screen one. */
  inline?: boolean;
  label?: string;
}
interface State { error: Error | null; attempt: number }

/**
 * Last line of defence against a blank/black screen. A render error anywhere below this boundary would
 * otherwise unmount the whole React tree. Players get a way back in; the error goes to the console, never the UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0 };
  static getDerivedStateFromError(error: Error): Partial<State> { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, info.componentStack); }
  private recover = () => {
    try { this.props.onRecover?.(); } catch (e) { console.error('[ErrorBoundary] recovery handler failed', e); }
    this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));
  };
  render() {
    if (!this.state.error) return <div key={this.state.attempt} className="contents">{this.props.children}</div>;
    if (this.props.inline) {
      return (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-ink">
          <div className="panel rounded-xl px-5 py-4 text-center">
            <p className="font-display text-sm font-bold">{this.props.label ?? 'This view'} hit a problem</p>
            <button onClick={this.recover} className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Try again</button>
          </div>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 z-[200] flex items-center justify-center bg-ink px-6">
        <div className="panel-solid w-full max-w-sm rounded-xl p-6 text-center">
          <p className="font-display text-lg font-bold">Something went wrong</p>
          <p className="mt-1 text-sm text-white/60">Your progress is saved. You can carry on without refreshing.</p>
          <button onClick={this.recover} className="mt-5 w-full rounded-lg bg-accent px-4 py-3 text-[15px] font-semibold text-white">Back to the game</button>
        </div>
      </div>
    );
  }
}
