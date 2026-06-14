import { alpha, createTheme, Theme } from '@mui/material/styles'
import { BRAND } from '@/components/ui/tokens'

declare module '@mui/material/styles' {
  interface TypeBackground {
    card?: string
    elevated?: string
  }
}

const DARK = {
  bg: '#0A0E17',
  paper: '#0D1220',
  card: '#10141F',
  elevated: '#1A2030',
  text: '#EAEFFB',
  muted: '#8B95B3',
  disabled: '#5B6585',
  divider: 'rgba(124,147,255,0.12)',
}

const LIGHT = {
  bg: '#F7F9FC',
  paper: '#FFFFFF',
  card: '#FFFFFF',
  elevated: '#F0F3FA',
  text: '#11162A',
  muted: '#5B6585',
  disabled: '#9AA3C0',
  divider: 'rgba(79,110,247,0.10)',
}

const TRANSITION = 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)'

const createSOCTheme = (mode: 'light' | 'dark' = 'dark'): Theme => {
  const isDark = mode === 'dark'
  const tone = isDark ? DARK : LIGHT

  const palette = {
    mode,
    primary: {
      main: BRAND.primary,
      light: BRAND.primaryLight,
      dark: BRAND.primaryDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: BRAND.accent,
      light: BRAND.accentLight,
      dark: BRAND.accentDark,
      contrastText: '#0B1220',
    },
    success: { main: '#22C55E', light: '#4ADE80', dark: '#15803D', contrastText: '#fff' },
    warning: { main: '#F59E0B', light: '#FBBF24', dark: '#B45309', contrastText: '#111827' },
    error: { main: '#EF4444', light: '#F87171', dark: '#B91C1C', contrastText: '#fff' },
    info: { main: '#38BDF8', light: '#7DD3FC', dark: '#0284C7', contrastText: '#fff' },
    background: {
      default: tone.bg,
      paper: tone.paper,
      card: tone.card,
      elevated: tone.elevated,
    },
    text: {
      primary: tone.text,
      secondary: tone.muted,
      disabled: tone.disabled,
    },
    divider: tone.divider,
    action: {
      active: BRAND.primary,
      hover: alpha(BRAND.primary, isDark ? 0.12 : 0.06),
      hoverOpacity: isDark ? 0.12 : 0.06,
      selected: alpha(BRAND.primary, isDark ? 0.18 : 0.1),
      selectedOpacity: isDark ? 0.18 : 0.1,
      disabled: alpha(tone.text, 0.22),
      disabledBackground: alpha(tone.text, 0.08),
      focus: alpha(BRAND.primary, isDark ? 0.16 : 0.1),
      focusOpacity: isDark ? 0.16 : 0.1,
      activatedOpacity: isDark ? 0.18 : 0.12,
    },
  }

  const shadowColor = isDark ? 'rgba(3, 6, 16,' : 'rgba(17, 22, 42,'
  const shadows = [
    'none',
    `0 1px 2px ${shadowColor}0.10)`,
    `0 2px 6px ${shadowColor}0.10)`,
    `0 6px 16px ${shadowColor}0.12)`,
    `0 10px 24px ${shadowColor}0.14)`,
    `0 16px 36px ${shadowColor}0.16)`,
    ...Array(19).fill(null).map((_, i) =>
      `0 ${20 + i * 3}px ${38 + i * 4}px ${shadowColor}${(0.16 + i * 0.01).toFixed(2)})`
    ),
  ] as Theme['shadows']

  return createTheme({
    palette,
    shape: { borderRadius: 16 },
    shadows,
    typography: {
      fontFamily: '"IBM Plex Sans Thai", "IBM Plex Sans", system-ui, sans-serif',
      fontSize: 14,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
      h1: { fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.04em' },
      h2: { fontSize: '2rem', fontWeight: 800, lineHeight: 1.16, letterSpacing: '-0.03em' },
      h3: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.24, letterSpacing: '-0.02em' },
      h4: { fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3 },
      h5: { fontSize: '1.0625rem', fontWeight: 700, lineHeight: 1.35 },
      h6: { fontSize: '0.9375rem', fontWeight: 700, lineHeight: 1.4 },
      subtitle1: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.55 },
      subtitle2: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.55 },
      body1: { fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.65 },
      body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.6 },
      caption: { fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5 },
      overline: { fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.4, letterSpacing: '0.08em', textTransform: 'uppercase' },
      button: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.4, textTransform: 'none', letterSpacing: '0.01em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': { boxSizing: 'border-box' },
          html: { scrollBehavior: 'smooth' },
          body: {
            backgroundColor: tone.bg,
            color: tone.text,
          },
          'input:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 1000px ${isDark ? tone.paper : '#ffffff'} inset`,
            WebkitTextFillColor: tone.text,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
            fontWeight: 600,
            paddingInline: 14,
            transition: TRANSITION,
          },
          contained: {
            background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
            boxShadow: `0 10px 24px ${alpha(BRAND.primaryDark, isDark ? 0.32 : 0.18)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${BRAND.primaryLight} 0%, ${BRAND.primary} 100%)`,
              boxShadow: `0 14px 28px ${alpha(BRAND.primaryDark, isDark ? 0.38 : 0.24)}`,
            },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${BRAND.accent} 0%, ${BRAND.accentDark} 100%)`,
            boxShadow: `0 10px 24px ${alpha(BRAND.accentDark, isDark ? 0.28 : 0.16)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${BRAND.accentLight} 0%, ${BRAND.accent} 100%)`,
              boxShadow: `0 14px 28px ${alpha(BRAND.accentDark, isDark ? 0.32 : 0.2)}`,
            },
          },
          outlined: {
            borderColor: alpha(isDark ? '#A8B6FF' : '#33415C', isDark ? 0.16 : 0.14),
            color: tone.text,
            '&:hover': {
              borderColor: alpha(BRAND.primary, 0.4),
              backgroundColor: alpha(BRAND.primary, isDark ? 0.08 : 0.05),
            },
          },
          text: {
            color: tone.text,
            '&:hover': {
              backgroundColor: alpha(BRAND.primary, isDark ? 0.08 : 0.05),
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: TRANSITION,
            '&:hover': {
              backgroundColor: alpha(BRAND.primary, isDark ? 0.12 : 0.06),
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? DARK.elevated : '#11162A',
            color: isDark ? DARK.text : LIGHT.bg,
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: 8,
            padding: '6px 10px',
            boxShadow: isDark ? '0 8px 24px rgba(3,6,16,0.5)' : '0 8px 24px rgba(17,22,42,0.18)',
          },
          arrow: {
            color: isDark ? DARK.elevated : '#11162A',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${tone.divider}`,
            borderRadius: 18,
            backgroundColor: alpha(tone.card, isDark ? 0.92 : 1),
            boxShadow: isDark ? '0 20px 48px rgba(3,6,16,0.45)' : '0 16px 36px rgba(17,22,42,0.06)',
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: {
            padding: '16px 18px',
            borderBottom: `1px solid ${tone.divider}`,
          },
          title: {
            fontSize: '0.9375rem',
            fontWeight: 700,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 18,
            '&:last-child': {
              paddingBottom: 18,
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: isDark ? alpha(DARK.bg, 0.6) : '#F7F9FD',
              borderRadius: 12,
              transition: TRANSITION,
              '& fieldset': {
                borderColor: alpha(isDark ? '#A8B6FF' : '#33415C', isDark ? 0.14 : 0.14),
              },
              '&:hover fieldset': {
                borderColor: alpha(BRAND.primary, 0.36),
              },
              '&.Mui-focused fieldset': {
                borderColor: BRAND.primary,
                borderWidth: 1.5,
              },
            },
            '& .MuiInputBase-input': {
              padding: '11px 14px',
              fontSize: '0.875rem',
              '&::placeholder': {
                color: tone.disabled,
                opacity: 1,
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontSize: '0.75rem',
            fontWeight: 700,
            height: 28,
          },
          colorPrimary: {
            backgroundColor: alpha(BRAND.primary, isDark ? 0.18 : 0.1),
            color: isDark ? '#C7D2FE' : BRAND.primaryDark,
          },
          colorSecondary: {
            backgroundColor: alpha(BRAND.accent, isDark ? 0.18 : 0.1),
            color: isDark ? '#A5F3FC' : BRAND.accentDark,
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': {
              color: BRAND.primary,
              '& + .MuiSwitch-track': {
                backgroundColor: BRAND.primary,
                opacity: isDark ? 0.5 : 0.32,
              },
            },
          },
          track: {
            backgroundColor: isDark ? '#3A4368' : '#CBD5E1',
            opacity: 1,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: '1px solid transparent',
          },
          standardError: {
            backgroundColor: alpha('#EF4444', isDark ? 0.12 : 0.08),
            borderColor: alpha('#EF4444', 0.24),
          },
          standardWarning: {
            backgroundColor: alpha('#F59E0B', isDark ? 0.12 : 0.08),
            borderColor: alpha('#F59E0B', 0.24),
          },
          standardSuccess: {
            backgroundColor: alpha('#22C55E', isDark ? 0.12 : 0.08),
            borderColor: alpha('#22C55E', 0.24),
          },
          standardInfo: {
            backgroundColor: alpha(BRAND.primary, isDark ? 0.12 : 0.08),
            borderColor: alpha(BRAND.primary, 0.24),
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: tone.elevated,
            border: `1px solid ${tone.divider}`,
            borderRadius: 12,
            boxShadow: isDark ? '0 20px 48px rgba(3,6,16,0.5)' : '0 20px 48px rgba(17,22,42,0.12)',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 6px',
            fontSize: '0.875rem',
            '&:hover': {
              backgroundColor: alpha(BRAND.primary, isDark ? 0.12 : 0.06),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(BRAND.primary, isDark ? 0.18 : 0.1),
              '&:hover': {
                backgroundColor: alpha(BRAND.primary, isDark ? 0.22 : 0.12),
              },
            },
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: isDark ? alpha('#FFFFFF', 0.03) : '#F8FAFC',
              color: tone.muted,
              fontWeight: 700,
              fontSize: '0.6875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              borderColor: tone.divider,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: tone.divider,
            fontSize: '0.8125rem',
            padding: '12px 14px',
          },
          body: {
            color: tone.text,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: isDark ? alpha('#FFFFFF', 0.025) : alpha('#0F172A', 0.02),
            },
          },
        },
      },
    },
  })
}

export default createSOCTheme
