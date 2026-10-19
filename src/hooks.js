import { useEffect, useLayoutEffect, useState, useCallback } from 'react';

// Each original page has its own stylesheet with global rules (*, body, :root).
// To keep every page looking exactly as before, a page's CSS is injected while
// the page is mounted and removed when you leave it.
export function usePageStyles(cssText) {
  useLayoutEffect(() => {
    const el = document.createElement('style');
    el.textContent = cssText;
    document.head.appendChild(el);
    return () => el.remove();
  }, [cssText]);
}

export function useTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

const THEME_CLASS = 'dark-themes-variables';

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Mirrors the old click handler (toggle the body class, swap the .active icon)
// and remembers the choice between pages and reloads.
export function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = safeGet('theme');
    if (saved) return saved === 'dark';
    return document.body.classList.contains(THEME_CLASS);
  });

  useEffect(() => {
    document.body.classList.toggle(THEME_CLASS, dark);
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);
  return [dark, toggle];
}

// Escape closes nothing in the original, so no key handling here: modals close
// from the X button or a click on the dark overlay, exactly as before.
