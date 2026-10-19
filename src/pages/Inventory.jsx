import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import ThemeToggler from '../components/ThemeToggler.jsx';
import Modal, { ModalError } from '../components/Modal.jsx';
import { API_BASE_URL, authFetch } from '../api.js';
import { usePageStyles, useTitle } from '../hooks.js';
import { num, stockClass, stockLabel } from '../utils.js';
import css from '../styles/inventory.css?inline';

const INVENTORY_ENDPOINT = `${API_BASE_URL}/inventory`;
const EMPTY_FORM = { name: '', sku: '', category: '', price: '', quantity: '' };

export default function Inventory() {
  usePageStyles(css);
  useTitle('Inventory · ERP');

  const [products, setProducts] = useState([]);
  const [listState, setListState] = useState('loading'); // loading | ok | error
  const [stats, setStats] = useState({ total: 0, low: 0, out: 0 });
  const [search, setSearch] = useState('');

  // add product
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // view
  const [viewOpen, setViewOpen] = useState(false);
  const [viewState, setViewState] = useState('loading');
  const [inv, setInv] = useState(null);

  const loadInventory = useCallback(async () => {
    try {
      const response = await authFetch(INVENTORY_ENDPOINT);
      if (!response.ok) throw new Error(`Failed to fetch inventory: ${response.status}`);
      const data = await response.json();
      console.log('Inventory received:', data);
      setProducts(data);
      setListState('ok');
    } catch (error) {
      console.error('Error loading inventory:', error);
      setListState('error');
    }
  }, []);

  const loadInventoryStats = useCallback(async () => {
    try {
      const response = await authFetch(`${INVENTORY_ENDPOINT}/stats`);
      if (!response.ok) throw new Error(`Failed to fetch inventory stats: ${response.status}`);
      const s = await response.json();
      console.log('Inventory stats received:', s);
      setStats({ total: s.total ?? 0, low: s.lowStock ?? 0, out: s.outOfStock ?? 0 });
    } catch (error) {
      console.error('Error loading inventory stats:', error);
    }
  }, []);

  useEffect(() => {
    loadInventory();
    loadInventoryStats();
  }, [loadInventory, loadInventoryStats]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const name = (p.product?.name || p.name || '').toLowerCase();
      const sku = (p.product?.sku || p.sku || '').toLowerCase();
      return name.includes(term) || sku.includes(term);
    });
  }, [products, search]);

  // ---- add product (create product, then set its stock) ----
  const handleAdd = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setAddError('');

    const name = form.name.trim();
    const sku = form.sku.trim();
    const category = form.category.trim();
    const priceCents = Math.round(Number(form.price || 0) * 100);
    const quantity = Number(form.quantity || 0);

    try {
      const productResponse = await authFetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sku, category, priceCents }),
      });
      if (!productResponse.ok) {
        throw new Error(`Failed to create product: ${productResponse.status}`);
      }
      const newProduct = await productResponse.json();

      // The backend may already have created an inventory row, so check first
      // and adjust by the difference instead of re-initializing.
      const existingResponse = await authFetch(`${INVENTORY_ENDPOINT}/${newProduct.id}`);

      if (existingResponse.ok) {
        const existing = await existingResponse.json();
        const delta = quantity - (existing.quantity ?? 0);

        if (delta !== 0) {
          const adjustResponse = await authFetch(
            `${INVENTORY_ENDPOINT}/${newProduct.id}/adjustments`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ delta, reason: 'Initial stock' }),
            }
          );
          if (!adjustResponse.ok) {
            throw new Error(`Failed to set initial stock: ${adjustResponse.status}`);
          }
        }
      } else {
        const initResponse = await authFetch(`${INVENTORY_ENDPOINT}/${newProduct.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity }),
        });
        if (!initResponse.ok) {
          throw new Error(`Failed to initialize inventory: ${initResponse.status}`);
        }
      }

      setAddOpen(false);
      setForm(EMPTY_FORM);
      loadInventory();
      loadInventoryStats();
    } catch (error) {
      console.error('Error adding product:', error);
      setAddError(error.message || 'Could not add product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- view product ----
  const openView = async (productId) => {
    setViewState('loading');
    setInv(null);
    setViewOpen(true);

    try {
      const response = await authFetch(`${INVENTORY_ENDPOINT}/${productId}`);
      if (!response.ok) throw new Error(`Failed to fetch inventory: ${response.status}`);
      setInv(await response.json());
      setViewState('ok');
    } catch (error) {
      console.error('Error loading inventory details:', error);
      setViewState('error');
    }
  };

  const viewStatus = stockLabel(inv?.quantity ?? 0);

  return (
    <div className="inventory-container">
      <Sidebar active="inventory" />

      <main>
        <div className="page-head">
          <h1>Inventory</h1>
          <div className="search-wrap">
            <span className="material-symbols-sharp">search</span>
            <input
              type="text"
              placeholder="Search products…"
              id="inventory-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            id="open-add-product-btn"
            onClick={() => setAddOpen(true)}
          >
            <span className="material-symbols-sharp">add</span>
            Add product
          </button>
          <ThemeToggler />
        </div>

        <div className="stats-grid">
          <div className="stat-card total">
            <div className="icon">
              <span className="material-symbols-sharp">inventory_2</span>
            </div>
            <div className="text">
              <h1 id="total-products-value">{num(stats.total)}</h1>
              <small>Total products</small>
            </div>
          </div>
          <div className="stat-card low">
            <div className="icon">
              <span className="material-symbols-sharp">warning</span>
            </div>
            <div className="text">
              <h1 id="low-stock-value">{num(stats.low)}</h1>
              <small>Low stock alerts</small>
            </div>
          </div>
          <div className="stat-card out">
            <div className="icon">
              <span className="material-symbols-sharp">remove_shopping_cart</span>
            </div>
            <div className="text">
              <h1 id="out-of-stock-value">{num(stats.out)}</h1>
              <small>Out of stock</small>
            </div>
          </div>
        </div>

        <div className="table-card">
          <h2>All products</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="inventory-tbody">
              {listState === 'error' && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>
                    Failed to load inventory
                  </td>
                </tr>
              )}
              {listState === 'ok' && filtered.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>
                    No inventory found
                  </td>
                </tr>
              )}
              {listState === 'ok' &&
                filtered.map((item, i) => {
                  const quantity = Number(item.quantity ?? 0);
                  const status = stockLabel(quantity);
                  return (
                    <tr key={item.id ?? item.product?.id ?? i}>
                      <td>
                        <div className="product-cell">
                          <div className="product-icon">
                            <span className="material-symbols-sharp">inventory_2</span>
                          </div>
                          <span className="name">
                            {item.product?.name || item.name || 'Unknown Product'}
                          </span>
                        </div>
                      </td>
                      <td>{item.product?.sku || item.sku || 'N/A'}</td>
                      <td>{quantity}</td>
                      <td>
                        <span className={`status ${stockClass(status)}`}>{status}</span>
                      </td>
                      <td>
                        <button
                          className="row-action view-inventory-btn"
                          data-product-id={item.product?.id ?? item.id}
                          onClick={() => openView(item.product?.id ?? item.id)}
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

        <Modal open={addOpen} title="Add Product" onClose={() => setAddOpen(false)}>
          <ModalError message={addError} />

          <form id="add-product-form" onSubmit={handleAdd}>
            <div className="field">
              <label htmlFor="new-product-name">Name</label>
              <input
                type="text"
                id="new-product-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="new-product-sku">SKU</label>
              <input
                type="text"
                id="new-product-sku"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="new-product-category">Category</label>
              <input
                type="text"
                id="new-product-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="new-product-price">Price ($)</label>
              <input
                type="number"
                id="new-product-price"
                step="0.01"
                min="0"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="new-product-quantity">Initial Quantity</label>
              <input
                type="number"
                id="new-product-quantity"
                min="0"
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              id="add-product-submit"
              disabled={submitting}
            >
              Add Product
            </button>
          </form>
        </Modal>

        <Modal open={viewOpen} title="Product Details" onClose={() => setViewOpen(false)}>
          <div className={`view-error${viewState === 'error' ? ' visible' : ''}`}>
            {viewState === 'error' ? 'Could not load product details.' : ''}
          </div>

          <div id="view-inventory-body">
            {viewState === 'loading' && <p>Loading…</p>}
            {viewState === 'ok' && inv && (
              <>
                <div className="view-detail-row">
                  <span>Product</span>
                  <span>{inv.product?.name || 'N/A'}</span>
                </div>
                <div className="view-detail-row">
                  <span>SKU</span>
                  <span>{inv.product?.sku || 'N/A'}</span>
                </div>
                <div className="view-detail-row">
                  <span>Category</span>
                  <span>{inv.product?.category || 'N/A'}</span>
                </div>
                <div className="view-detail-row">
                  <span>Quantity</span>
                  <span>{inv.quantity ?? 0}</span>
                </div>
                <div className="view-detail-row">
                  <span>Status</span>
                  <span className={`status ${stockClass(viewStatus)}`}>{viewStatus}</span>
                </div>
              </>
            )}
          </div>
        </Modal>
      </main>
    </div>
  );
}
