import { Text } from "react-native";
import type { HeaderProps } from "./types";

export function Header({ title, stitle }: HeaderProps) {
  return (
    <>
      <Text className="text-[26px] font-medium leading-8 text-text-strong mb-2.5 mt-5">{title}</Text>
      <Text className="text-sm leading-[22px] text-text-dim mb-5">{stitle}</Text>
    </>
  );
}
