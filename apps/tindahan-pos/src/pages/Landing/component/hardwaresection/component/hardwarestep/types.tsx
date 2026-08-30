import type { ReactNode } from "react";

export interface HardwareStepProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  highlighted?: boolean;
}
