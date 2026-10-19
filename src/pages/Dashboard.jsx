import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import ThemeToggler from '../components/ThemeToggler.jsx';
import { API_BASE_URL, authFetch, unwrap } from '../api.js';
import { usePageStyles, useTitle } from '../hooks.js';
import {
  dashboardShippingClass,
  formatMoney,
  formatStatus,
  initialsOf,
  num,
  timeAgo,
} from '../utils.js';
import css from '../styles/style.css?inline';

const RING_CIRCUMFERENCE = 2 * Math.PI * 36;
const DAY_MS = 24 * 60 * 60 * 1000;

function ringStyle(percent) {
  const clamped = Math.max(0, Math.min(100, percent));
  return {
    strokeDasharray: String(RING_CIRCUMFERENCE),
    strokeDashoffset: String(RING_CIRCUMFERENCE * (1 - clamped / 100)),
  };
}

function Insight({ className, icon, title, valueCents, percent, loaded }) {
  return (
    <div className={className}>
      <span className="material-symbols-sharp">{icon}</span>

      <div className="middle">
        <div className="left">
          <h3>{title}</h3>
          <h1>{formatMoney(valueCents / 100)}</h1>
        </div>
        <div className="progress">
          <svg>
            <circle cx="38" cy="38" r="36" style={loaded ? ringStyle(percent) : undefined}></circle>
          </svg>
          <div className="number">
            <p>{`${Math.round(percent)}%`}</p>
          </div>
        </div>
      </div>
      <small className="text muted">All time</small>
    </div>
  );
}

const countBetween = (list, fromMs, toMs) =>
  list.filter((item) => {
    const t = new Date(item.createdAt).getTime();
    return t >= fromMs && t < toMs;
  }).length;

const percentChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

function Change({ id, percent }) {
  const rounded = Math.round(percent);
  const cls = rounded >= 0 ? 'success' : 'danger';
  return (
    <h5 id={id} className={cls}>
      {`${rounded >= 0 ? '+' : ''}${rounded}%`}
    </h5>
  );
}

