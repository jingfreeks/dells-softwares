import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { FeatureFlagsProvider } from "./lib/featureFlags";
import { StoreDataProvider } from "./lib/storeData";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Pos } from "./pages/Pos";
import { Inventory } from "./pages/Inventory";
import { Dashboard } from "./pages/Dashboard";
import { Staff } from "./pages/Staff";
import { Receiving } from "./pages/Receiving";
import { Customers } from "./pages/Customers";
import { Suppliers } from "./pages/Suppliers";
import { Profile } from "./pages/Profile";

function App() {
  return (
    <FeatureFlagsProvider>
      <AuthProvider>
        <StoreDataProvider>
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
              <Route path="/" element={<Navigate to="/pos" replace />} />
              <Route path="*" element={<Navigate to="/pos" replace />} />
            </Routes>
          </BrowserRouter>
        </StoreDataProvider>
      </AuthProvider>
    </FeatureFlagsProvider>
  );
}

export default App;
