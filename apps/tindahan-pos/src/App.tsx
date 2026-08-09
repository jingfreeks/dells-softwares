import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  AuthProvider,
  CashierSessionProvider,
  FeatureFlagsProvider,
  StoreDataProvider,
  EloadWalletProvider,
  DrawerFloatProvider,
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
  Onboarding,
} from "@/pages";

function App() {
  return (
    <FeatureFlagsProvider>
      <AuthProvider>
        <CashierSessionProvider>
          <StoreDataProvider>
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
                    <Route path="/" element={<Navigate to="/pos" replace />} />
                    <Route path="*" element={<Navigate to="/pos" replace />} />
                  </Routes>
                </BrowserRouter>
              </DrawerFloatProvider>
            </EloadWalletProvider>
          </StoreDataProvider>
        </CashierSessionProvider>
      </AuthProvider>
    </FeatureFlagsProvider>
  );
}

export default App;
