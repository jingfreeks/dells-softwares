import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, FeatureFlagsProvider, StoreDataProvider, EloadWalletProvider, DrawerFloatProvider } from "@/lib";
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
  ComingSoonSettingsPage,
  Onboarding,
} from "@/pages";
import {
  NAV_LABEL_STORE_DETAILS,
  NAV_LABEL_RECEIPTS,
  NAV_LABEL_FEES_AND_LIMITS,
  NAV_LABEL_ALERTS,
  NAV_LABEL_BACKUP,
} from "@/lib";

function App() {
  return (
    <FeatureFlagsProvider>
      <AuthProvider>
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
                        <ComingSoonSettingsPage heading={NAV_LABEL_STORE_DETAILS} subheading="Appears on receipts and reports" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/receipts"
                    element={
                      <ProtectedRoute>
                        <ComingSoonSettingsPage heading={NAV_LABEL_RECEIPTS} subheading="What the customer gets after a sale" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/fees"
                    element={
                      <ProtectedRoute>
                        <ComingSoonSettingsPage
                          heading={NAV_LABEL_FEES_AND_LIMITS}
                          subheading="What you charge, and what staff can do without you"
                        />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/alerts"
                    element={
                      <ProtectedRoute>
                        <ComingSoonSettingsPage heading={NAV_LABEL_ALERTS} subheading="What reaches you, when, and how" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/backup"
                    element={
                      <ProtectedRoute>
                        <ComingSoonSettingsPage heading={NAV_LABEL_BACKUP} subheading="Your sales history is the store's memory" />
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
      </AuthProvider>
    </FeatureFlagsProvider>
  );
}

export default App;
