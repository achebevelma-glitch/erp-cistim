import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import ThemeToggler from '../components/ThemeToggler.jsx';
import Invoice, { money } from '../components/Invoice.jsx';
import { API_BASE_URL, authFetch } from '../api.js';
import { useCart } from '../CartContext.jsx';
import { getCurrentUser } from '../useCurrentUser.js';
import { usePageStyles, useTitle } from '../hooks.js';
import productCss from '../styles/product.css?inline';
import cartCss from '../styles/cart.css?inline';

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / debit card', icon: 'credit_card', hint: 'Visa, Mastercard' },
  { id: 'mobile', label: 'Mobile money', icon: 'smartphone', hint: 'Pay from your phone' },
  { id: 'bank', label: 'Bank transfer', icon: 'account_balance', hint: 'Pay using the invoice details' },
  { id: 'cash', label: 'Cash on delivery', icon: 'payments', hint: 'Pay when you receive the goods' },
];

export default function Checkout() {
  usePageStyles(productCss);
  usePageStyles(cartCss);
  useTitle('Checkout · ERP');

  const { items, remove, setQty, clear, totalCents } = useCart();
  const user = getCurrentUser();

  const [details, setDetails] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
  });
  const [paymentId, setPaymentId] = useState('card');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState(null);

  const placeOrder = async (event) => {
    event.preventDefault();
    if (items.length === 0 || submitting) return;
    if (!details.name.trim()) {
      setError('Please enter your name.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const response = await authFetch(`${API_BASE_URL}/invoices/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: details.name.trim(),
          email: details.email.trim(),
          phone: details.phone.trim(),
          address: details.address.trim(),
          paymentMethod: paymentId,
          items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `Checkout failed (${response.status})`);

      setInvoice(body);
      clear();
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Could not place the order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="product-container">
      <Sidebar active="products" />

      <main>
        <div className="page-head no-print">
          <h1>{invoice ? 'Invoice' : 'Checkout'}</h1>
          <ThemeToggler />
        </div>

        {invoice ? (
          <Invoice invoice={invoice} />
        ) : items.length === 0 ? (
          <div className="panel" style={{ marginTop: '1.5rem' }}>
            <p>Your cart is empty.</p>
            <p style={{ marginTop: '1rem' }}>
              <Link to="/products" className="btn-primary">Browse products</Link>
            </p>
          </div>
        ) : (
          <form className="checkout-grid" onSubmit={placeOrder}>
            <div>
              <div className="panel">
                <h2>Your cart</h2>
                {items.map((i) => (
                  <div className="cart-row" key={i.id}>
                    <div className="info">
                      <strong>{i.name}</strong>
                      <br />
                      <small>{money(i.priceCents)} each</small>
                    </div>
                    <div className="qty">
                      <button type="button" onClick={() => setQty(i.id, i.qty - 1)}>−</button>
                      <span>{i.qty}</span>
                      <button type="button" onClick={() => setQty(i.id, i.qty + 1)}>+</button>
                    </div>
                    <strong>{money(i.priceCents * i.qty)}</strong>
                    <button type="button" className="icon-btn" title="Remove" onClick={() => remove(i.id)}>
                      <span className="material-symbols-sharp">delete</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="panel">
                <h2>Billing details</h2>
                <div className="field">
                  <label htmlFor="c-name">Full name</label>
                  <input id="c-name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="c-email">Email</label>
                  <input id="c-email" type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="c-phone">Phone</label>
                  <input id="c-phone" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="c-address">Delivery address</label>
                  <textarea id="c-address" rows="2" value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <div className="panel">
                <h2>Payment method</h2>
                {PAYMENT_METHODS.map((m) => (
                  <label key={m.id} className={`pay-option${paymentId === m.id ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentId === m.id}
                      onChange={() => setPaymentId(m.id)}
                    />
                    <span className="material-symbols-sharp">{m.icon}</span>
                    <span>
                      {m.label}
                      <small>{m.hint}</small>
                    </span>
                  </label>
                ))}
                <p className="pay-note">
                  Payment is not processed in this version. The invoice is issued as "Due".
                </p>
              </div>

              <div className="panel">
                <h2>Summary</h2>
                <div className="summary-line">
                  <span>Items</span>
                  <span>{items.reduce((n, i) => n + i.qty, 0)}</span>
                </div>
                <div className="summary-line total">
                  <span>Total</span>
                  <span>{money(totalCents)}</span>
                </div>
                {error && <div className="checkout-error" style={{ marginTop: '1rem' }}>{error}</div>}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                >
                  {submitting ? 'Placing order…' : 'Place order & get invoice'}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}