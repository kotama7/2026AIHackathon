import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: 'var(--bg-base)',
          surface: 'var(--bg-elevated)',
          text: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          gold: 'var(--accent-gold)',
          danger: 'var(--accent-danger)',
          success: 'var(--accent-success)',
          border: 'var(--border-subtle)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
      },
      spacing: {
        gutter: '1.5rem',
        card: '1.25rem',
        section: '2.5rem',
        page: '3rem',
      },
      maxWidth: {
        prose: '70ch',
        board: '72rem',
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
