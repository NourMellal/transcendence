/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx,html}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        brand: {
          primary: 'var(--color-brand-primary)',
          secondary: 'var(--color-brand-secondary)',
          accent: 'var(--color-brand-accent)',
          neon: 'var(--color-brand-neon)',
          dark: 'var(--color-brand-dark)',
        },
        // Semantic colors
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
        // UI component colors
        panel: {
          bg: 'var(--color-panel-bg)',
          border: 'var(--color-panel-border)',
        },
        input: {
          bg: 'var(--color-input-bg)',
          border: 'var(--color-input-border)',
          focus: 'var(--color-input-focus)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
      },
      backgroundImage: {
        'grid-neon': 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        orbit: 'orbit 18s linear infinite',
        'pong-ball': 'pongBall 8s linear infinite',
        'pong-paddle-left': 'pongPaddleLeft 8s linear infinite',
        'pong-paddle-right': 'pongPaddleRight 8s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 0.8, filter: 'drop-shadow(0 0 12px rgba(75,225,236,0.4))' },
          '50%': { opacity: 1, filter: 'drop-shadow(0 0 20px rgba(124,93,255,0.6))' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(12rem) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(12rem) rotate(-360deg)' },
        },
        // Real Pong physics: constant velocity, instant direction changes on collisions
        pongBall: {
          // Rally 1: Left paddle → Top wall → Right paddle
          '0%': { transform: 'translate(-9rem, 1rem)' },      // At left paddle
          '0.01%': { transform: 'translate(-9rem, 1rem)' },   // Start moving
          '12.5%': { transform: 'translate(0rem, -2.5rem)' }, // Hit top wall (instant reflection)
          '12.51%': { transform: 'translate(0rem, -2.5rem)' },
          '25%': { transform: 'translate(9rem, 0.5rem)' },    // Hit right paddle
          
          // Rally 2: Right paddle → Bottom wall → Left paddle
          '25.01%': { transform: 'translate(9rem, 0.5rem)' },
          '37.5%': { transform: 'translate(0rem, 2.5rem)' },  // Hit bottom wall
          '37.51%': { transform: 'translate(0rem, 2.5rem)' },
          '50%': { transform: 'translate(-9rem, -1rem)' },    // Hit left paddle
          
          // Rally 3: Left paddle → Right paddle (straight shot)
          '50.01%': { transform: 'translate(-9rem, -1rem)' },
          '62.5%': { transform: 'translate(9rem, -0.5rem)' }, // Hit right paddle
          
          // Rally 4: Right paddle → Bottom wall → Left paddle
          '62.51%': { transform: 'translate(9rem, -0.5rem)' },
          '75%': { transform: 'translate(0rem, 2.5rem)' },    // Hit bottom wall
          '75.01%': { transform: 'translate(0rem, 2.5rem)' },
          '87.5%': { transform: 'translate(-9rem, 0.5rem)' }, // Hit left paddle
          
          // Rally 5: Left paddle → Top wall → Right paddle → back to start
          '87.51%': { transform: 'translate(-9rem, 0.5rem)' },
          '93.75%': { transform: 'translate(-4.5rem, -2.5rem)' }, // Hit top wall
          '93.76%': { transform: 'translate(-4.5rem, -2.5rem)' },
          '100%': { transform: 'translate(-9rem, 1rem)' },    // Back to start
        },
        // Paddles move to intercept position just before ball arrives
        pongPaddleLeft: {
          // Prepare for first hit at 1rem
          '0%': { transform: 'translateY(1rem)' },
          
          // Move to center while ball is away
          '25%': { transform: 'translateY(0rem)' },
          
          // Move to -1rem for second hit
          '48%': { transform: 'translateY(-1rem)' },
          '50%': { transform: 'translateY(-1rem)' },
          
          // Return to center
          '62.5%': { transform: 'translateY(0rem)' },
          
          // Move to 0.5rem for third hit
          '85%': { transform: 'translateY(0.5rem)' },
          '87.5%': { transform: 'translateY(0.5rem)' },
          
          // Move back to 1rem for loop
          '100%': { transform: 'translateY(1rem)' },
        },
        pongPaddleRight: {
          // Start at center, move to 0.5rem for first hit
          '0%': { transform: 'translateY(0rem)' },
          '23%': { transform: 'translateY(0.5rem)' },
          '25%': { transform: 'translateY(0.5rem)' },
          
          // Move to center
          '50%': { transform: 'translateY(0rem)' },
          
          // Move to -0.5rem for second hit
          '60%': { transform: 'translateY(-0.5rem)' },
          '62.5%': { transform: 'translateY(-0.5rem)' },
          
          // Return to center
          '100%': { transform: 'translateY(0rem)' },
        },
      },
      boxShadow: {
        'glass': '0 25px 70px rgba(5, 7, 18, 0.65)',
        'inner-glow': 'inset 0 1px 12px rgba(124, 93, 255, 0.25)',
      },
    },
  },
  plugins: [],
};