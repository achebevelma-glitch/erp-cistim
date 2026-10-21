import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';
import CreateAccount from './pages/CreateAccount.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import Inventory from './pages/Inventory.jsx';
import Orders from './pages/Orders.jsx';
import Transactions from './pages/Transactions.jsx';
import Products from './pages/Products.jsx';
import Checkout from './pages/Checkout.jsx';
import Invoices from './pages/Invoices.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomeRedirect from './components/HomeRedirect.jsx';

const admin = ['ADMIN'];
const any = ['ADMIN', 'USER'];

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/create-account" element={<CreateAccount />} />

      {/* Admin only */}
      <Route path="/dashboard" element={<ProtectedRoute roles={admin}><Dashboard /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute roles={admin}><Customers /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute roles={admin}><Inventory /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute roles={admin}><Orders /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute roles={admin}><Transactions /></ProtectedRoute>} />

      {/* Admin and customers */}
      <Route path="/products" element={<ProtectedRoute roles={any}><Products /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute roles={any}><Checkout /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute roles={any}><Invoices /></ProtectedRoute>} />

      {/* Old .html URLs keep working */}
      <Route path="/login.html" element={<Navigate to="/login" replace />} />
      <Route path="/create-account.html" element={<Navigate to="/create-account" replace />} />
      <Route path="/dashboard.html" element={<Navigate to="/dashboard" replace />} />
      <Route path="/customer.html" element={<Navigate to="/customers" replace />} />
      <Route path="/inventory.html" element={<Navigate to="/inventory" replace />} />
      <Route path="/order.html" element={<Navigate to="/orders" replace />} />
      <Route path="/transaction.html" element={<Navigate to="/transactions" replace />} />
      <Route path="/product.html" element={<Navigate to="/products" replace />} />

      {/* Anything else */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}