import type { FeeBracket } from "../../../../lib/types";
import type { BracketTableKey } from "../../types";

export interface BracketTableCardProps {
  table: BracketTableKey;
  title: string;
  brackets: FeeBracket[];
  onFeeChange: (index: number, value: string) => void;
  onMaxChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}
