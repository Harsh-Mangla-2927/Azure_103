/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        foreground: '#F2F0E4',
        card: '#141414',
        gold: '#D4AF37',
        'gold-dim': '#9A7D20',
        'gold-light': '#E8CC6A',
        midnight: '#1E3D59',
        muted: '#888888',
        'muted-dark': '#444444',
        border: '#2A2A2A',
        'border-gold': 'rgba(212,175,55,0.3)',
        destructive: '#8B1A1A',
        success: '#1A5C2E',
      },
      fontFamily: {
        heading: ['Marcellus', 'Georgia', 'serif'],
        body: ['Josefin Sans', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.25em',
        widest3: '0.35em',
      },
      borderRadius: {
        DEFAULT: '0px',
        sm: '1px',
        md: '2px',
        lg: '2px',
        full: '9999px',
      },
      boxShadow: {
        gold: '0 0 20px rgba(212,175,55,0.15)',
        'gold-md': '0 0 40px rgba(212,175,55,0.2)',
        'gold-lg': '0 0 60px rgba(212,175,55,0.25)',
        card: '0 2px 20px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
