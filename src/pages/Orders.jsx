import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import ThemeToggler from '../components/ThemeToggler.jsx';
import Modal, { ModalError } from '../components/Modal.jsx';
import { API_BASE_URL, authFetch, unwrap } from '../api.js';
import { usePageStyles, useTitle } from '../hooks.js';
import { formatCents, formatStatus, num, shippingClass } from '../utils.js';
import css from '../styles/order.css?inline';

const ORDERS_ENDPOINT = `${API_BASE_URL}/orders`;
const FILTERS = ['All', 'Pending', 'Delivered', 'Declined'];

export default function Orders() {
  usePageStyles(css);
  useTitle('Orders · ERP');

  const [orders, setOrders] = useState([]);
  const [listState, setListState] = useState('loading');
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');

  // details modal
  const [detailId, setDetailId] = useState(null);
  const [updating, setUpdating] = useState(false);

  // new order modal
  const [newOpen, setNewOpen] = useState(false);
  const [newError, setNewError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [stock, setStock] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');

  const loadOrders = useCallback(async () => {
    try {
      const response = await authFetch(ORDERS_ENDPOINT);
      if (!response.ok) throw new Error(`Failed to fetch orders: ${response.status}`);
      const list = unwrap(await response.json());
      console.log('Orders received:', list);
      setOrders(list);
      setListState('ok');
    } catch (error) {
      console.error('Error loading orders:', error);
      setListState('error');
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ---- stats ----
  const stats = useMemo(() => {
    const count = (s) =>
      orders.filter((o) => (o.shippingStatus || '').toUpperCase() === s).length;
    return { total: orders.length, pending: count('PENDING'), declined: count('DECLINED') };
  }, [orders]);

  // ---- filters + search ----
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const name = (order.product?.name || '').toLowerCase();
      const sku = (order.product?.sku || '').toLowerCase();
      const shipping = order.shippingStatus || '';
      const matchesFilter =
        activeFilter === 'All' || shipping.toUpperCase() === activeFilter.toUpperCase();
      return matchesFilter && (name.includes(term) || sku.includes(term));
    });
  }, [orders, activeFilter, search]);

  // ---- details modal ----
  const detail = detailId == null ? null : orders.find((o) => String(o.id) === String(detailId));

  const changeStatus = async (id, newStatus) => {
    if (updating) return;
    setUpdating(true);
    try {
      const response = await authFetch(`${ORDERS_ENDPOINT}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Failed to update order: ${response.status}`);
      }

      setDetailId(null);
      loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(error.message || 'Could not update the order.');
    } finally {
      setUpdating(false);
    }
  };

  // ---- new order modal ----
  const openNewOrder = async () => {
    setNewError('');
    setNewOpen(true);

    try {
      const [customerResponse, inventoryResponse] = await Promise.all([
        authFetch(`${API_BASE_URL}/customers`),
        authFetch(`${API_BASE_URL}/inventory`),
      ]);

      if (!customerResponse.ok || !inventoryResponse.ok) {
        throw new Error('Could not load customers or products.');
      }

      const customerList = unwrap(await customerResponse.json()).filter(
        (c) => (c.status || '').toUpperCase() === 'ACTIVE'
      );
      // Only products that have stock can be ordered.
      const stockList = unwrap(await inventoryResponse.json()).filter(
        (inv) => (inv.quantity ?? 0) > 0 && inv.product
      );

      setCustomers(customerList);
      setStock(stockList);
      setCustomerId(customerList[0] ? String(customerList[0].id) : '');
      setProductId(stockList[0] ? String(stockList[0].product.id) : '');
    } catch (error) {
      console.error('Error loading order form options:', error);
      setNewError(error.message);
    }
  };

  const handleNewOrder = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setNewError('');

    try {
      const response = await authFetch(ORDERS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: Number(customerId),
          productId: Number(productId),
          quantity: Number(quantity),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Failed to create order: ${response.status}`);
      }

      setNewOpen(false);
      setQuantity('1');
      loadOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      setNewError(error.message || 'Could not place the order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="order-container">
      <Sidebar active="orders" />

      <main>
        <div className="page-head">
          <h1>Orders</h1>
          <div className="search-wrap">
            <span className="material-symbols-sharp">search</span>
            <input
              type="text"
              placeholder="Search orders…"
              id="order-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" id="open-new-order-btn" onClick={openNewOrder}>
            <span className="material-symbols-sharp">add</span>
            New order
          </button>
          <ThemeToggler />
        </div>

        <div className="stats-grid">
          <div className="stat-card total">
            <div className="icon">
              <span className="material-symbols-sharp">receipt_long</span>
            </div>
            <div className="text">
              <h1 id="total-orders-value">{num(stats.total)}</h1>
              <small>Total orders</small>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="icon">
              <span className="material-symbols-sharp">hourglass_top</span>
            </div>
            <div className="text">
              <h1 id="pending-orders-value">{num(stats.pending)}</h1>
              <small>Pending</small>
            </div>
          </div>
          <div className="stat-card declined">
            <div className="icon">
              <span className="material-symbols-sharp">cancel</span>
            </div>
            <div className="text">
              <h1 id="declined-orders-value">{num(stats.declined)}</h1>
              <small>Declined</small>
            </div>
          </div>
        </div>

        <div className="filter-tabs" id="filter-tabs">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              className={activeFilter === filter ? 'active' : undefined}
              data-filter={filter}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="table-card">
          <h2>Recent orders</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Order #</th>
                <th>Payment</th>
                <th>Shipping</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="order-tbody">
              {listState === 'error' && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>
                    Failed to load orders
                  </td>
                </tr>
              )}
              {listState === 'ok' && filtered.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>
                    No orders found
                  </td>
                </tr>
              )}
              {listState === 'ok' &&
                filtered.map((order) => (
                  <tr key={order.id}>
                    <td>{order.product?.name || 'N/A'}</td>
                    <td>{order.product?.sku || 'N/A'}</td>
                    <td>{formatStatus(order.paymentStatus || 'N/A')}</td>
                    <td>
                      <span className={`status ${shippingClass(order.shippingStatus || 'N/A')}`}>
                        {formatStatus(order.shippingStatus || 'N/A')}
                      </span>
                    </td>
                    <td>
                      <button
                        className="row-action view-order-btn"
                        data-id={order.id}
                        onClick={() => setDetailId(order.id)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Modal open={!!detail} title="Order Details" onClose={() => setDetailId(null)}>
          <div id="view-order-body">
            {detail && (
              <>
                <div className="view-detail-row">
                  <span>Product</span>
                  <span>{detail.product?.name || 'N/A'}</span>
                </div>
                <div className="view-detail-row">
                  <span>SKU</span>
                  <span>{detail.product?.sku || 'N/A'}</span>
                </div>
                <div className="view-detail-row">
                  <span>Customer</span>
                  <span>{detail.customer?.name || 'N/A'}</span>
                </div>
                <div className="view-detail-row">
                  <span>Quantity</span>
                  <span>{detail.quantity ?? 0}</span>
                </div>
                <div className="view-detail-row">
                  <span>Amount</span>
                 <span>{formatCents(detail.amountCents)}</span>
                </div>
                <div className="view-detail-row">
                  <span>Payment</span>
                  <span>{formatStatus(detail.paymentStatus)}</span>
                </div>
                <div className="view-detail-row">
                  <span>Shipping</span>
                  <span className={`status ${shippingClass(detail.shippingStatus)}`}>
                    {formatStatus(detail.shippingStatus)}
                  </span>
                </div>
                <div className="view-detail-row">
                  <span>Placed on</span>
                  <span>
                    {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                {(detail.shippingStatus || '').toUpperCase() === 'PENDING' && (
                  <div className="order-actions">
                    <button
                      className="mark-delivered"
                      data-action="DELIVERED"
                      data-id={detail.id}
                      disabled={updating}
                      onClick={() => changeStatus(detail.id, 'DELIVERED')}
                    >
                      Mark delivered
                    </button>
                    <button
                      className="mark-declined"
                      data-action="DECLINED"
                      data-id={detail.id}
                      disabled={updating}
                      onClick={() => changeStatus(detail.id, 'DECLINED')}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>

        <Modal open={newOpen} title="New Order" onClose={() => setNewOpen(false)}>
          <ModalError message={newError} />

          <form id="new-order-form" onSubmit={handleNewOrder}>
            <div className="field">
              <label htmlFor="new-order-customer">Customer</label>
              <select
                id="new-order-customer"
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="new-order-product">Product</label>
              <select
                id="new-order-product"
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                {stock.map((inv) => (
                  <option key={inv.product.id} value={inv.product.id}>
                    {`${inv.product.name} (${inv.quantity} in stock)`}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="new-order-quantity">Quantity</label>
              <input
                type="number"
                id="new-order-quantity"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              id="new-order-submit"
              disabled={submitting}
            >
              Place Order
            </button>
          </form>
        </Modal>
      </main>
    </div>
  );
}
