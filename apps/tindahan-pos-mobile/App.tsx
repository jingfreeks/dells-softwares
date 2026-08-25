import "./src/lib/polyfills";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { StoreDataProvider } from "./src/lib/storeData";
import { CreateAccountScreen } from "./src/screens/CreateAccountScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { PosScreen } from "./src/screens/PosScreen";
import { SplashScreen } from "./src/screens/SplashScreen";

type AuthScreen = "signIn" | "createAccount";

/**
 * Sign In <-> Create Account switching (MOBILE_UI_DESIGN_SPECIFICATION.md
 * §5 M-002/M-003 "Proposed" cross-links) -- real local-state navigation,
 * Phase 3. Owner Home (M-004) is deliberately NOT wired in here: it's
 * still 100% static mockup data (§12/§18), so making it the real
 * post-sign-in destination would show fake sales numbers to an actual
 * signed-in user. That's a product decision for Phase 4, not something
 * to default into -- the real post-login screen stays PosScreen.
 */
function AuthFlow() {
  const [screen, setScreen] = useState<AuthScreen>("signIn");

  if (screen === "createAccount") {
    return <CreateAccountScreen onSwitchToSignIn={() => setScreen("signIn")} />;
  }
  return <LoginScreen onSwitchToCreateAccount={() => setScreen("createAccount")} />;
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthFlow />;
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
