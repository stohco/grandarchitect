/**
 * Live Architect Studio — Error Boundary
 *
 * Catches errors from the 3D viewport (e.g. WebGL unavailable in headless
 * browsers) so the rest of the editor stays functional.
 */

'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  message: string;
}

export class ViewportErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Unknown error' };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[Viewport] Caught error:', error.message);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="dark flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-zinc-300">Viewport unavailable</p>
            <p className="mt-1 max-w-md text-xs text-zinc-600">
              The 3D viewport could not initialise. This usually means WebGL is not available
              in the current browser context. The rest of the editor remains functional —
              inspect entities via the Outliner and run the simulation from the World panel.
            </p>
            <p className="mt-2 font-mono text-[10px] text-zinc-700">{this.state.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
