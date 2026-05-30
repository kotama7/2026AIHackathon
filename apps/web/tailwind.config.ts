import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: 'var(--bg-base)',
          surface: 'var(--bg-elevated)',
          overlay: 'var(--bg-overlay)',
          text: 'var(--text-primary)',
          emphasis: 'var(--text-emphasis)',
          muted: 'var(--text-muted)',
          gold: 'var(--accent-gold)',
          'gold-strong': 'var(--accent-gold-strong)',
          danger: 'var(--accent-danger)',
          'danger-strong': 'var(--accent-danger-strong)',
          success: 'var(--accent-success)',
          info: 'var(--accent-info)',
          border: 'var(--border-subtle)',
          'border-strong': 'var(--border-strong)',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        modal: 'var(--shadow-modal)',
      },
      lineHeight: {
        tight: 'var(--line-tight)',
        normal: 'var(--line-normal)',
        relaxed: 'var(--line-relaxed)',
      },
      letterSpacing: {
        display: 'var(--tracking-display)',
        body: 'var(--tracking-body)',
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
