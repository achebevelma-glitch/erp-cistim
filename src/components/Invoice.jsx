import { Link } from 'react-router-dom';

import { formatCents } from '../utils.js';

export const money = formatCents;

const METHOD_LABELS = {
  card: 'Credit / debit card',
  mobile: 'Mobile money',
  bank: 'Bank transfer',
  cash: 'Cash on delivery',
};
const STATUS_LABELS = { DUE: 'Due', PAID: 'Paid', REFUNDED: 'Refunded' };

export default function Invoice({ invoice, onBack, actions }) {
  return (
    <div className="panel invoice">
      <div className="invoice-head">
        <div>
          <h2>INVOICE</h2>
          <p>{invoice.invoiceNumber}</p>
          <p>{new Date(invoice.createdAt).toLocaleDateString()}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3>
            ElectroTrack<span className="danger">ERP</span>
          </h3>
        </div>
      </div>

      <div>
        <strong>Billed to</strong>
        <p>{invoice.customerName}</p>
        {invoice.customerEmail && <p>{invoice.customerEmail}</p>}
        {invoice.customerPhone && <p>{invoice.customerPhone}</p>}
        {invoice.deliveryAddress && <p>{invoice.deliveryAddress}</p>}
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">Unit price</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((i) => (
            <tr key={`${i.productId}`}>
              <td>
                {i.name}
                {i.sku && <small> ({i.sku})</small>}
              </td>
              <td className="num">{i.quantity}</td>
              <td className="num">{money(i.unitPriceCents)}</td>
              <td className="num">{money(i.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="summary-line total">
        <span>Total</span>
        <span>{money(invoice.totalCents)}</span>
      </div>
      <div className="summary-line">
        <span>Payment method</span>
        <span>{METHOD_LABELS[invoice.paymentMethod] || invoice.paymentMethod}</span>
      </div>
      <div className="summary-line">
        <span>Status</span>
        <span>{STATUS_LABELS[invoice.status] || invoice.status}</span>
      </div>
      {invoice.paidAt && (
        <div className="summary-line">
          <span>Paid on</span>
          <span>{new Date(invoice.paidAt).toLocaleDateString()}</span>
        </div>
      )}
      {invoice.refundedAt && (
        <div className="summary-line">
          <span>Refunded on</span>
          <span>{new Date(invoice.refundedAt).toLocaleDateString()}</span>
        </div>
      )}

      <div className="invoice-actions no-print">
        {actions}
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          <span className="material-symbols-sharp">print</span>
          Print / Save as PDF
        </button>
        {onBack ? (
          <button type="button" className="btn-secondary" onClick={onBack}>
            Back to invoices
          </button>
        ) : (
          <Link to="/invoices" className="btn-secondary">
            View all my invoices
          </Link>
        )}
      </div>
    </div>
  );
}