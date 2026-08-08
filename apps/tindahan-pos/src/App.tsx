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
                    <Route
                      path="/pos"
                      element={
                        <ProtectedRoute>
                          <Pos />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/inventory"
                      element={
                        <ProtectedRoute>
                          <Inventory />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/staff"
                      element={
                        <ProtectedRoute>
                          <Staff />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/inventory/receiving"
                      element={
                        <ProtectedRoute>
                          <Receiving />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/customers"
                      element={
                        <ProtectedRoute>
                          <Customers />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/suppliers"
                      element={
                        <ProtectedRoute>
                          <Suppliers />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/profile"
                      element={
                        <ProtectedRoute>
                          <ProfileSettings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/store"
                      element={
                        <ProtectedRoute>
                          <StoreDetails />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/receipts"
                      element={
                        <ProtectedRoute>
                          <ReceiptsSettings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/fees"
                      element={
                        <ProtectedRoute>
                          <FeesLimits />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/alerts"
                      element={
                        <ProtectedRoute>
                          <AlertsSettings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/backup"
                      element={
                        <ProtectedRoute>
                          <BackupSettings />
                        </ProtectedRoute>
                      }
                    />
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
