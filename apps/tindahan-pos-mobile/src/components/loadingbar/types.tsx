export interface LoadingBarProps {
  /** 0-1 fill fraction. Splash's reference shows a fixed 0.62 (§5 M-001) -- not animated here; TBD per §5. */
  progress: number;
  width?: number;
}
