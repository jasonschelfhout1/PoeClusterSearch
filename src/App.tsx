import React, { useEffect, useState } from 'react';
import ClusterJewelSearch from './components/ClusterJewelSearch';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'poe-cluster-search-theme';

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Jason&apos;s cooking with cluster jewels
            </h1>
            <p className="max-w-2xl text-base text-[var(--text-secondary)]">
              Pick your big ass cluster money maker and see what you can cook up.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-3 self-start rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 py-3 text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            onClick={() =>
              setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
            }
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Theme
            </span>
            <span className="min-w-[4.5rem] rounded-full bg-[var(--surface-subtle)] px-3 py-1.5 text-center text-sm font-bold text-[var(--text-primary)]">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
        </header>

        <ClusterJewelSearch />
      </div>
    </div>
  );
}

export default App;
