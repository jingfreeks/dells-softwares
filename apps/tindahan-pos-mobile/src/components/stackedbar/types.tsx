export interface Segment {
  /** 0-1 share of the total width. Segments that don't sum to 1 just leave a gap at the end. */
  fraction: number;
  color: string;
}

export interface StackedBarProps {
  segments: Segment[];
  height?: number;
}