export default function Dashboard() {
  usePageStyles(css);
  useTitle('Responsive dashboard');
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(undefined); // undefined = leave to CSS
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, netProfit: 0 });
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  const [orders, setOrders] = useState([]);
  const [ordersState, setOrdersState] = useState('loading'); // loading | ok | error
  const [showAll, setShowAll] = useState(false);

  const [sideOrders, setSideOrders] = useState([]);
  const [sideCustomers, setSideCustomers] = useState([]);
  const [sideState, setSideState] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/accounting/summary`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const s = await res.json();
        if (!cancelled)
          setSummary({
            revenue: Number(s.revenueCents || 0),
            expenses: Number(s.expensesCents || 0),
            netProfit: Number(s.netProfitCents || 0),
          });
        if (!cancelled) setSummaryLoaded(true);
      } catch (err) {
        console.error('Failed to load insights:', err);
      }
    })();

    (async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/orders`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = unwrap(await res.json());
        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        if (!cancelled) {
          setOrders(sorted);
          setOrdersState('ok');
        }
      } catch (err) {
        console.error('Failed to load recent orders:', err);
        if (!cancelled) setOrdersState('error');
      }
    })();

    (async () => {
      try {
        const [ordersRes, customersRes] = await Promise.all([
          authFetch(`${API_BASE_URL}/orders`),
          authFetch(`${API_BASE_URL}/customers`),
        ]);
        if (!ordersRes.ok || !customersRes.ok) {
          throw new Error(`HTTP ${ordersRes.status} / ${customersRes.status}`);
        }
        const o = unwrap(await ordersRes.json());
        const c = unwrap(await customersRes.json());
        if (!cancelled) {
          setSideOrders(o);
          setSideCustomers(c);
          setSideState('ok');
        }
      } catch (err) {
        console.error('Failed to load updates and analytics:', err);
        if (!cancelled) setSideState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- insights (rings) ----
  const base = summary.revenue > 0 ? summary.revenue : 0;
  const salesPct = base > 0 ? 100 : 0;
  const expensesPct = base > 0 ? (summary.expenses / base) * 100 : 0;
  const incomePct = base > 0 ? (summary.netProfit / base) * 100 : 0;

  // ---- recent updates ----
  const updates = useMemo(() => {
    return [
      ...sideOrders.map((order) => ({
        time: order.createdAt,
        avatar: <span className="material-symbols-sharp">shopping_bag</span>,
        text: (
          <>
            <b>{order.customer?.name || `Order #${order.id}`}</b> ordered{' '}
            {order.quantity ?? 1} × {order.product?.name || 'a product'}
          </>
        ),
      })),
      ...sideCustomers.map((customer) => ({
        time: customer.createdAt,
        avatar: initialsOf(customer.name),
        text: (
          <>
            <b>{customer.name || 'A customer'}</b> joined as a customer
          </>
        ),
      })),
    ]
      .filter((event) => event.time)
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 3);
  }, [sideOrders, sideCustomers]);

  // ---- sales analytics ----
  const analytics = useMemo(() => {
    const now = Date.now();
    const windowStart = now - 30 * DAY_MS;
    const previousStart = now - 60 * DAY_MS;

    const ordersNow = countBetween(sideOrders, windowStart, now + DAY_MS);
    const ordersBefore = countBetween(sideOrders, previousStart, windowStart);
    const customersNow = countBetween(sideCustomers, windowStart, now + DAY_MS);
    const customersBefore = countBetween(sideCustomers, previousStart, windowStart);

    const pending = sideOrders.filter(
      (order) => (order.shippingStatus || '').toUpperCase() === 'PENDING'
    ).length;
    const pendingShare = sideOrders.length > 0 ? (pending / sideOrders.length) * 100 : 0;

    return {
      ordersNow,
      ordersChange: percentChange(ordersNow, ordersBefore),
      pending,
      pendingShare,
      customersNow,
      customersChange: percentChange(customersNow, customersBefore),
    };
  }, [sideOrders, sideCustomers]);

  const visibleOrders = showAll ? orders : orders.slice(0, 1);

  return (
    <div className="dash-container">
      <Sidebar
        active="dashboard"
        customerLabel="Customers"
        ordersIcon="shopping_bag"
        signUp
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <main>
        <h1>Dashboard</h1>
        <div className="date">
          <input type="date" />
        </div>

        <div className="insights">
          <Insight
            className="sales"
            icon="analytics"
            title="Total Sales"
            valueCents={summary.revenue}
            percent={salesPct}
            loaded={summaryLoaded}
          />
          <Insight
            className="expenses"
            icon="bar_chart"
            title="Total Expenses"
            valueCents={summary.expenses}
            percent={expensesPct}
            loaded={summaryLoaded}
          />
          <Insight
            className="income"
            icon="stacked_line_chart"
            title="Total Income"
            valueCents={summary.netProfit}
            percent={incomePct}
            loaded={summaryLoaded}
          />
        </div>

        <div className="recent-orders">
          <h2>Recent Orders</h2>
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Product Number</th>
                <th>Payments</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="recent-orders-tbody">
              {ordersState === 'error' && (
                <tr>
                  <td colSpan="4">Could not load orders</td>
                </tr>
              )}
              {ordersState === 'ok' && orders.length === 0 && (
                <tr>
                  <td colSpan="4">No orders yet</td>
                </tr>
              )}
              {ordersState === 'ok' &&
                visibleOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.product?.name || 'N/A'}</td>
                    <td>{order.product?.sku || 'N/A'}</td>
                    <td>{formatStatus(order.paymentStatus)}</td>
                    <td className={dashboardShippingClass(order.shippingStatus)}>
                      {formatStatus(order.shippingStatus)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <a
            href="#"
            id="show-all-orders"
            style={{
              display: ordersState === 'ok' && orders.length > 1 ? 'block' : 'none',
            }}
            onClick={(event) => {
              event.preventDefault();
              setShowAll((s) => !s);
            }}
          >
            {showAll ? 'Show less' : `Show all (${orders.length})`}
          </a>
        </div>

        <section className="quick-actions">
          <div className="panel-header">
            <div>
              <h2>Quick Actions</h2>
              <p>Frequently used ERP functions</p>
            </div>
          </div>
          <div className="action-grid">
            <Link to="/customers" className="action-card">
              <span className="material-symbols-sharp">person_add</span>
              <div>
                <h3>Customers</h3>
                <p>Manage customers</p>
              </div>
            </Link>
            <Link to="/products" className="action-card">
              <span className="material-symbols-sharp">add_box</span>
              <div>
                <h3>Products</h3>
                <p>Manage products</p>
              </div>
            </Link>
            <Link to="/orders" className="action-card">
              <span className="material-symbols-sharp">add_shopping_cart</span>
              <div>
                <h3>Orders</h3>
                <p>View and manage orders</p>
              </div>
            </Link>
            <Link to="/transactions" className="action-card">
              <span className="material-symbols-sharp">payments</span>
              <div>
                <h3>Transactions</h3>
                <p>View financial records</p>
              </div>
            </Link>
          </div>
        </section>
      </main>

      <div className="right">
        <div className="top">
          <button id="menu-btn" onClick={() => setMenuOpen(true)}>
            <span className="material-symbols-sharp">menu</span>
          </button>
          <ThemeToggler />
        
        </div>

        <div className="recent-updates">
          <h2>Recent updates</h2>
          <div className="updates" id="updates-list">
            {sideState === 'error' && <p className="no-updates">Could not load updates</p>}
            {sideState === 'ok' && updates.length === 0 && (
              <p className="no-updates">No recent activity</p>
            )}
            {sideState === 'ok' &&
              updates.map((event, i) => (
                <div className="update" key={i}>
                  <div className="update-avatar">{event.avatar}</div>
                  <div className="message">
                    <p>{event.text}</p>
                    <small className="text-muted">{timeAgo(event.time)}</small>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="sales-analytics">
          <h2>Sales Analytics</h2>

          <div className="item online">
            <div className="icon">
              <span className="material-symbols-sharp">shopping_cart</span>
            </div>
            <div className="right">
              <div className="info">
                <h3>TOTAL ORDERS</h3>
                <small className="text-muted">Last 30 days</small>
              </div>
              {sideState === 'ok' ? (
                <Change id="orders-change" percent={analytics.ordersChange} />
              ) : (
                <h5 id="orders-change">0%</h5>
              )}
              <h3 id="orders-count">{num(analytics.ordersNow)}</h3>
            </div>
          </div>

          <div className="item offline">
            <div className="icon">
              <span className="material-symbols-sharp">hourglass_top</span>
            </div>
            <div className="right">
              <div className="info">
                <h3>PENDING ORDERS</h3>
                <small className="text-muted">Awaiting delivery</small>
              </div>
              <h5 id="pending-share" className="text-muted">
                {`${Math.round(analytics.pendingShare)}%`}
              </h5>
              <h3 id="pending-count">{num(analytics.pending)}</h3>
            </div>
          </div>

          <div className="item customers">
            <div className="icon">
              <span className="material-symbols-sharp">person</span>
            </div>
            <div className="right">
              <div className="info">
                <h3>NEW CUSTOMERS</h3>
                <small className="text-muted">Last 30 days</small>
              </div>
              {sideState === 'ok' ? (
                <Change id="customers-change" percent={analytics.customersChange} />
              ) : (
                <h5 id="customers-change">0%</h5>
              )}
              <h3 id="customers-count">{num(analytics.customersNow)}</h3>
            </div>
          </div>

          <div
            className="item add-product"
            id="add-product-tile"
            onClick={() => navigate('/products')}
          >
            <div className="">
              <span className="material-symbols-sharp">add</span>
              <h3>Add Product</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
