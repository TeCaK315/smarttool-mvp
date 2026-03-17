import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4b3d66',
          50: '#4b3d6610',
          100: '#4b3d6620',
          500: '#4b3d66',
          600: '#4b3d66',
          700: '#4b3d66',
        },
        secondary: {
          DEFAULT: '#6a5b8a',
          500: '#6a5b8a',
        },
        accent: {
          DEFAULT: '#ff5c00',
          500: '#ff5c00',
        },
        background: '#0c0a1d',
        foreground: '#e4e4e4',
      },
      fontFamily: {
        heading: ['Cabinet Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
