/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"IBM Plex Sans Flex"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        display: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px', letterSpacing: '0.3px' }],
        sm: ['13px', { lineHeight: '18px', letterSpacing: '0.2px' }],
        base: ['14px', { lineHeight: '20px', letterSpacing: '0.15px' }],
        lg: ['16px', { lineHeight: '24px', letterSpacing: '0.15px' }],
        xl: ['18px', { lineHeight: '28px', letterSpacing: '0' }],
        '2xl': ['20px', { lineHeight: '32px', letterSpacing: '0' }],
        '3xl': ['24px', { lineHeight: '36px', letterSpacing: '-0.3px' }],
        '4xl': ['32px', { lineHeight: '40px', letterSpacing: '-0.5px' }],
        '5xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.8px' }],
      },
      colors: {
        // Neutral palette
        slate: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        // SOC-specific security alert palette
        soc: {
          // Dark mode
          dark: '#0a0e27',
          darker: '#050813',
          bg: '#0f1420',
          surface: '#161d3a',
          'surface-alt': '#1a2140',
          border: '#2d3f5f',
          'border-light': '#3d4f6f',
          text: '#e4e9f7',
          'text-muted': '#a0aac4',
          'text-soft': '#7a8399',
          
          // Alert severity levels
          critical: '#ef4444',    // Red - Critical
          'critical-light': '#fee2e2',
          'critical-dark': '#dc2626',
          high: '#f59e0b',        // Orange - High
          'high-light': '#fef3c7',
          'high-dark': '#d97706',
          medium: '#eab308',      // Yellow - Medium
          'medium-light': '#fef08a',
          'medium-dark': '#ca8a04',
          low: '#10b981',         // Green - Low/Success
          'low-light': '#d1fae5',
          'low-dark': '#059669',
          info: '#3b82f6',        // Blue - Info
          'info-light': '#dbeafe',
          'info-dark': '#1d4ed8',
          
          // Accent colors
          primary: '#3b82f6',
          'primary-light': '#60a5fa',
          'primary-dark': '#1d4ed8',
          secondary: '#8b5cf6',
          'secondary-light': '#a78bfa',
          'secondary-dark': '#6d28d9',
          accent: '#06b6d4',
          'accent-light': '#22d3ee',
          'accent-dark': '#0891b2',
          
          // UI Colors
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          
          // Overlay & backgrounds
          'overlay-light': 'rgba(0, 0, 0, 0.2)',
          'overlay-dark': 'rgba(0, 0, 0, 0.5)',
        },
        // Light mode overrides
        light: {
          bg: '#f8fafc',
          surface: '#ffffff',
          'surface-alt': '#f1f5f9',
          border: '#cbd5e1',
          'border-light': '#e2e8f0',
          text: '#0f172a',
          'text-muted': '#64748b',
          'text-soft': '#94a3b8',
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        base: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        base: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        lg: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
        xl: '0 25px 50px -12px rgba(0, 0, 0, 0.2)',
        dark: '0 10px 20px 0 rgba(0, 0, 0, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-slow': 'bounce 2s infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)' },
        },
      },
      transitionDuration: {
        150: '150ms',
        300: '300ms',
        500: '500ms',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        base: '8px',
        md: '12px',
        lg: '16px',
      },
      backgroundImage: {
        'gradient-soc': 'linear-gradient(135deg, #0a0e27 0%, #161d3a 100%)',
        'gradient-alert': 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)',
        'gradient-primary': 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      },
      opacity: {
        3: '0.03',
        5: '0.05',
        7: '0.07',
        15: '0.15',
      },
    },
  },
  corePlugins: {
    preflight: true,
  },
  plugins: [
    // Custom utility plugins
    function ({ addComponents, theme }) {
      addComponents({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.scrollbar-custom': {
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgb(100, 116, 139)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgb(71, 85, 105)',
            },
          },
        },
      })
    },
  ],
}

