module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // `worklets: false` -- nativewind pulls in react-native-worklets/reanimated
      // transitively (for react-native-css-interop's optional reanimated
      // integration, unused here); without this, babel-preset-expo
      // auto-detects that nested package and tries to load
      // react-native-worklets/plugin from the project root, where it isn't
      // hoisted, breaking every Babel transform (Jest included).
      ["babel-preset-expo", { jsxImportSource: "nativewind", worklets: false }],
    ],
    overrides: [
      {
        // react-native-css-interop's babel plugin rewrites every
        // `React.createElement(...)` call (anywhere in the compiled file)
        // into `ReactNativeCSSInterop.createInteropElement(...)`, importing
        // that helper at module scope. jest.setup.ts's `@expo/vector-icons`
        // mock factory calls `React.createElement` directly, and that
        // module-scope import then trips babel-plugin-jest-hoist's
        // out-of-scope-variable check inside the `jest.mock()` factory.
        // This file has no NativeWind styling to apply, so `nativewind/babel`
        // (which base `presets` above deliberately omits) is added here for
        // everything except it.
        exclude: /jest\.setup\.ts$/,
        presets: ["nativewind/babel"],
      },
    ],
  };
};
