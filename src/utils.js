// Formatting helpers lifted from the original page scripts.

export function formatStatus(status) {
  if (!status) return 'N/A';
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Orders page: classes for the shipping status pill.
export function shippingClass(shippingStatus) {
  switch (shippingStatus) {
    case 'DECLINED':
      return 'danger';
    case 'PENDING':
      return 'warning';
    case 'DELIVERED':
      return 'primary';
    default:
      return '';
  }
}

// Dashboard version is case-insensitive.
export function dashboardShippingClass(status) {
  return shippingClass((status || '').toUpperCase());
}

export function stockLabel(quantity) {
  if (quantity === 0) return 'Out of stock';
  if (quantity < 10) return 'Low stock';
  return 'In stock';
}

export function stockClass(status) {
  if (status === 'Out of stock') return 'out-of-stock';
  if (status === 'Low stock') return 'low-stock';
  return 'in-stock';
}

export const num = (n) => Number(n).toLocaleString('en-US');

export const dollars = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

export function formatMoney(amount) {
  return `$${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function timeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  if (Number.isNaN(diff)) return '';

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function initialsOf(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Customers page uses a slightly different initials helper (empty for no name).
export function customerInitials(fullName) {
  if (!fullName) return '';
  return fullName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
