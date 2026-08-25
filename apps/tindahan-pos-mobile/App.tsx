import "./src/lib/polyfills";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { CashierSessionProvider, useCashierSession } from "./src/lib/cashierSession";
import { StoreDataProvider } from "./src/lib/storeData";
import { CashierPinScreen } from "./src/screens/CashierPinScreen";
import { CreateAccountScreen } from "./src/screens/CreateAccountScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { PairDeviceScreen } from "./src/screens/PairDeviceScreen";
import { PosScreen } from "./src/screens/PosScreen";
import { SetupRegisterScreen } from "./src/screens/SetupRegisterScreen";
import { SplashScreen } from "./src/screens/SplashScreen";

type AuthScreen = "signIn" | "createAccount" | "pairDevice";

/**
 * Sign In <-> Create Account switching (MOBILE_UI_DESIGN_SPECIFICATION.md
 * §5 M-002/M-003 "Proposed" cross-links) -- real local-state navigation,
 * Phase 3. Owner Home (M-004) is deliberately NOT wired in here: it's
 * still 100% static mockup data (§12/§18), so making it the real
 * post-sign-in destination would show fake sales numbers to an actual
 * signed-in user. That's a product decision for a later phase, not
 * something to default into -- the real post-login screen stays PosScreen.
 *
 * A brand-new counter device (no session at all yet) also starts here --
 * "Set up this device as a register" (mobile-pair-device.html) is the one
 * entry point reachable with no auth state, since pairing itself is how
 * that device gets a session in the first place.
 */
function AuthFlow() {
  const [screen, setScreen] = useState<AuthScreen>("signIn");

  if (screen === "createAccount") {
    return <CreateAccountScreen onSwitchToSignIn={() => setScreen("signIn")} />;
  }
  if (screen === "pairDevice") {
    return <PairDeviceScreen onBack={() => setScreen("signIn")} />;
  }
  return (
    <LoginScreen
      onSwitchToCreateAccount={() => setScreen("createAccount")}
      onSetupDevice={() => setScreen("pairDevice")}
    />
  );
}

/**
 * A paired device (mobile-pair-device.html/mobile-cashier-pin.html) has no
 * personal identity of its own -- it MUST pick a cashier and enter a PIN
 * before it can attribute any sale, so the PIN screen is a hard gate here.
 * An admin signed in on their own phone is NOT forced through this same
 * gate (see Root() below) -- that would regress the existing single-owner
 * flow for a product decision that was never confirmed; PIN-based
 * attribution is scoped to the shared-counter-device case this phase adds.
 */
function DeviceGate() {
  const { activeCashier, loading } = useCashierSession();

  if (loading) {
    return <SplashScreen />;
  }
  if (!activeCashier) {
    return <CashierPinScreen />;
  }
  return <PosScreen />;
}

function Root() {
  const { user, device, loading } = useAuth();
  const [showSetupRegister, setShowSetupRegister] = useState(false);

  if (loading) {
    return <SplashScreen />;
  }

  if (device) {
    return (
      <StoreDataProvider>
        <DeviceGate />
      </StoreDataProvider>
    );
  }

  if (!user) {
    return <AuthFlow />;
  }

  // Only an admin (the account created at registration) goes through the
  // wizard -- a cashier has no store settings to configure and always
  // lands straight on the register, matching the web app's own
  // OnboardingRoute (`user.role !== "admin" -> /pos`).
  const needsOnboarding = user.role === "admin" && !user.onboardedAt;

  if (showSetupRegister) {
    return <SetupRegisterScreen onBack={() => setShowSetupRegister(false)} />;
  }

  return (
    <StoreDataProvider>
      {needsOnboarding ? (
        <OnboardingScreen />
      ) : (
        <PosScreen onOpenSetupRegister={() => setShowSetupRegister(true)} />
      )}
    </StoreDataProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CashierSessionProvider>
          <Root />
        </CashierSessionProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
