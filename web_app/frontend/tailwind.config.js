import tailwindcssAnimate from 'tailwindcss-animate'

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
        // Brand palette — Indigo (v3)
        brand: {
          50:    '#EEF2FF',
          100:   '#DCE4FF',
          200:   '#BFCDFF',
          300:   '#9DB1FF',
          400:   '#7C93FF',
          500:   '#4F6EF7',   // PRIMARY
          600:   '#2F47C9',
          700:   '#23379E',
          800:   '#1B2A78',
          900:   '#141F57',
          DEFAULT: '#4F6EF7',
          light:   '#7C93FF',
          dark:    '#2F47C9',
        },
        // Surface tokens (dark mode)
        d: {
          bg:      '#0A0E17',
          surface: '#10141F',
          card:    '#131829',
          raised:  '#1A2030',
          border:  'rgba(124,147,255,0.14)',
          divider: 'rgba(124,147,255,0.10)',
          text:    '#EAEFFB',
          muted:   '#8B95B3',
          faint:   '#5B6585',
        },
        // Surface tokens (light mode)
        l: {
          bg:      '#F7F9FC',
          surface: '#FFFFFF',
          card:    '#FFFFFF',
          raised:  '#F0F3FA',
          border:  'rgba(79,110,247,0.10)',
          divider: 'rgba(79,110,247,0.08)',
          text:    '#11162A',
          muted:   '#5B6585',
          faint:   '#9AA3C0',
        },
        // Severity (Wazuh)
        sev: {
          critical: '#EF4444',
          high:     '#F97316',
          medium:   '#F59E0B',
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
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
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
        DEFAULT: 'var(--radius)',
      },
      boxShadow: {
        'sm':           '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'DEFAULT':      '0 4px 12px rgba(0,0,0,0.08)',
        'md':           '0 8px 24px rgba(0,0,0,0.1)',
        'lg':           '0 16px 40px rgba(0,0,0,0.12)',
        'brand':        '0 4px 16px rgba(79,110,247,0.28)',
        'brand-lg':     '0 8px 28px rgba(79,110,247,0.38)',
        'accent':       '0 4px 16px rgba(34,211,238,0.28)',
        'glow-primary': '0 0 20px rgba(79,110,247,0.45)',
        'glow-accent':  '0 0 18px rgba(34,211,238,0.45)',
        'glow-red':     '0 0 18px rgba(239,68,68,0.45)',
        'glow-green':   '0 0 18px rgba(34,197,94,0.45)',
        'card':         '0 2px 8px rgba(79,110,247,0.06), 0 0 0 1px rgba(79,110,247,0.08)',
        'card-hover':   '0 6px 20px rgba(79,110,247,0.14), 0 0 0 1px rgba(79,110,247,0.16)',
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
          '0%,100%': { boxShadow: '0 0 0 0 rgba(79,110,247,0)' },
          '50%':     { boxShadow: '0 0 10px 3px rgba(79,110,247,0.35)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg,#4F6EF7 0%,#2F47C9 100%)',
        'brand-aurora':    'linear-gradient(135deg,#4F6EF7 0%,#22D3EE 100%)',
        'brand-radial':    'radial-gradient(circle at 60% 40%,#7C93FF,#2F47C9)',
        'sidebar-dark':    'linear-gradient(180deg,#10141F 0%,#0D1119 50%,#0A0E17 100%)',
        'shimmer-base':    'linear-gradient(90deg,transparent 0%,rgba(79,110,247,0.10) 50%,transparent 100%)',
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    function ({ addComponents, addUtilities, addBase }) {
      // ── shadcn/ui compatible CSS variables ──────────────────────────────
      addBase({
        ':root': {
          '--background':           '216 45% 98%',
          '--foreground':           '228 42% 12%',
          '--card':                 '0 0% 100%',
          '--card-foreground':      '228 42% 12%',
          '--popover':              '0 0% 100%',
          '--popover-foreground':   '228 42% 12%',
          '--border':               '228 24% 90%',
          '--input':                '228 24% 90%',
          '--ring':                 '229 91% 64%',
          '--primary':              '229 91% 64%',
          '--primary-foreground':   '0 0% 100%',
          '--secondary':            '188 86% 53%',
          '--secondary-foreground': '222 47% 6%',
          '--muted':                '222 50% 96%',
          '--muted-foreground':     '226 19% 44%',
          '--accent':               '222 50% 95%',
          '--accent-foreground':    '228 42% 12%',
          '--destructive':          '0 84% 60%',
          '--destructive-foreground': '0 0% 100%',
          '--radius':               '0.625rem',
        },
        '.dark': {
          '--background':           '222 47% 6%',
          '--foreground':           '222 68% 95%',
          '--card':                 '224 32% 9%',
          '--card-foreground':      '222 68% 95%',
          '--popover':              '224 30% 12%',
          '--popover-foreground':   '222 68% 95%',
          '--border':               '228 24% 18%',
          '--input':                '228 24% 18%',
          '--ring':                 '229 91% 64%',
          '--primary':              '229 91% 64%',
          '--primary-foreground':   '0 0% 100%',
          '--secondary':            '188 86% 53%',
          '--secondary-foreground': '222 47% 6%',
          '--muted':                '224 30% 14%',
          '--muted-foreground':     '225 21% 62%',
          '--accent':               '224 30% 16%',
          '--accent-foreground':    '222 68% 95%',
          '--destructive':          '0 84% 60%',
          '--destructive-foreground': '0 0% 100%',
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
            'box-shadow': '0 4px 16px rgba(79,110,247,0.12)',
            'border-color': 'rgba(79,110,247,0.25)',
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
          'background': 'rgba(79,110,247,0.15)',
          'color': '#4F6EF7',
          'border': '1px solid rgba(79,110,247,0.2)',
        },
        '.ui-badge-danger': {
          'background': 'rgba(239,68,68,0.12)',
          'color': '#EF4444',
          'border': '1px solid rgba(239,68,68,0.2)',
        },
        '.ui-badge-warning': {
          'background': 'rgba(249,115,22,0.12)',
          'color': '#F97316',
          'border': '1px solid rgba(249,115,22,0.2)',
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
          'background': 'linear-gradient(135deg,#4F6EF7,#2F47C9)',
          'color': '#fff',
          'box-shadow': '0 3px 12px rgba(79,110,247,0.3)',
          '&:hover': { 'box-shadow': '0 5px 18px rgba(79,110,247,0.42)', 'transform': 'translateY(-1px)' },
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
          'scrollbar-color': 'rgba(79,110,247,0.25) transparent',
          '&::-webkit-scrollbar': { width: '5px', height: '5px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(79,110,247,0.25)',
            'border-radius': '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(79,110,247,0.45)',
          },
        },
      })

      addUtilities({
        // Glass effect
        '.glass': {
          background: 'rgba(16,20,35,0.55)',
          'backdrop-filter': 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
          border: '1px solid rgba(124,147,255,0.14)',
        },
        '.glass-light': {
          background: 'rgba(255,255,255,0.72)',
          'backdrop-filter': 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
          border: '1px solid rgba(79,110,247,0.10)',
        },
        // Text gradient
        '.text-brand': {
          background: 'linear-gradient(135deg,#7C93FF,#22D3EE)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-brand-solid': {
          background: 'linear-gradient(135deg,#4F6EF7,#2F47C9)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
      })
    },
  ],
}
