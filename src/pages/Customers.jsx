import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import ThemeToggler from '../components/ThemeToggler.jsx';
import Modal, { ModalError } from '../components/Modal.jsx';
import { API_BASE_URL, authFetch, unwrap } from '../api.js';
import { usePageStyles, useTitle } from '../hooks.js';
import { customerInitials, num } from '../utils.js';
import css from '../styles/customer.css?inline';

const formatOrderAmount = (amountCents) => `$${(Number(amountCents || 0) / 100).toFixed(2)}`;

const orderCount = (customer) => {
  if (customer.orderCount != null) return customer.orderCount;
  if (Array.isArray(customer.orders)) return customer.orders.length;
  return customer.orders ?? 0;
};

export default function Customers() {
  usePageStyles(css);
  useTitle('Customers · ERP');

  const [customers, setCustomers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');

  // add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', status: 'ACTIVE' });

  // view modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewState, setViewState] = useState('loading'); // loading | ok | error
  const [viewCustomer, setViewCustomer] = useState(null);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/customers`);
      if (!response.ok) throw new Error(`Failed to fetch customers: ${response.status}`);
      const list = unwrap(await response.json());
      console.log('Customers received:', list);
      setCustomers(list);
      setLoaded(true);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // ---- stats ----
  const stats = useMemo(() => {
    const now = new Date();
    const newThisMonth = customers.filter((c) => {
      if (!c.createdAt) return false;
      const created = new Date(c.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;
    const inactive = customers.filter(
      (c) => (c.status || '').toUpperCase() !== 'ACTIVE'
    ).length;
    return { total: customers.length, newThisMonth, inactive };
  }, [customers]);

  // ---- search ----
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.status || '').toLowerCase().includes(term)
    );
  }, [customers, search]);

  // ---- add customer ----
  const handleAdd = async (event) => {
    event.preventDefault();
    setAddError('');

    try {
      const response = await authFetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          status: form.status,
        }),
      });

      if (!response.ok) throw new Error(`Failed to create customer: ${response.status}`);

      setAddOpen(false);
      setForm({ name: '', email: '', status: 'ACTIVE' });
      loadCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
      setAddError('Could not add customer. Please try again.');
    }
  };

  // ---- view customer ----
  const openView = async (id) => {
    setViewState('loading');
    setViewCustomer(null);
    setViewOpen(true);

    try {
      const response = await authFetch(`${API_BASE_URL}/customers/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch customer: ${response.status}`);
      setViewCustomer(await response.json());
      setViewState('ok');
    } catch (error) {
      console.error('Error loading customer details:', error);
      setViewState('error');
    }
  };

  const viewOrders = viewCustomer?.orders || [];

  return (
    <div className="customer-container">
      <Sidebar active="customers" customerLabel="Customers" />

      <main>
        <div className="page-head">
          <h1>Customers</h1>
          <div className="search-wrap">
            <span className="material-symbols-sharp">search</span>
            <input
              type="text"
              placeholder="Search customers…"
              id="customer-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            id="open-add-customer-btn"
            onClick={() => setAddOpen(true)}
          >
            <span className="material-symbols-sharp">add</span>
            Add customer
          </button>
          <ThemeToggler />
        </div>

        <div className="stats-grid">
          <div className="stat-card total">
            <div className="icon">
              <span className="material-symbols-sharp">group</span>
            </div>
            <div className="text">
              <h1 id="total-customers-value">{loaded ? num(stats.total) : ''}</h1>
              <small>Total customers</small>
            </div>
          </div>
          <div className="stat-card new">
            <div className="icon">
              <span className="material-symbols-sharp">person_add</span>
            </div>
            <div className="text">
              <h1 id="new-customers-value">{loaded ? num(stats.newThisMonth) : ''}</h1>
              <small>New this month</small>
            </div>
          </div>
          <div className="stat-card inactive">
            <div className="icon">
              <span className="material-symbols-sharp">person_off</span>
            </div>
            <div className="text">
              <h1 id="inactive-customers-value">{loaded ? num(stats.inactive) : ''}</h1>
              <small>Inactive accounts</small>
            </div>
          </div>
        </div>

        <div className="table-card">
          <h2>All customers</h2>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Orders</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="customer-tbody">
              {loaded && filtered.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>
                    No customers found
                  </td>
                </tr>
              )}
              {filtered.map((customer) => {
                const status = customer.status || 'INACTIVE';
                return (
                  <tr key={customer.id}>
                    <td>
                      <div className="customer-cell">
                        <div className="avatar">{customerInitials(customer.name)}</div>
                        <span className="name">{customer.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>{customer.email || 'N/A'}</td>
                    <td>{orderCount(customer)}</td>
                    <td>
                      <span className={`status ${status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                        {status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="row-action view-customer-btn"
                        data-id={customer.id}
                        onClick={() => openView(customer.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Modal open={addOpen} title="Add Customer" onClose={() => setAddOpen(false)}>
          <ModalError message={addError} />

          <form id="add-customer-form" onSubmit={handleAdd}>
            <div className="field">
              <label htmlFor="new-customer-name">Full Name</label>
              <input
                type="text"
                id="new-customer-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="new-customer-email">Email</label>
              <input
                type="email"
                id="new-customer-email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="new-customer-status">Status</label>
              <select
                id="new-customer-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" id="add-customer-submit">
              Add Customer
            </button>
          </form>
        </Modal>

        <Modal open={viewOpen} title="Customer Details" onClose={() => setViewOpen(false)}>
          <div className={`view-error${viewState === 'error' ? ' visible' : ''}`}>
            {viewState === 'error' ? 'Could not load customer details.' : ''}
          </div>

          <div id="view-customer-body">
            {viewState === 'loading' && <p>Loading…</p>}

            {viewState === 'ok' && viewCustomer && (
              <>
                <div className="view-detail-row">
                  <span>Name</span>
                  <span>{viewCustomer.name || 'N/A'}</span>
                </div>
                <div className="view-detail-row">
                  <span>Email</span>
                  <span>{viewCustomer.email || 'N/A'}</span>
                </div>
                <div className="view-detail-row">
                  <span>Status</span>
                  <span>{viewCustomer.status || 'N/A'}</span>
                </div>
                <div className="view-detail-row">
                  <span>Customer since</span>
                  <span>
                    {viewCustomer.createdAt
                      ? new Date(viewCustomer.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>

                <h3 className="view-orders-heading">Order History</h3>
                {viewOrders.length === 0 ? (
                  <p>No orders yet.</p>
                ) : (
                  viewOrders.map((order, i) => (
                    <div className="view-order-item" key={order.id ?? i}>
                      <div className="order-row">
                        <span>{order.product?.name || 'N/A'}</span>
                        <span>{formatOrderAmount(order.amountCents)}</span>
                      </div>
                      <div className="order-row">
                        <span>Qty: {order.quantity ?? 0}</span>
                        <span>{order.shippingStatus || 'N/A'}</span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </Modal>
      </main>
    </div>
  );
}
