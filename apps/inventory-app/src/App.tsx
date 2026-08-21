import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { PermissionsProvider } from "./lib/permissions";
import { ModulesProvider } from "./lib/modules";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Dashboard } from "./pages/Dashboard";
import { Warehouses } from "./pages/Warehouses";
import { Products } from "./pages/Products";
import { Suppliers } from "./pages/Suppliers";
import { PurchaseOrders } from "./pages/PurchaseOrders";
import { Receiving } from "./pages/Receiving";
import { Transfers } from "./pages/Transfers";
import { Conversion } from "./pages/Conversion";
import { BeginningBalance } from "./pages/BeginningBalance";
import { ActualInventory } from "./pages/ActualInventory";

function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
      <ModulesProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouses"
            element={
              <ProtectedRoute>
                <Warehouses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products />
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
            path="/purchase-orders"
            element={
              <ProtectedRoute>
                <PurchaseOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receiving"
            element={
              <ProtectedRoute>
                <Receiving />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transfers"
            element={
              <ProtectedRoute>
                <Transfers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conversion"
            element={
              <ProtectedRoute>
                <Conversion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/beginning-balance"
            element={
              <ProtectedRoute>
                <BeginningBalance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/actual-inventory"
            element={
              <ProtectedRoute>
                <ActualInventory />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </ModulesProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}

export default App;
