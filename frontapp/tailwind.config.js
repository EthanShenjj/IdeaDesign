/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        headline: ['var(--font-headline)', 'Plus Jakarta Sans', 'sans-serif'],
        handwriting: ['var(--font-handwriting)', 'Gochi Hand', 'cursive'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        label: ['var(--font-label)', 'Space Grotesk', 'sans-serif'],
      },
      colors: {
        canvas: '#FBFBF9',
        accent: '#FDE047',
        ink: '#1A1C1B',
        tertiary: '#895200',
      },
      animation: {
        'float-light': 'float-light 20s ease-in-out infinite',
      },
      keyframes: {
        'float-light': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(10%, 10%) scale(1.1)' },
          '66%': { transform: 'translate(-5%, 15%) scale(0.9)' },
        },
      },
    },
  },
  plugins: [],
}
