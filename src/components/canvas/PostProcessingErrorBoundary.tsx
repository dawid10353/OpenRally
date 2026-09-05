import { Component, type ReactNode, type ErrorInfo } from 'react';

export interface PostProcessingErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface PostProcessingErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Robust Error Boundary isolating the WebGL post-processing pipeline.
 *
 * Rationale:
 * Post-processing passes (Bloom, SMAA, ToneMapping) allocate multiple off-screen
 * framebuffers, ping-pong render targets, and custom convolution shaders. On mobile
 * GPUs (e.g. Google Tensor, Mali, Adreno) or under resource constraints, mipmap generation,
 * floating-point precision differences, or unsupported WebGL2 extensions can throw
 * unhandled WebGL/JS errors inside the render loop.
 *
 * This boundary catches any such failure, prevents the 3D scene from crashing into a white
 * screen, and seamlessly falls back to standard direct-to-screen rendering.
 */
export class PostProcessingErrorBoundary extends Component<
  PostProcessingErrorBoundaryProps,
  PostProcessingErrorBoundaryState
> {
  public override state: PostProcessingErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  public static getDerivedStateFromError(error: Error): PostProcessingErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown post-processing error',
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.warn(
      '[PostProcessingErrorBoundary] Post-processing pipeline encountered an error. Falling back to direct rendering:',
      error,
      errorInfo,
    );
    this.props.onError?.(error, errorInfo);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
