/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        apptax: {
          blue: '#0A66C2',
          navy: '#1E3A5F',
          'navy-dark': '#0d2137',
          teal: '#00BFA6',
          'light-blue': '#4A90D9',
          'soft-teal': '#E0F7F4',
          'warm-gray': '#F5F5F5',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      boxShadow: {
        'apptax-sm': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'apptax-md': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'apptax-lg': '0 8px 32px rgba(0, 0, 0, 0.16)',
      },
      backgroundImage: {
        'apptax-gradient': 'linear-gradient(135deg, #0A66C2 0%, #1E3A5F 100%)',
        'apptax-dark-gradient': 'linear-gradient(135deg, #1E3A5F 0%, #0d2137 100%)',
        'apptax-ai-gradient': 'linear-gradient(135deg, #00BFA6 0%, #0A66C2 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
