import { Link, useNavigate } from 'react-router-dom';
import { clearToken } from '../api.js';
import { getCurrentUser, getRole } from '../useCurrentUser.js';
import { usePageStyles } from '../hooks.js';
import { initialsOf } from '../utils.js';
import userCardCss from '../styles/user-card.css?inline';
import { useCart } from '../CartContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';


export default function Sidebar({
  active,
  customerLabel = 'Customer',
  ordersIcon = 'receipt_long',
  signUp = false,
  open,
  onClose,
}) {
  const navigate = useNavigate();
  usePageStyles(userCardCss);
  const user = getCurrentUser();
  const isAdmin = getRole() === 'ADMIN';

  const { clear: clearCart } = useCart();

  const handleLogout = (event) => {
    event.preventDefault();
    clearToken();
    navigate('/login', { replace: true });
  };


  const link = (key, to, icon, label) => (
    <Link to={to} className={active === key ? 'active' : undefined}>
      <span className="material-symbols-sharp">{icon}</span>
      <h3>{label}</h3>
    </Link>
  );

  return (
    <aside style={open === undefined ? undefined : { display: open ? 'block' : 'none' }}>
      <div className="top">
        <h2 className="logo">
          ElectroTrack<span className="danger">ERP</span>
        </h2>
        <div className="close" id="close-btn" onClick={onClose}>
          <span className="material-symbols-sharp">close</span>
        </div>
      </div>

      <div className="sidebar">
        {isAdmin && link('dashboard', '/dashboard', 'dashboard', 'Dashboard')}
        {isAdmin && link('customers', '/customers', 'handshake', customerLabel)}
        {isAdmin && link('inventory', '/inventory', 'inventory_2', 'Inventory')}
        {isAdmin && link('orders', '/orders', ordersIcon, 'Orders')}
        {isAdmin && link('transactions', '/transactions', 'calculate', 'Transactions')}
        {link('products', '/products', 'store', 'Products')}
        {link('invoices', '/invoices', 'description', 'Invoices')}
        {isAdmin && <NotificationBell />}

        {user && (
          <div className="user-card" title={user.email || user.name}>
            <div className="user-avatar">{initialsOf(user.name)}</div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-meta">{user.role || user.email}</span>
            </div>
          </div>
        )}

        <a href="#" id="logout-btn" onClick={handleLogout}>
          <span className="material-symbols-sharp">logout</span>
          <h3>Logout</h3>
        </a>
      </div>
    </aside>
  );
}