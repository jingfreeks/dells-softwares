import "./src/lib/polyfills";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { StoreDataProvider } from "./src/lib/storeData";
import { LoginScreen } from "./src/screens/LoginScreen";
import { PosScreen } from "./src/screens/PosScreen";

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <StoreDataProvider>
      <PosScreen />
    </StoreDataProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
});
