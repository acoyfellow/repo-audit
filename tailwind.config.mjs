/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        surface2: 'rgb(var(--c-surface-2) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        text: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        dim: 'rgb(var(--c-dim) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        bad: 'rgb(var(--c-bad) / <alpha-value>)',
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", 'Georgia', 'serif'],
        body: ["'IBM Plex Sans'", 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ["'IBM Plex Mono'", 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--c-accent) / 0.12), 0 0 28px rgb(var(--c-accent) / 0.08)',
      },
      keyframes: {
        fu: { '0%': { opacity: 0, transform: 'translateY(14px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pulseDim: { '0%,100%': { opacity: 0.35 }, '50%': { opacity: 1 } },
        loadingBar: { '0%': { width: '5%', marginLeft: '0' }, '50%': { width: '40%', marginLeft: '30%' }, '100%': { width: '5%', marginLeft: '95%' } },
        sweep: { '0%': { transform: 'translateX(-20%)' }, '100%': { transform: 'translateX(120%)' } },
      },
      animation: {
        fu: 'fu 700ms cubic-bezier(.16,1,.3,1) both',
        pulseDim: 'pulseDim 2400ms ease-in-out infinite',
        loadingBar: 'loadingBar 2000ms ease-in-out infinite',
        sweep: 'sweep 1600ms cubic-bezier(.16,1,.3,1) infinite',
      },
    },
  },
  plugins: [],
};

