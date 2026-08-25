jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

// Feather's real implementation kicks off async font-loading state updates
// (createIconSet's Icon component) that fire after a test has already
// finished, producing "not wrapped in act(...)" warnings unrelated to
// anything under test. Stub it out to a plain, synchronous component.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Feather: (props: { name: string }) => React.createElement(Text, null, props.name) };
});

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});
