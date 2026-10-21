import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import ThemeToggler from '../components/ThemeToggler.jsx';
import Invoice, { money } from '../components/Invoice.jsx';
import { API_BASE_URL, authFetch, unwrap } from '../api.js';
import { getRole } from '../useCurrentUser.js';
import { usePageStyles, useTitle } from '../hooks.js';
import productCss from '../styles/product.css?inline';
import cartCss from '../styles/cart.css?inline';

const STATUS_LABELS = { DUE: 'Due', PAID: 'Paid', REFUNDED: 'Refunded' };

export default function Invoices() {
  usePageStyles(productCss);
  usePageStyles(cartCss);
  useTitle('Invoices · ERP');

  const isAdmin = getRole() === 'ADMIN';
  const [list, setList] = useState([]);
  const [state, setState] = useState('loading');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [restock, setRestock] = useState(true);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/invoices${isAdmin ? '' : '/mine'}`);
        if (!response.ok) throw new Error(`Failed to load invoices: ${response.status}`);
        setList(unwrap(await response.json()));
        setState('ok');
      } catch (error) {
        console.error(error);
        setState('error');
      }
    })();
  }, [isAdmin]);

  const act = async (path, options, fallback) => {
    if (!selected || busy) return;
    setBusy(true);
    setActionError('');
    try {
      const response = await authFetch(`${API_BASE_URL}/invoices/${selected.id}/${path}`, options);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `${fallback} (${response.status})`);
      setSelected(body);
      setList((prev) => prev.map((inv) => (inv.id === body.id ? body : inv)));
    } catch (error) {
      console.error(error);
      setActionError(error.message || fallback);
    } finally {
      setBusy(false);
    }
  };

  const markPaid = () => act('pay', { method: 'PATCH' }, 'Could not mark as paid');

  const refund = () => {
    if (!window.confirm('Refund this invoice? This cannot be undone.')) return;
    act(
      'refund',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restock }),
      },
      'Could not refund'
    );
  };

  const back = () => {
    setSelected(null);
    setActionError('');
  };

  const actions =
    isAdmin && selected ? (
      <>
        {selected.status === 'DUE' && (
          <button type="button" className="btn-primary" onClick={markPaid} disabled={busy}>
            <span className="material-symbols-sharp">paid</span>
            {busy ? 'Saving…' : 'Mark as paid'}
          </button>
        )}
        {selected.status === 'PAID' && (
          <>
            <label className="restock-option">
              <input
                type="checkbox"
                checked={restock}
                onChange={(e) => setRestock(e.target.checked)}
              />
              Return items to stock
            </label>
            <button type="button" className="btn-secondary" onClick={refund} disabled={busy}>
              <span className="material-symbols-sharp">undo</span>
              {busy ? 'Saving…' : 'Refund'}
            </button>
          </>
        )}
      </>
    ) : null;

  return (
    <div className="product-container">
      <Sidebar active="invoices" />

      <main>
        <div className="page-head no-print">
          <h1>{isAdmin ? 'All invoices' : 'My invoices'}</h1>
          <ThemeToggler />
        </div>

        {selected ? (
          <>
            {actionError && (
              <div className="checkout-error no-print" style={{ marginTop: '1.5rem' }}>
                {actionError}
              </div>
            )}
            <Invoice invoice={selected} onBack={back} actions={actions} />
          </>
        ) : (
          <div className="panel" style={{ marginTop: '1.5rem' }}>
            {state === 'loading' && <p>Loading…</p>}
            {state === 'error' && <p>Failed to load invoices.</p>}
            {state === 'ok' && list.length === 0 && <p>No invoices yet.</p>}
            {state === 'ok' && list.length > 0 && (
              <table className="invoice-list">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    {isAdmin && <th>Customer</th>}
                    <th className="num">Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((inv) => (
                    <tr key={inv.id} className="clickable" onClick={() => setSelected(inv)}>
                      <td>{inv.invoiceNumber}</td>
                      <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                      {isAdmin && <td>{inv.customerName}</td>}
                      <td className="num">{money(inv.totalCents)}</td>
                      <td>{STATUS_LABELS[inv.status] || inv.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}