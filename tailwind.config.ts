import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Liturgical season colors
        advent: '#9d4edd',
        christmas: '#ffffff',
        epiphany: '#00d9ff',
        lent: '#9d4edd',
        easter: '#ffd60a',
        pentecost: '#ff006e',
        ordinary: '#4a5859',
      },
      typography: {
        DEFAULT: {
          css: {
            fontSize: '16px',
          },
        },
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
