import { useCallback, useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import ThemeToggler from '../components/ThemeToggler.jsx';
import Modal, { ModalError } from '../components/Modal.jsx';
import { API_BASE_URL, authFetch } from '../api.js';
import { usePageStyles, useTitle } from '../hooks.js';
import { formatStatus } from '../utils.js';
import css from '../styles/transaction.css?inline';

const todayISO = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  type: 'INCOME',
  date: todayISO(),
  description: '',
  category: '',
  amount: '',
});

function formatAmount(amountCents, type) {
  const amount = Number(amountCents || 0) / 100;
  const sign = type === 'income' ? '+' : '-';
  return `${sign}$${amount.toFixed(2)}`;
}

export default function Transactions() {
  usePageStyles(css);
  useTitle('Accounting · ERP');

  const [transactions, setTransactions] = useState([]);
  const [listState, setListState] = useState('loading');

  // Placeholder figures shown until the summary arrives (same as the HTML).
  const [summary, setSummary] = useState({
    revenue: '$84,230',
    expenses: '$41,870',
    profit: '$42,360',
  });

  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadTransactions = useCallback(async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/transactions`);
      if (!response.ok) throw new Error(`Failed to fetch transactions: ${response.status}`);
      const data = await response.json();
      console.log('Transactions received:', data);
      setTransactions(data);
      setListState('ok');
    } catch (error) {
      console.error('Error loading transactions:', error);
      setListState('error');
    }
  }, []);

  const loadAccountingSummary = useCallback(async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/accounting/summary`);
      if (!response.ok) throw new Error(`Failed to fetch summary: ${response.status}`);
      const s = await response.json();
      console.log('Accounting summary:', s);
      setSummary({
        revenue: `$${(Number(s.revenueCents || 0) / 100).toFixed(2)}`,
        expenses: `$${(Number(s.expensesCents || 0) / 100).toFixed(2)}`,
        profit: `$${(Number(s.netProfitCents || 0) / 100).toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error loading accounting summary:', error);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    loadAccountingSummary();
  }, [loadTransactions, loadAccountingSummary]);

  const openAdd = () => {
    setAddError('');
    setForm((f) => ({ ...f, date: todayISO() }));
    setAddOpen(true);
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setAddError('');

    const amountCents = Math.round(Number(form.amount || 0) * 100);

    try {
      const response = await authFetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          date: form.date,
          description: form.description.trim(),
          category: form.category.trim(),
          amountCents,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Failed to add transaction: ${response.status}`);
      }

      setAddOpen(false);
      setForm(emptyForm());
      loadTransactions();
      loadAccountingSummary();
    } catch (error) {
      console.error('Error adding transaction:', error);
      setAddError(error.message || 'Could not add the transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="accounting-container">
      <Sidebar active="transactions" />

      <main>
        <div className="page-head">
          <h1>Accounting</h1>
          <div className="date">
            <input type="date" />
          </div>
          <button
            className="btn-primary"
            id="open-add-transaction-btn"
            onClick={openAdd}
          >
            <span className="material-symbols-sharp">add</span>
            Add transaction
          </button>
          <ThemeToggler />
        </div>

        <div className="summary-grid">
          <div className="summary-card revenue">
            <div className="top-row">
              <div className="icon">
                <span className="material-symbols-sharp">payments</span>
              </div>
              <span className="change up">+12.4%</span>
            </div>
            <h1 id="revenue-value">{summary.revenue}</h1>
            <small>Total revenue</small>
          </div>

          <div className="summary-card expenses">
            <div className="top-row">
              <div className="icon">
                <span className="material-symbols-sharp">receipt</span>
              </div>
              <span className="change down">+6.1%</span>
            </div>
            <h1 id="expenses-value">{summary.expenses}</h1>
            <small>Total expenses</small>
          </div>

          <div className="summary-card profit">
            <div className="top-row">
              <div className="icon">
                <span className="material-symbols-sharp">savings</span>
              </div>
              <span className="change up">+18.7%</span>
            </div>
            <h1 id="profit-value">{summary.profit}</h1>
            <small>Net profit</small>
          </div>
        </div>

        <div className="table-card">
          <h2>Recent transactions</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody id="transactions-tbody">
              {listState === 'error' && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>
                    Failed to load transactions
                  </td>
                </tr>
              )}
              {listState === 'ok' && transactions.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>
                    No transactions found
                  </td>
                </tr>
              )}
              {listState === 'ok' &&
                transactions.map((txn, i) => {
                  const type = (txn.type || '').toLowerCase();
                  return (
                    <tr key={txn.id ?? i}>
                      <td>{txn.date || 'N/A'}</td>
                      <td>{txn.description || 'N/A'}</td>
                      <td>{txn.category || 'N/A'}</td>
                      <td className={`amount ${type}`}>{formatAmount(txn.amountCents, type)}</td>
                      <td>
                        <span className={`status ${type}`}>
                          {type ? formatStatus(type) : 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <Modal open={addOpen} title="Add Transaction" onClose={() => setAddOpen(false)}>
          <ModalError message={addError} />

          <form id="add-transaction-form" onSubmit={handleAdd}>
            <div className="field">
              <label htmlFor="new-transaction-type">Type</label>
              <select
                id="new-transaction-type"
                required
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="new-transaction-date">Date</label>
              <input
                type="date"
                id="new-transaction-date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="new-transaction-description">Description</label>
              <input
                type="text"
                id="new-transaction-description"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="new-transaction-category">Category</label>
              <input
                type="text"
                id="new-transaction-category"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="new-transaction-amount">Amount ($)</label>
              <input
                type="number"
                id="new-transaction-amount"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              id="add-transaction-submit"
              disabled={submitting}
            >
              Add Transaction
            </button>
          </form>
        </Modal>
      </main>
    </div>
  );
}
