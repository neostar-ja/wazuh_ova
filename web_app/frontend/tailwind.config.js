/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    // Sync breakpoints with MUI
    screens: {
      xs: '0px',
      sm: '600px',
      md: '900px',
      lg: '1200px',
      xl: '1536px',
      '2xl': '1920px',
    },
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        // Larger readable sizes (Thai needs extra size)
        '2xs':  ['10px',  { lineHeight: '14px' }],
        'xs':   ['12px',  { lineHeight: '16px' }],
        'sm':   ['13px',  { lineHeight: '18px' }],
        'base': ['14px',  { lineHeight: '20px' }],
        'md':   ['15px',  { lineHeight: '22px' }],
        'lg':   ['16px',  { lineHeight: '24px' }],
        'xl':   ['18px',  { lineHeight: '28px' }],
        '2xl':  ['20px',  { lineHeight: '30px' }],
        '3xl':  ['24px',  { lineHeight: '36px' }],
        '4xl':  ['30px',  { lineHeight: '40px' }],
        '5xl':  ['36px',  { lineHeight: '44px' }],
      },
      colors: {
        // Brand palette
        brand: {
          50:    '#F3EEFF',
          100:   '#E2D4FF',
          200:   '#C5A8FF',
          300:   '#A87BEF',
          400:   '#9B7DC4',
          500:   '#7B5BA4',   // PRIMARY
          600:   '#5A3E85',
          700:   '#3E2560',
          800:   '#26133D',
          900:   '#12081F',
          DEFAULT: '#7B5BA4',
          light:   '#9B7DC4',
          dark:    '#5A3E85',
        },
        accent: {
          50:    '#FFF4EE',
          100:   '#FFE2CC',
          200:   '#FFC499',
          300:   '#FF9642',
          400:   '#F17422',   // SECONDARY
          500:   '#D05810',
          DEFAULT: '#F17422',
          light:   '#FF9642',
          dark:    '#D05810',
        },
        // Surface tokens (dark mode)
        d: {
          bg:      '#0C0A14',
          surface: '#16122A',
          card:    '#1C1830',
          raised:  '#231F38',
          border:  'rgba(123,91,164,0.15)',
          divider: 'rgba(123,91,164,0.1)',
          text:    '#EDE9FA',
          muted:   '#9A90BF',
          faint:   '#5A5278',
        },
        // Surface tokens (light mode)
        l: {
          bg:      '#F5F3FF',
          surface: '#FFFFFF',
          card:    '#FDFCFF',
          raised:  '#F0ECFF',
          border:  'rgba(123,91,164,0.12)',
          divider: 'rgba(123,91,164,0.08)',
          text:    '#1A1033',
          muted:   '#5B4E7A',
          faint:   '#9B90B5',
        },
        // Severity (Wazuh)
        sev: {
          critical: '#EF4444',
          high:     '#F17422',
          medium:   '#EAB308',
          low:      '#22C55E',
          info:     '#38BDF8',
        },
        // shadcn/ui compatible tokens (CSS var based)
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        xs:    '4px',
        sm:    '6px',
        base:  '8px',
        md:    '10px',
        lg:    '12px',
        xl:    '14px',
        '2xl': '16px',
        '3xl': '20px',
        // shadcn style
        DEFAULT: '8px',
      },
      boxShadow: {
        'sm':           '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'DEFAULT':      '0 4px 12px rgba(0,0,0,0.08)',
        'md':           '0 8px 24px rgba(0,0,0,0.1)',
        'lg':           '0 16px 40px rgba(0,0,0,0.12)',
        'brand':        '0 4px 16px rgba(123,91,164,0.28)',
        'brand-lg':     '0 8px 28px rgba(123,91,164,0.38)',
        'accent':       '0 4px 16px rgba(241,116,34,0.28)',
        'glow-purple':  '0 0 20px rgba(123,91,164,0.45)',
        'glow-red':     '0 0 18px rgba(239,68,68,0.45)',
        'glow-green':   '0 0 18px rgba(34,197,94,0.45)',
        'card':         '0 2px 8px rgba(123,91,164,0.06), 0 0 0 1px rgba(123,91,164,0.08)',
        'card-hover':   '0 6px 20px rgba(123,91,164,0.14), 0 0 0 1px rgba(123,91,164,0.15)',
      },
      animation: {
        'fade-in':       'fadeIn 0.28s ease-out both',
        'slide-up':      'slideUp 0.32s ease-out both',
        'slide-in-left': 'slideInLeft 0.28s ease-out both',
        'scale-in':      'scaleIn 0.2s ease-out both',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'pulse-glow':    'glowPulse 2.5s ease-in-out infinite',
        'shimmer':       'shimmer 2.2s linear infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(123,91,164,0)' },
          '50%':     { boxShadow: '0 0 10px 3px rgba(123,91,164,0.35)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg,#7B5BA4 0%,#5A3E85 100%)',
        'brand-warm':      'linear-gradient(135deg,#7B5BA4 0%,#F17422 100%)',
        'brand-radial':    'radial-gradient(circle at 60% 40%,#9B7DC4,#5A3E85)',
        'sidebar-dark':    'linear-gradient(180deg,#1A1230 0%,#110D1E 50%,#0E0A18 100%)',
        'shimmer-base':    'linear-gradient(90deg,transparent 0%,rgba(123,91,164,0.08) 50%,transparent 100%)',
      },
    },
  },
  plugins: [
    function ({ addComponents, addUtilities, addBase }) {
      // ── shadcn/ui compatible CSS variables ──────────────────────────────
      addBase({
        ':root': {
          '--background':           '270 40% 98%',
          '--foreground':           '270 40% 8%',
          '--card':                 '0 0% 100%',
          '--card-foreground':      '270 40% 8%',
          '--border':               '270 20% 88%',
          '--input':                '270 20% 88%',
          '--ring':                 '271 40% 50%',
          '--primary':              '271 29% 50%',
          '--primary-foreground':   '0 0% 100%',
          '--secondary':            '24 87% 53%',
          '--secondary-foreground': '0 0% 100%',
          '--muted':                '270 20% 94%',
          '--muted-foreground':     '270 15% 45%',
          '--radius':               '0.625rem',
        },
        '.dark': {
          '--background':           '271 35% 7%',
          '--foreground':           '270 30% 95%',
          '--card':                 '270 35% 11%',
          '--card-foreground':      '270 30% 95%',
          '--border':               '270 25% 18%',
          '--input':                '270 25% 18%',
          '--ring':                 '271 40% 55%',
          '--primary':              '271 29% 55%',
          '--primary-foreground':   '0 0% 100%',
          '--secondary':            '24 87% 55%',
          '--secondary-foreground': '0 0% 100%',
          '--muted':                '270 25% 14%',
          '--muted-foreground':     '270 15% 58%',
        },
      })

      // ── shadcn/ui-style component classes ────────────────────────────────
      addComponents({
        // Card
        '.ui-card': {
          'background': 'hsl(var(--card))',
          'color': 'hsl(var(--card-foreground))',
          'border': '1px solid hsl(var(--border))',
          'border-radius': 'var(--radius)',
          'box-shadow': '0 1px 3px rgba(0,0,0,0.06)',
          'transition': 'box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            'box-shadow': '0 4px 16px rgba(123,91,164,0.12)',
            'border-color': 'rgba(123,91,164,0.25)',
          },
        },

        // Badge variants
        '.ui-badge': {
          'display': 'inline-flex',
          'align-items': 'center',
          'padding': '2px 8px',
          'border-radius': '999px',
          'font-size': '11px',
          'font-weight': '600',
          'line-height': '16px',
          'white-space': 'nowrap',
        },
        '.ui-badge-primary': {
          'background': 'rgba(123,91,164,0.15)',
          'color': '#7B5BA4',
          'border': '1px solid rgba(123,91,164,0.2)',
        },
        '.ui-badge-danger': {
          'background': 'rgba(239,68,68,0.12)',
          'color': '#EF4444',
          'border': '1px solid rgba(239,68,68,0.2)',
        },
        '.ui-badge-warning': {
          'background': 'rgba(241,116,34,0.12)',
          'color': '#F17422',
          'border': '1px solid rgba(241,116,34,0.2)',
        },
        '.ui-badge-success': {
          'background': 'rgba(34,197,94,0.12)',
          'color': '#22C55E',
          'border': '1px solid rgba(34,197,94,0.2)',
        },

        // Button base
        '.ui-btn': {
          'display': 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'gap': '6px',
          'padding': '8px 16px',
          'border-radius': 'var(--radius)',
          'font-size': '13px',
          'font-weight': '600',
          'cursor': 'pointer',
          'transition': 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
          'border': '1px solid transparent',
          'white-space': 'nowrap',
          'user-select': 'none',
        },
        '.ui-btn-primary': {
          'background': 'linear-gradient(135deg,#7B5BA4,#5A3E85)',
          'color': '#fff',
          'box-shadow': '0 3px 12px rgba(123,91,164,0.3)',
          '&:hover': { 'box-shadow': '0 5px 18px rgba(123,91,164,0.42)', 'transform': 'translateY(-1px)' },
          '&:active': { 'transform': 'translateY(0)' },
        },

        // Scrollbars
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'rgba(123,91,164,0.25) transparent',
          '&::-webkit-scrollbar': { width: '5px', height: '5px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(123,91,164,0.25)',
            'border-radius': '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(123,91,164,0.45)',
          },
        },
      })

      addUtilities({
        // Glass effect
        '.glass': {
          background: 'rgba(28,24,48,0.55)',
          'backdrop-filter': 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
          border: '1px solid rgba(123,91,164,0.15)',
        },
        '.glass-light': {
          background: 'rgba(255,255,255,0.72)',
          'backdrop-filter': 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
          border: '1px solid rgba(123,91,164,0.1)',
        },
        // Text gradient
        '.text-brand': {
          background: 'linear-gradient(135deg,#9B7DC4,#F17422)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-brand-solid': {
          background: 'linear-gradient(135deg,#7B5BA4,#5A3E85)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
      })
    },
  ],
}
