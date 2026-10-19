import { useTheme } from '../hooks.js';

export default function ThemeToggler() {
  const [dark, toggle] = useTheme();

  return (
    <div className="theme-toggler" onClick={toggle}>
      <span className={`material-symbols-sharp${dark ? '' : ' active'}`}>light_mode</span>
      <span className={`material-symbols-sharp${dark ? ' active' : ''}`}>dark_mode</span>
    </div>
  );
}
