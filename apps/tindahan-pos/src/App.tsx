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
import { ProtectedRoute, OnboardingRoute, HomeRedirect, RequireRole } from "@/components";
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
  Privacy,
  Terms,
  DemoStore,
  Pricing,
  TrialExpired,
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
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
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
                          <Route
                            path="/settings/store"
                            element={
                              <RequireRole roles={["admin"]}>
                                <StoreDetails />
                              </RequireRole>
                            }
                          />
                          <Route
                            path="/settings/receipts"
                            element={
                              <RequireRole roles={["admin"]}>
                                <ReceiptsSettings />
                              </RequireRole>
                            }
                          />
                          <Route
                            path="/settings/fees"
                            element={
                              <RequireRole roles={["admin"]}>
                                <FeesLimits />
                              </RequireRole>
                            }
                          />
                          <Route
                            path="/settings/alerts"
                            element={
                              <RequireRole roles={["admin"]}>
                                <AlertsSettings />
                              </RequireRole>
                            }
                          />
                          <Route
                            path="/settings/backup"
                            element={
                              <RequireRole roles={["admin"]}>
                                <BackupSettings />
                              </RequireRole>
                            }
                          />
                          <Route
                            path="/settings/devices"
                            element={
                              <RequireRole roles={["admin"]}>
                                <DevicesSettings />
                              </RequireRole>
                            }
                          />
                          <Route
                            path="/settings/plan"
                            element={
                              <RequireRole roles={["admin"]}>
                                <PlanSettings />
                              </RequireRole>
                            }
                          />
                          <Route
                            path="/settings/audit-log"
                            element={
                              <RequireRole roles={["admin"]}>
                                <AuditLogSettings />
                              </RequireRole>
                            }
                          />
                          <Route path="/demo" element={<DemoStore />} />
                          <Route path="/pricing" element={<Pricing />} />
                          <Route path="/trial-expired" element={<TrialExpired />} />
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
                        <Route path="/" element={<HomeRedirect />} />
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
