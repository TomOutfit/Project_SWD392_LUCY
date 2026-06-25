/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#0B0B1A',
        midnight: '#12122A',
        navy: '#111229',
        mist: '#B8C6F6',
        ghost: '#2A2A4A',
        pulse: '#00D7FF',
        cyan: '#00F5FF',
        violet: '#A855F7',
        magenta: '#FF2D6B',
        amber: '#FFC33C',
      },
      boxShadow: {
        card: '0 20px 60px rgba(10, 11, 35, 0.32)',
        cyan: '0 12px 30px rgba(0, 245, 255, 0.18)',
        violet: '0 12px 30px rgba(168, 85, 247, 0.18)',
        magenta: '0 12px 30px rgba(255, 45, 107, 0.18)',
      },
      fontFamily: {
        inter: ['Inter', 'ui-sans-serif', 'system-ui'],
        exo: ['"Exo 2"', 'ui-sans-serif', 'system-ui'],
        orbitron: ['Orbitron', 'ui-sans-serif', 'system-ui'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular'],
      },
    },
  },
  plugins: [],
};
