import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('sia-theme-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.state?.theme || 'light';
    } catch {
      return 'light';
    }
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const initial = getInitialTheme();
applyTheme(initial);

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: initial,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        set((state) => {
          const next = state.theme === 'light' ? 'dark' : 'light';
          applyTheme(next);
          return { theme: next };
        });
      },
    }),
    {
      name: 'sia-theme-storage',
    }
  )
);
