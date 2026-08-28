import type { ChoiceCardData } from "../../types";

export interface ChoiceCardProps extends ChoiceCardData {
  onPress: () => void;
}
