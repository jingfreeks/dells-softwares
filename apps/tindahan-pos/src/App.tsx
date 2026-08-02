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
  Profile,
  Onboarding,
} from "@/pages";

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
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
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
