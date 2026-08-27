import "./global.css";
import "./src/lib/polyfills";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { CashierSessionProvider, useCashierSession } from "./src/lib/cashierSession";
import { StoreDataProvider } from "./src/lib/storeData";
import { CashierPinScreen } from "./src/screens/cashierpinscreen";
import { CreateAccountScreen } from "./src/screens/createaccountscreen";
import { InsightsScreen } from "./src/screens/insightsscreen";
import { LoginScreen } from "./src/screens/loginscreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { OwnerHomeScreen } from "./src/screens/ownerhomescreen";
import { PairDeviceScreen } from "./src/screens/pairdevicescreen";
import { PosScreen } from "./src/screens/PosScreen";
import { RestockScreen } from "./src/screens/restockscreen";
import { SetupRegisterScreen } from "./src/screens/SetupRegisterScreen";
import { SplashScreen } from "./src/screens/splashscreen";
import { TodaysSalesScreen } from "./src/screens/todayssalesscreen";
import { UtangScreen } from "./src/screens/utangscreen";

type AuthScreen = "signIn" | "createAccount" | "pairDevice";

/**
 * Sign In <-> Create Account switching (MOBILE_UI_DESIGN_SPECIFICATION.md
 * §5 M-002/M-003 "Proposed" cross-links) -- real local-state navigation,
 * Phase 3.
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

type OwnerTab = "home" | "sell" | "stock" | "utang";

/**
 * The admin's real post-onboarding home: Owner Home plus its drill-downs
 * (Today's Sales -> Insights, Restock, Utang) and the register itself, all
 * sharing the same BottomTabBar those screens were already built to
 * accept. "More" has no destination yet (§5/§7 TBD) -- tapping it is a
 * no-op rather than navigating to a blank screen.
 */
function AdminHome() {
  const { store } = useAuth();
  const [tab, setTab] = useState<OwnerTab>("home");
  const [showTodaysSales, setShowTodaysSales] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showSetupRegister, setShowSetupRegister] = useState(false);

  function handleChangeTab(next: string) {
    if (next !== "home" && next !== "sell" && next !== "stock" && next !== "utang") return;
    setTab(next);
  }

  if (showSetupRegister) {
    return <SetupRegisterScreen onBack={() => setShowSetupRegister(false)} />;
  }

  if (showInsights) {
    return <InsightsScreen onBack={() => setShowInsights(false)} />;
  }

  if (showTodaysSales) {
    return (
      <TodaysSalesScreen
        onBack={() => setShowTodaysSales(false)}
        storeName={store?.name ?? "Store"}
        onOpenInsights={() => setShowInsights(true)}
      />
    );
  }

  if (tab === "sell") {
    return (
      <PosScreen onOpenSetupRegister={() => setShowSetupRegister(true)} onOpenHome={() => setTab("home")} />
    );
  }

  if (tab === "stock") {
    return <RestockScreen activeTab={tab} onChangeTab={handleChangeTab} onBack={() => setTab("home")} />;
  }

  if (tab === "utang") {
    return <UtangScreen activeTab={tab} onChangeTab={handleChangeTab} onBack={() => setTab("home")} />;
  }

  return (
    <OwnerHomeScreen
      activeTab={tab}
      onChangeTab={handleChangeTab}
      onOpenTodaysSales={() => setShowTodaysSales(true)}
      onOpenRestock={() => setTab("stock")}
      onOpenUtang={() => setTab("utang")}
    />
  );
}

function Root() {
  const { user, device, loading } = useAuth();

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
  // wizard or sees the Owner Home dashboard -- a cashier with their own
  // staff login (as opposed to a PIN'd-in session on a shared device) has
  // no store settings or dashboard to see and always lands straight on
  // the register, matching the web app's own OnboardingRoute
  // (`user.role !== "admin" -> /pos`).
  const needsOnboarding = user.role === "admin" && !user.onboardedAt;

  return (
    <StoreDataProvider>
      {needsOnboarding ? <OnboardingScreen /> : user.role === "admin" ? <AdminHome /> : <PosScreen />}
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
