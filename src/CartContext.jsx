import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'erp_cart';
const CartContext = createContext(null);

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const add = useCallback((product) => {
    setItems((prev) =>
      prev.some((i) => i.id === product.id)
        ? prev
        : [
            ...prev,
            {
              id: product.id,
              name: product.name || 'Unnamed Product',
              sku: product.sku || '',
              priceCents: Number(product.priceCents || 0),
              qty: 1,
            },
          ]
    );
  }, []);

  const remove = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);

  const setQty = useCallback(
    (id, qty) =>
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i))),
    []
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      add,
      remove,
      setQty,
      clear,
      has: (id) => items.some((i) => i.id === id),
      count: items.reduce((n, i) => n + i.qty, 0),
      totalCents: items.reduce((s, i) => s + i.priceCents * i.qty, 0),
    }),
    [items, add, remove, setQty, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);