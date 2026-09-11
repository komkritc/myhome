import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Theme {
  id: string;
  name: string;
  nameEn: string;
  colors: Record<string, string>;
  preview: string;
}

const THEMES: Theme[] = [
  {
    id: 'blue',
    name: 'น้ำเงินคลาสสิก',
    nameEn: 'Classic Blue',
    colors: {
      50: '#eef4ff', 100: '#d9e5ff', 200: '#bcd2ff', 300: '#8eb5ff',
      400: '#598dff', 500: '#3366ff', 600: '#1a44f5', 700: '#1333e1',
      800: '#162cb6', 900: '#182b8f', 950: '#141c57',
    },
    preview: 'linear-gradient(135deg, #3366ff 0%, #1a44f5 100%)',
  },
  {
    id: 'purple',
    name: 'ม่วงโมเดิร์น',
    nameEn: 'Modern Purple',
    colors: {
      50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
      400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
      800: '#6b21a8', 900: '#581c87', 950: '#3b0764',
    },
    preview: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
  },
  {
    id: 'teal',
    name: 'เขียวมิ้นท์',
    nameEn: 'Mint Teal',
    colors: {
      50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
      400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
      800: '#115e59', 900: '#134e4a', 950: '#042f2e',
    },
    preview: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  },
  {
    id: 'rose',
    name: 'ชมพูโรส',
    nameEn: 'Rose Pink',
    colors: {
      50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
      400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
      800: '#9f1239', 900: '#881337', 950: '#4c0519',
    },
    preview: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
  },
];

