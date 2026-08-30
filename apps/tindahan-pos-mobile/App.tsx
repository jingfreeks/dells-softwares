import "./global.css";
import "./src/lib/polyfills";
import { useState } from "react";
import { Linking, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { BillingProvider, useBillingState } from "./src/lib/billing";
import { CashierSessionProvider, useCashierSession } from "./src/lib/cashierSession";
import { StoreDataProvider } from "./src/lib/storeData";
import { daysUntil } from "./src/lib/trialCountdown";
import { useTrialExpiredGate } from "./src/lib/useTrialExpiredGate";
import { TrialBanner } from "./src/components/trialbanner";
import { CashierPinScreen } from "./src/screens/cashierpinscreen";
import { CreateAccountScreen } from "./src/screens/createaccountscreen";
import { DemoStoreScreen } from "./src/screens/demostorescreen";
import { InsightsScreen } from "./src/screens/insightsscreen";
import { LoginScreen } from "./src/screens/loginscreen";
import { OnboardingScreen } from "./src/screens/onboardingscreen";
import { OwnerHomeScreen } from "./src/screens/ownerhomescreen";
import { PairDeviceScreen } from "./src/screens/pairdevicescreen";
import { PosScreen } from "./src/screens/posscreen";
import { PricingScreen } from "./src/screens/pricingscreen";
import { RestockScreen } from "./src/screens/restockscreen";
import { SettingsMenuScreen } from "./src/screens/settingsmenuscreen";
import type { SettingsSectionKey } from "./src/screens/settingsmenuscreen/types";
import { SettingsProfileScreen } from "./src/screens/settingsprofilescreen";
import { SetupRegisterScreen } from "./src/screens/setupregisterscreen";
import { SplashScreen } from "./src/screens/splashscreen";
import { TodaysSalesScreen } from "./src/screens/todayssalesscreen";
import { TrialExpiredScreen } from "./src/screens/trialexpiredscreen";
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
 * accept. "More" opens Settings -- the hub for profile/store/receipts/
 * fees/alerts/backup, matching the desktop sidebar's own six sections.
 *
 * TrialBanner mounts here, above whichever tab renders -- same reasoning
 * as the web app's BillingBanner (shown on every protected route, not
 * only the dashboard): trial state is a fact about the whole store, not
 * one screen.
 */
function AdminHome() {
  const { store } = useAuth();
  const billing = useBillingState();
  const [tab, setTab] = useState<OwnerTab>("home");
  const [showTodaysSales, setShowTodaysSales] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showSetupRegister, setShowSetupRegister] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionKey | null>(null);

  function handleChangeTab(next: string) {
    if (next === "more") {
      setShowSettings(true);
      return;
    }
    if (next !== "home" && next !== "sell" && next !== "stock" && next !== "utang") return;
    setTab(next);
  }

  if (settingsSection === "profile") {
    return <SettingsProfileScreen onBack={() => setSettingsSection(null)} />;
  }

  if (showSettings) {
    return (
      <SettingsMenuScreen
        onBack={() => setShowSettings(false)}
        // The remaining sections land in their own PRs -- until then a tap
        // is a no-op rather than a route to a blank screen, the same call
        // "More" itself carried before the menu existed.
        onOpenSection={(key) => {
          if (key === "profile") setSettingsSection(key);
        }}
      />
    );
  }

  if (showPricing) {
    return <PricingScreen onBack={() => setShowPricing(false)} />;
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

  const screen =
    tab === "sell" ? (
      <PosScreen onOpenSetupRegister={() => setShowSetupRegister(true)} onOpenHome={() => setTab("home")} />
    ) : tab === "stock" ? (
      <RestockScreen activeTab={tab} onChangeTab={handleChangeTab} onBack={() => setTab("home")} />
    ) : tab === "utang" ? (
      <UtangScreen activeTab={tab} onChangeTab={handleChangeTab} onBack={() => setTab("home")} />
    ) : (
      <OwnerHomeScreen
        activeTab={tab}
        onChangeTab={handleChangeTab}
        onOpenTodaysSales={() => setShowTodaysSales(true)}
        onOpenRestock={() => setTab("stock")}
        onOpenUtang={() => setTab("utang")}
      />
    );

  if (billing?.subscriptionStatus === "TRIALING" && billing.trialEndsAt) {
    return (
      <View className="flex-1">
        <TrialBanner daysRemaining={daysUntil(billing.trialEndsAt)} onViewPlansPress={() => setShowPricing(true)} />
        <View className="flex-1">{screen}</View>
      </View>
    );
  }

  return screen;
}

function Root() {
  const { user, device, loading } = useAuth();
  const { showTrialExpired, dismissTrialExpired } = useTrialExpiredGate();
  const [exploringDemo, setExploringDemo] = useState(false);
  const [showPricingFromExpired, setShowPricingFromExpired] = useState(false);

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

  if (user.role === "admin" && showTrialExpired) {
    if (showPricingFromExpired) {
      return (
        <StoreDataProvider>
          <PricingScreen
            onBack={() => {
              setShowPricingFromExpired(false);
              dismissTrialExpired();
            }}
          />
        </StoreDataProvider>
      );
    }
    return (
      <StoreDataProvider>
        <TrialExpiredScreen
          onChoosePlan={() => setShowPricingFromExpired(true)}
          onContactSupport={() => Linking.openURL("mailto:support@dellssoftware.com")}
        />
      </StoreDataProvider>
    );
  }

  return (
    <StoreDataProvider>
      {needsOnboarding ? (
        exploringDemo ? (
          <DemoStoreScreen onExitDemo={() => setExploringDemo(false)} />
        ) : (
          <OnboardingScreen onExploreDemo={() => setExploringDemo(true)} />
        )
      ) : user.role === "admin" ? (
        <AdminHome />
      ) : (
        <PosScreen />
      )}
    </StoreDataProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BillingProvider>
          <CashierSessionProvider>
            <Root />
          </CashierSessionProvider>
        </BillingProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
