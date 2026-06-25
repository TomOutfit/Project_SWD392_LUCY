/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0B0B1A',
        navy: '#12122A',
        midnight: '#1A1A35',
        cyan: {
          DEFAULT: '#00F5FF',
          dim: '#00C4CC',
        },
        violet: {
          DEFAULT: '#7B2FFF',
          dim: '#6220DD',
        },
        magenta: {
          DEFAULT: '#FF2D6B',
          dim: '#CC1A50',
        },
        pulse: '#00FF9F',
        amber: '#FFB800',
        mist: '#8892B0',
        ghost: '#2A2A4A',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'system-ui', 'sans-serif'],
        exo: ['Exo 2', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        cyan: '0 0 20px rgba(0, 245, 255, 0.15)',
        cyanHover: '0 0 30px rgba(0, 245, 255, 0.3)',
        violet: '0 0 20px rgba(123, 47, 255, 0.15)',
        magenta: '0 0 20px rgba(255, 45, 107, 0.15)',
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow-dot': 'glow-dot 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 245, 255, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 245, 255, 0.5)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.3)' },
        },
      },
    },
  },
  plugins: [],
};