function applyTheme(theme: Theme) {
  let styleEl = document.getElementById('theme-styles') as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'theme-styles';
    document.head.appendChild(styleEl);
  }
  const c = theme.colors;
  styleEl.textContent = `
    :root {
      --brand-50: ${c[50]}; --brand-100: ${c[100]}; --brand-200: ${c[200]};
      --brand-300: ${c[300]}; --brand-400: ${c[400]}; --brand-500: ${c[500]};
      --brand-600: ${c[600]}; --brand-700: ${c[700]}; --brand-800: ${c[800]};
      --brand-900: ${c[900]}; --brand-950: ${c[950]};
    }
    .bg-brand-50 { background-color: ${c[50]} !important; }
    .bg-brand-100 { background-color: ${c[100]} !important; }
    .bg-brand-200 { background-color: ${c[200]} !important; }
    .bg-brand-300 { background-color: ${c[300]} !important; }
    .bg-brand-400 { background-color: ${c[400]} !important; }
    .bg-brand-500 { background-color: ${c[500]} !important; }
    .bg-brand-600 { background-color: ${c[600]} !important; }
    .bg-brand-700 { background-color: ${c[700]} !important; }
    .bg-brand-800 { background-color: ${c[800]} !important; }
    .bg-brand-900 { background-color: ${c[900]} !important; }
    .bg-brand-950 { background-color: ${c[950]} !important; }
    .text-brand-50 { color: ${c[50]} !important; }
    .text-brand-100 { color: ${c[100]} !important; }
    .text-brand-200 { color: ${c[200]} !important; }
    .text-brand-300 { color: ${c[300]} !important; }
    .text-brand-400 { color: ${c[400]} !important; }
    .text-brand-500 { color: ${c[500]} !important; }
    .text-brand-600 { color: ${c[600]} !important; }
    .text-brand-700 { color: ${c[700]} !important; }
    .text-brand-800 { color: ${c[800]} !important; }
    .text-brand-900 { color: ${c[900]} !important; }
    .text-brand-950 { color: ${c[950]} !important; }
    .border-brand-50 { border-color: ${c[50]} !important; }
    .border-brand-100 { border-color: ${c[100]} !important; }
    .border-brand-200 { border-color: ${c[200]} !important; }
    .border-brand-300 { border-color: ${c[300]} !important; }
    .border-brand-400 { border-color: ${c[400]} !important; }
    .border-brand-500 { border-color: ${c[500]} !important; }
    .border-brand-600 { border-color: ${c[600]} !important; }
    .border-brand-700 { border-color: ${c[700]} !important; }
    .border-brand-800 { border-color: ${c[800]} !important; }
    .border-brand-900 { border-color: ${c[900]} !important; }
    .border-brand-950 { border-color: ${c[950]} !important; }
    .ring-brand-50 { --tw-ring-color: ${c[50]} !important; }
    .ring-brand-100 { --tw-ring-color: ${c[100]} !important; }
    .ring-brand-200 { --tw-ring-color: ${c[200]} !important; }
    .ring-brand-300 { --tw-ring-color: ${c[300]} !important; }
    .ring-brand-400 { --tw-ring-color: ${c[400]} !important; }
    .ring-brand-500 { --tw-ring-color: ${c[500]} !important; }
    .ring-brand-600 { --tw-ring-color: ${c[600]} !important; }
    .hover\\:bg-brand-50:hover { background-color: ${c[50]} !important; }
    .hover\\:bg-brand-100:hover { background-color: ${c[100]} !important; }
    .hover\\:bg-brand-200:hover { background-color: ${c[200]} !important; }
    .hover\\:bg-brand-300:hover { background-color: ${c[300]} !important; }
    .hover\\:bg-brand-400:hover { background-color: ${c[400]} !important; }
    .hover\\:bg-brand-500:hover { background-color: ${c[500]} !important; }
    .hover\\:bg-brand-600:hover { background-color: ${c[600]} !important; }
    .hover\\:bg-brand-700:hover { background-color: ${c[700]} !important; }
    .hover\\:bg-brand-800:hover { background-color: ${c[800]} !important; }
    .hover\\:bg-brand-900:hover { background-color: ${c[900]} !important; }
    .hover\\:bg-brand-950:hover { background-color: ${c[950]} !important; }
    .hover\\:text-brand-50:hover { color: ${c[50]} !important; }
    .hover\\:text-brand-100:hover { color: ${c[100]} !important; }
    .hover\\:text-brand-200:hover { color: ${c[200]} !important; }
    .hover\\:text-brand-300:hover { color: ${c[300]} !important; }
    .hover\\:text-brand-400:hover { color: ${c[400]} !important; }
    .hover\\:text-brand-500:hover { color: ${c[500]} !important; }
    .hover\\:text-brand-600:hover { color: ${c[600]} !important; }
    .hover\\:text-brand-700:hover { color: ${c[700]} !important; }
    .hover\\:text-brand-800:hover { color: ${c[800]} !important; }
    .hover\\:text-brand-900:hover { color: ${c[900]} !important; }
    .hover\\:text-brand-950:hover { color: ${c[950]} !important; }
    .focus\\:ring-brand-100:focus { --tw-ring-color: ${c[100]} !important; }
    .focus\\:ring-brand-200:focus { --tw-ring-color: ${c[200]} !important; }
    .focus\\:ring-brand-300:focus { --tw-ring-color: ${c[300]} !important; }
    .focus\\:ring-brand-400:focus { --tw-ring-color: ${c[400]} !important; }
    .focus\\:ring-brand-500:focus { --tw-ring-color: ${c[500]} !important; }
    .focus\\:ring-brand-600:focus { --tw-ring-color: ${c[600]} !important; }
    .from-brand-400 { --tw-gradient-from: ${c[400]}; }
    .from-brand-500 { --tw-gradient-from: ${c[500]}; }
    .to-brand-500 { --tw-gradient-to: ${c[500]}; }
    .to-brand-600 { --tw-gradient-to: ${c[600]}; }
    .via-brand-400 { --tw-gradient-via: ${c[400]}; }
    .via-brand-500 { --tw-gradient-via: ${c[500]}; }
    .shadow-brand-500\\/30 { --tw-shadow-color: ${c[500]}; }
    .bg-brand-50\\/50 { background-color: ${c[50]}80 !important; }
    .bg-brand-600\\/30 { background-color: ${c[600]}4D !important; }
  `;
}

interface ThemeContextType {
  theme: Theme;
  themes: Theme[];
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES[0],
  themes: THEMES,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem('app-theme') || 'blue';
  });

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

  useEffect(() => {
    localStorage.setItem('app-theme', themeId);
    applyTheme(theme);
  }, [themeId, theme]);

  const setTheme = (id: string) => {
    setThemeId(id);
  };

  return (
    <ThemeContext.Provider value={{ theme, themes: THEMES, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
