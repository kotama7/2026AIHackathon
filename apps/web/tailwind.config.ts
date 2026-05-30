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
        sans: ['var(--font-sans)', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
