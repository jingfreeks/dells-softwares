/// <reference types="nativewind/types" />

export {};

// `nativewind/types` re-exports react-native-css-interop's `declare module
// "react-native"` augmentation, but npm nests a second, incompatible
// react-native copy under node_modules/nativewind/node_modules (pulled in
// transitively via react-native-reanimated) -- that nested copy is what the
// npm-hoisted react-native-css-interop resolves "react-native" against, so
// the augmentation above lands on the wrong module and `className` doesn't
// type-check on our actual (top-level) react-native. Re-declared here,
// scoped to our own react-native, until the dependency tree is untangled.
declare module "react-native" {
  interface ViewProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TextProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface ImagePropsBase {
    className?: string;
    cssInterop?: boolean;
  }
  interface TextInputProps {
    className?: string;
    placeholderClassName?: string;
    cssInterop?: boolean;
  }
  interface ScrollViewProps {
    contentContainerClassName?: string;
    indicatorClassName?: string;
  }
  interface SwitchProps {
    className?: string;
    cssInterop?: boolean;
  }
}
