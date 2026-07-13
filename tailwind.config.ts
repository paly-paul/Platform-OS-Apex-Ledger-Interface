import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design token palette — maps 1:1 to apex_app_shell.html CSS custom properties
        paper: '#F7F8F6',
        ink: {
          DEFAULT: '#14181C',
          soft: '#5B6570',
          faint: '#8A939B',
        },
        line: '#E1E4E0',
        surface: '#FFFFFF',
        verified: {
          DEFAULT: '#0B6E4F',
          bg: '#E8F2ED',
        },
        alert: {
          DEFAULT: '#B4442E',
          bg: '#F7EAE7',
        },
        amber: {
          DEFAULT: '#B8860B',
          bg: '#FBF3E2',
        },
        'tax-gold': {
          DEFAULT: '#9C7A32',
          strong: '#7A5F24',
          bg: '#F6F0E3',
        },
      },
      fontFamily: {
        display: ['Instrument Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      spacing: {
        'sidebar': '248px',
        'sidebar-collapsed': '64px',
        'chat-popup-w': '360px',
        'topbar': '56px',
        'chat-fab': '56px',
      },
      width: {
        'sidebar': '248px',
        'sidebar-collapsed': '64px',
        'chat-popup': '360px',
      },
      height: {
        'topbar': '56px',
        'chat-popup': '520px',
        'chat-fab': '56px',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
