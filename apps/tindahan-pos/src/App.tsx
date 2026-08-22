import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  AuthProvider,
  CashierSessionProvider,
  FeatureFlagsProvider,
  PermissionsProvider,
  BillingProvider,
  FeaturesProvider,
  StoreDataProvider,
  EloadWalletProvider,
  DrawerFloatProvider,
  NetworkProvider,
  OfflineQueueProvider,
} from "@/lib";
import { ProtectedRoute, OnboardingRoute } from "@/components";
import {
  Login,
  Register,
  ForgotPassword,
  Pair,
  Pos,
  Inventory,
  Dashboard,
  Staff,
  Receiving,
  Customers,
  Suppliers,
  ProfileSettings,
  StoreDetails,
  ReceiptsSettings,
  FeesLimits,
  AlertsSettings,
  BackupSettings,
  DevicesSettings,
  AuditLogSettings,
  Onboarding,
  Reports,
  PlanSettings,
} from "@/pages";

function App() {
  return (
    <NetworkProvider>
      <FeatureFlagsProvider>
        <AuthProvider>
          <PermissionsProvider>
          <BillingProvider>
          <FeaturesProvider>
          <CashierSessionProvider>
            <StoreDataProvider>
              <OfflineQueueProvider>
                <EloadWalletProvider>
                  <DrawerFloatProvider>
                    <BrowserRouter>
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/pair" element={<Pair />} />
                        <Route element={<ProtectedRoute />}>
                          <Route path="/pos" element={<Pos />} />
                          <Route path="/inventory" element={<Inventory />} />
                          <Route path="/admin" element={<Dashboard />} />
                          <Route path="/staff" element={<Staff />} />
                          <Route path="/reports" element={<Reports />} />
                          <Route path="/inventory/receiving" element={<Receiving />} />
                          <Route path="/customers" element={<Customers />} />
                          <Route path="/suppliers" element={<Suppliers />} />
                          <Route path="/settings/profile" element={<ProfileSettings />} />
                          <Route path="/settings/store" element={<StoreDetails />} />
                          <Route path="/settings/receipts" element={<ReceiptsSettings />} />
                          <Route path="/settings/fees" element={<FeesLimits />} />
                          <Route path="/settings/alerts" element={<AlertsSettings />} />
                          <Route path="/settings/backup" element={<BackupSettings />} />
                          <Route path="/settings/devices" element={<DevicesSettings />} />
                          <Route path="/settings/plan" element={<PlanSettings />} />
                          <Route path="/settings/audit-log" element={<AuditLogSettings />} />
                        </Route>
                        <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
                        <Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
                        <Route
                          path="/onboarding"
                          element={
                            <OnboardingRoute>
                              <Onboarding />
                            </OnboardingRoute>
                          }
                        />
                        {/* A fresh HTTP request for "/" never reaches this route at all --
                            vite.config.ts's serveLandingAtRoot plugin (dev/preview) and
                            vercel.json's rewrite (production) both intercept it and serve
                            public/landing.html directly. This only handles CLIENT-SIDE
                            navigation to "/" from inside the already-mounted SPA (e.g. a
                            stale bookmark within app state, or code that still assumes "/"
                            means "home") -- same plain redirect this route has always been. */}
                        <Route path="/" element={<Navigate to="/pos" replace />} />
                        <Route path="*" element={<Navigate to="/pos" replace />} />
                      </Routes>
                    </BrowserRouter>
                  </DrawerFloatProvider>
                </EloadWalletProvider>
              </OfflineQueueProvider>
            </StoreDataProvider>
          </CashierSessionProvider>
          </FeaturesProvider>
          </BillingProvider>
          </PermissionsProvider>
        </AuthProvider>
      </FeatureFlagsProvider>
    </NetworkProvider>
  );
}

export default App;
