import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import ThemeToggler from '../components/ThemeToggler.jsx';
import Modal, { ModalError } from '../components/Modal.jsx';
import { API_BASE_URL, authFetch, unwrap } from '../api.js';
import { useCart } from '../CartContext.jsx';
import { getRole } from '../useCurrentUser.js';
import { usePageStyles, useTitle } from '../hooks.js';
import css from '../styles/product.css?inline';
import cartCss from '../styles/cart.css?inline';
import { CURRENCY, formatMoney } from '../utils.js';
import { getProductImage } from '../productImages.js';

const PRODUCTS_ENDPOINT = `${API_BASE_URL}/products`;
const PRODUCTS_LIST_URL = `${PRODUCTS_ENDPOINT}?size=500&sort=id,desc`;
const EMPTY_FORM = { name: '', sku: '', category: '', price: '' };

export default function Products() {
  usePageStyles(css);
  usePageStyles(cartCss);
  useTitle('Products · ERP');

  const navigate = useNavigate();
  const { add, remove, has, count } = useCart();
  const isAdmin = getRole() === 'ADMIN';

  const [catalog, setCatalog] = useState([]);
  const [listState, setListState] = useState('loading');
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadProducts = useCallback(async () => {
    try {
      const response = await authFetch(PRODUCTS_LIST_URL);
      if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
      setCatalog(unwrap(await response.json()));
      setListState('ok');
    } catch (error) {
      console.error('Error loading products:', error);
      setListState('error');
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter((product) => {
      const name = (product.name || '').toLowerCase();
      const category = (product.category?.name || product.category || '').toLowerCase();
      return name.includes(term) || category.includes(term);
    });
  }, [catalog, search]);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setAddError('');

    const priceCents = Math.round(Number(form.price || 0) * 100);

    try {
      const response = await authFetch(PRODUCTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim(),
          category: form.category.trim(),
          priceCents,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Failed to add product: ${response.status}`);
      }

      setAddOpen(false);
      setForm(EMPTY_FORM);
      loadProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      setAddError(error.message || 'Could not add the product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="product-container">
      <Sidebar active="products" />

      <main>
        <div className="page-head">
          <h1>Products</h1>
          <div className="search-wrap">
            <span className="material-symbols-sharp">search</span>
            <input
              type="text"
              placeholder="Search products…"
              id="product-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isAdmin && (
            <button
              className="btn-primary"
              id="open-add-product-btn"
              onClick={() => {
                setAddError('');
                setAddOpen(true);
              }}
            >
              <span className="material-symbols-sharp">add</span>
              Add product
            </button>
          )}

          <Link to="/checkout" className="cart-link" title="View cart">
            <span className="material-symbols-sharp">shopping_cart</span>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>
          <ThemeToggler />
        </div>

        <div className="product-grid" id="product-grid">
          {listState === 'error' && <p className="no-products">Failed to load products.</p>}
          {listState === 'ok' && filtered.length === 0 && (
            <p className="no-products">No products found.</p>
          )}
          {listState === 'ok' &&
            filtered.map((product) => {
              const price = Number(product.priceCents || 0) / 100;
              const inCart = has(product.id);
              const image = getProductImage(product);

              return (
                <div className="product-card" key={product.id}>
                  <div className={image ? 'thumb has-image' : 'thumb'}>
                    {image ? (
                      <img
                        src={image}
                        alt={product.name || 'Product'}
                        loading="lazy"
                        onError={(e) => {
                          // picture missing: show the icon instead of a broken image
                          e.currentTarget.parentElement.classList.remove('has-image');
                          e.currentTarget.replaceWith(
                            Object.assign(document.createElement('span'), {
                              className: 'material-symbols-sharp',
                              textContent: 'inventory_2',
                            }),
                          );
                        }}
                      />
                    ) : (
                      <span className="material-symbols-sharp">inventory_2</span>
                    )}
                  </div>
                  <h3>{product.name || 'Unnamed Product'}</h3>
                  <span className="category">
                    {product.category?.name || product.category || 'Uncategorized'}
                  </span>
                  <div className="price-row">
                    <span className="price">{formatMoney(price)}</span>
                  </div>

                  <div className="card-actions">
                    {inCart ? (
                      <>
                        <button className="btn-primary" onClick={() => navigate('/checkout')}>
                          <span className="material-symbols-sharp">shopping_cart_checkout</span>
                          Checkout
                        </button>
                        <button className="btn-secondary" onClick={() => remove(product.id)}>
                          <span className="material-symbols-sharp">delete</span>
                          Remove
                        </button>
                      </>
                    ) : (
                      <button className="btn-primary" onClick={() => add(product)}>
                        <span className="material-symbols-sharp">add_shopping_cart</span>
                        Add to cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {isAdmin && (
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
                <label htmlFor="new-product-price">Price ({CURRENCY})</label>
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
        )}
      </main>
    </div>
  );
}