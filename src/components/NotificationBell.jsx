import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, authFetch } from '../api.js';
import { usePageStyles } from '../hooks.js';
import { formatCents, timeAgo } from '../utils.js';
import notificationsCss from '../styles/notifications.css?inline';

const POLL_MS = 15000;

// Lives outside the component so moving between pages does not reset it.
// The pop-up toast only fires when the unread count goes UP after the first load.
let lastUnread = null;

// Admin only. Shows a bell with an unread count, a list of messages,
// and a pop-up when a new order arrives. Checks the server every 15 seconds.
// If loading fails it says why (in the list and in the browser console).
export default function NotificationBell() {
  usePageStyles(notificationsCss);
  const navigate = useNavigate();
  const [data, setData] = useState({ unreadCount: 0, items: [] });
  const [loadError, setLoadError] = useState('');
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const bellRef = useRef(null);
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/notifications`);
      if (!response.ok) {
        const hint =
          response.status === 403 ? ' (this account is not an Admin)'
          : response.status === 404 ? ' (the backend has no /api/notifications yet: restart it)'
          : '';
        console.error('Notifications: server answered', response.status, response.url);
        setLoadError(`The server answered ${response.status}${hint}.`);
        return;
      }
      const body = await response.json();
      const next = {
        unreadCount: Number(body.unreadCount ?? 0),
        items: Array.isArray(body.items) ? body.items : [],
      };
      if (lastUnread !== null && next.unreadCount > lastUnread) {
        const newest = next.items.find((n) => !n.seen);
        if (newest) setToast(newest);
      }
      lastUnread = next.unreadCount;
      setLoadError('');
      setData(next);
    } catch (error) {
      console.error('Notifications failed to load:', error);
      setLoadError('Cannot reach the server. Is the backend running?');
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // The toast fades away by itself.
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Click anywhere else to close the list.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (panelRef.current?.contains(event.target) || bellRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const send = (path) => authFetch(`${API_BASE_URL}${path}`, { method: 'PATCH' }).catch(() => null);

  const openNotification = async (n) => {
    setOpen(false);
    setToast(null);
    if (!n.seen) {
      await send(`/notifications/${n.id}/read`);
      load();
    }
        navigate(n.invoiceId ? '/invoices' : '/orders');
  };

  const markAll = async () => {
    await send('/notifications/read-all');
    load();
  };

  const count = data.unreadCount;

  return (
    <>
      <button
        type="button"
        ref={bellRef}
        className="notif-link"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications, ${count} unread`}
        title={loadError || undefined}
      >
        <span className="notif-icon">
          <span className="material-symbols-sharp">{loadError ? 'notifications_off' : 'notifications'}</span>
          {count > 0 && <span className="notif-badge">{count > 99 ? '99+' : count}</span>}
        </span>
        <h3>Notifications</h3>
      </button>

      {open &&
        createPortal(
          <div className="notif-panel" ref={panelRef} role="dialog" aria-label="Notifications">
            <div className="notif-head">
              <strong>Notifications</strong>
              {count > 0 && (
                <button type="button" className="notif-text-btn" onClick={markAll}>
                  Mark all as read
                </button>
              )}
            </div>
            {loadError && <p className="notif-empty" style={{ color: 'var(--color-danger)' }}>{loadError}</p>}
            {!loadError && data.items.length === 0 && <p className="notif-empty">No notifications yet.</p>}
            {data.items.map((n) => (
              <button
                type="button"
                key={n.id}
                className={`notif-item${n.seen ? '' : ' unread'}`}
                onClick={() => openNotification(n)}
              >
                <span className="material-symbols-sharp notif-item-icon">receipt_long</span>
                <span className="notif-item-body">
                  <span className="notif-item-title">{n.title}</span>
                  <span className="notif-item-text">{n.message}</span>
                  <span className="notif-item-meta">
                    {n.amountCents != null && `${formatCents(n.amountCents)} · `}
                    {timeAgo(n.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>,
          document.body
        )}

      {toast &&
        createPortal(
          <button type="button" className="notif-toast" onClick={() => openNotification(toast)}>
            <span className="material-symbols-sharp">shopping_bag</span>
            <span>
              <strong>{toast.title}</strong>
              <br />
              {toast.message}
              {toast.amountCents != null && ` · ${formatCents(toast.amountCents)}`}
            </span>
          </button>,
          document.body
        )}
    </>
  );
}