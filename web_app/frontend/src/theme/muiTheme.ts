import { createTheme, Theme } from '@mui/material/styles'

// Module augmentation for custom theme properties
declare module '@mui/material/styles' {
  interface TypeBackground {
    card?: string;
    elevated?: string;
  }
}

// Brand palette
const BRAND = {
  purple: '#7B5BA4',
  purpleLight: '#9B7DC4',
  purpleDark: '#5A3E85',
  purpleFaint: 'rgba(123,91,164,0.12)',
  orange: '#F17422',
  orangeLight: '#FF9642',
  orangeDark: '#D05810',
  orangeFaint: 'rgba(241,116,34,0.12)',
}

// Shared transition
const TRANSITION = 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)'

const createSOCTheme = (mode: 'light' | 'dark' = 'dark'): Theme => {
  const isDark = mode === 'dark'

  const palette = {
    mode,
    ...(isDark ? {
      primary: {
        main: BRAND.purple,
        light: BRAND.purpleLight,
        dark: BRAND.purpleDark,
        contrastText: '#ffffff',
      },
      secondary: {
        main: BRAND.orange,
        light: BRAND.orangeLight,
        dark: BRAND.orangeDark,
        contrastText: '#ffffff',
      },
      success: { main: '#22C55E', light: '#4ADE80', dark: '#16A34A', contrastText: '#fff' },
      warning: { main: '#EAB308', light: '#FACC15', dark: '#CA8A04', contrastText: '#000' },
      error:   { main: '#EF4444', light: '#F87171', dark: '#DC2626', contrastText: '#fff' },
      info:    { main: '#38BDF8', light: '#7DD3FC', dark: '#0EA5E9', contrastText: '#fff' },
      background: {
        default: '#080612',
        paper:   '#120E24',
        card:    '#1A1530',
        elevated:'#221C3A',
      },
      text: {
        primary:   '#EDE9FA',
        secondary: '#9A90BF',
        disabled:  '#4E4470',
      },
      divider: 'rgba(123,91,164,0.18)',
      action: {
        active:            BRAND.purple,
        hover:             'rgba(123,91,164,0.08)',
        hoverOpacity:      0.08,
        selected:          'rgba(123,91,164,0.16)',
        selectedOpacity:   0.16,
        disabled:          'rgba(237,233,250,0.12)',
        disabledBackground:'rgba(237,233,250,0.06)',
        focus:             'rgba(123,91,164,0.06)',
        focusOpacity:      0.06,
        activatedOpacity:  0.16,
      },
    } : {
      primary: {
        main: BRAND.purple,
        light: BRAND.purpleLight,
        dark: BRAND.purpleDark,
        contrastText: '#ffffff',
      },
      secondary: {
        main: BRAND.orange,
        light: BRAND.orangeLight,
        dark: BRAND.orangeDark,
        contrastText: '#ffffff',
      },
      success: { main: '#16A34A', light: '#22C55E', dark: '#15803D', contrastText: '#fff' },
      warning: { main: '#D97706', light: '#EAB308', dark: '#B45309', contrastText: '#fff' },
      error:   { main: '#DC2626', light: '#EF4444', dark: '#B91C1C', contrastText: '#fff' },
      info:    { main: '#0284C7', light: '#38BDF8', dark: '#0369A1', contrastText: '#fff' },
      background: {
        default: '#F5F3FF',
        paper:   '#FFFFFF',
        card:    '#FDFCFF',
        elevated:'#F0ECFF',
      },
      text: {
        primary:   '#1A1033',
        secondary: '#5B4E7A',
        disabled:  '#9B90B5',
      },
      divider: 'rgba(123,91,164,0.12)',
      action: {
        active:            BRAND.purple,
        hover:             'rgba(123,91,164,0.06)',
        hoverOpacity:      0.06,
        selected:          'rgba(123,91,164,0.12)',
        selectedOpacity:   0.12,
        disabled:          'rgba(26,16,51,0.12)',
        disabledBackground:'rgba(26,16,51,0.06)',
        focus:             'rgba(123,91,164,0.05)',
        focusOpacity:      0.05,
        activatedOpacity:  0.12,
      },
    }),
  }

  // Shadows with subtle purple tint for premium feel
  const shadowBase = isDark ? 'rgba(10,6,20,' : 'rgba(90,62,133,'
  const shadows = [
    'none',
    `0 1px 3px ${shadowBase}0.12)`,
    `0 2px 6px ${shadowBase}0.14)`,
    `0 4px 12px ${shadowBase}0.16)`,
    `0 8px 20px ${shadowBase}0.18)`,
    `0 12px 28px ${shadowBase}0.20)`,
    ...Array(19).fill(null).map((_, i) =>
      `0 ${16 + i * 4}px ${24 + i * 6}px ${shadowBase}${(0.20 + i * 0.015).toFixed(3)})`
    ),
  ] as Theme['shadows']

  return createTheme({
    palette,
    typography: {
      // IBM Plex Sans Thai needs slightly larger sizes for Thai readability
      fontFamily: '"IBM Plex Sans Thai", "IBM Plex Sans", system-ui, sans-serif',
      fontSize: 14,
      fontWeightLight:   300,
      fontWeightRegular: 400,
      fontWeightMedium:  500,
      fontWeightBold:    700,
      h1: { fontSize: '2.25rem',  fontWeight: 800, lineHeight: 1.2,  letterSpacing: '-0.5px' },
      h2: { fontSize: '1.875rem', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.3px' },
      h3: { fontSize: '1.5rem',   fontWeight: 700, lineHeight: 1.3,  letterSpacing: '-0.2px' },
      h4: { fontSize: '1.25rem',  fontWeight: 700, lineHeight: 1.35 },
      h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4  },
      h6: { fontSize: '1rem',     fontWeight: 600, lineHeight: 1.45 },
      body1:     { fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.65 },
      body2:     { fontSize: '0.875rem',  fontWeight: 400, lineHeight: 1.6  },
      subtitle1: { fontSize: '1rem',      fontWeight: 600, lineHeight: 1.5  },
      subtitle2: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.5  },
      caption:   { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.2px' },
      overline:  { fontSize: '0.75rem',   fontWeight: 700, lineHeight: 1.5, letterSpacing: '0.8px', textTransform: 'uppercase' },
      button:    { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.5, textTransform: 'none', letterSpacing: '0.1px' },
    },
    shape: { borderRadius: 12 },
    shadows,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': { margin: 0, padding: 0, boxSizing: 'border-box' },
          html: { scrollBehavior: 'smooth' },
          body: { backgroundColor: palette.background.default, color: palette.text.primary },
          'input:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 1000px ${isDark ? '#1A1628' : '#fff'} inset`,
            WebkitTextFillColor: palette.text.primary,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: '10px',
            transition: TRANSITION,
          },
          contained: {
            background: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleDark} 100%)`,
            boxShadow: `0 4px 14px rgba(123,91,164,0.35)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${BRAND.purpleLight} 0%, ${BRAND.purple} 100%)`,
              boxShadow: `0 6px 20px rgba(123,91,164,0.45)`,
              transform: 'translateY(-1px)',
            },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${BRAND.orange} 0%, ${BRAND.orangeDark} 100%)`,
            boxShadow: `0 4px 14px rgba(241,116,34,0.35)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${BRAND.orangeLight} 0%, ${BRAND.orange} 100%)`,
              boxShadow: `0 6px 20px rgba(241,116,34,0.45)`,
              transform: 'translateY(-1px)',
            },
          },
          outlined: {
            borderColor: isDark ? 'rgba(123,91,164,0.4)' : 'rgba(123,91,164,0.3)',
            color: BRAND.purple,
            '&:hover': { borderColor: BRAND.purple, backgroundColor: BRAND.purpleFaint },
          },
          text: {
            color: BRAND.purple,
            '&:hover': { backgroundColor: BRAND.purpleFaint },
          },
        },
        defaultProps: { disableElevation: true },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${palette.divider}`,
            borderRadius: '14px',
            backgroundColor: isDark ? 'rgba(28,24,48,0.85)' : palette.background.paper,
            backdropFilter: isDark ? 'blur(16px)' : 'none',
            boxShadow: isDark
              ? '0 4px 24px rgba(0,0,0,0.35)'
              : '0 2px 12px rgba(123,91,164,0.08)',
            transition: TRANSITION,
            '&:hover': {
              borderColor: isDark ? 'rgba(123,91,164,0.3)' : 'rgba(123,91,164,0.25)',
              boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.5)'
                : '0 8px 24px rgba(123,91,164,0.14)',
            },
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: { padding: '14px 18px', borderBottom: `1px solid ${palette.divider}` },
          title: { fontSize: '14px', fontWeight: 600 },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: '14px', '&:last-child': { paddingBottom: '14px' } },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: isDark ? 'rgba(26,22,40,0.8)' : '#faf9ff',
              backdropFilter: isDark ? 'blur(8px)' : 'none',
              '& fieldset': {
                borderColor: isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.15)',
                borderRadius: '10px',
              },
              '&:hover fieldset': { borderColor: isDark ? 'rgba(123,91,164,0.45)' : 'rgba(123,91,164,0.35)' },
              '&.Mui-focused fieldset': { borderColor: BRAND.purple, borderWidth: '1.5px' },
            },
            '& .MuiInputBase-input': {
              padding: '10px 14px',
              fontSize: '13px',
              '&::placeholder': { color: palette.text.disabled, opacity: 1 },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: '7px', fontSize: '11px', height: '24px', transition: TRANSITION },
          colorPrimary: {
            backgroundColor: isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.1)',
            color: isDark ? BRAND.purpleLight : BRAND.purple,
          },
          colorSecondary: {
            backgroundColor: isDark ? 'rgba(241,116,34,0.2)' : 'rgba(241,116,34,0.1)',
            color: isDark ? BRAND.orangeLight : BRAND.orangeDark,
          },
          colorError:   { backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444' },
          colorWarning: { backgroundColor: 'rgba(234,179,8,0.15)', color: '#EAB308' },
          colorSuccess: { backgroundColor: 'rgba(34,197,94,0.15)', color: '#22C55E' },
          colorInfo:    { backgroundColor: 'rgba(56,189,248,0.15)', color: '#38BDF8' },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: '10px', fontWeight: 500, border: '1px solid',
            '& .MuiAlert-icon': { fontSize: '20px' },
          },
          standardError:   { backgroundColor: 'rgba(239,68,68,0.1)',   borderColor: 'rgba(239,68,68,0.3)',   color: '#EF4444' },
          standardWarning: { backgroundColor: 'rgba(234,179,8,0.1)',   borderColor: 'rgba(234,179,8,0.3)',   color: '#EAB308' },
          standardSuccess: { backgroundColor: 'rgba(34,197,94,0.1)',   borderColor: 'rgba(34,197,94,0.3)',   color: '#22C55E' },
          standardInfo:    { backgroundColor: 'rgba(123,91,164,0.1)',  borderColor: 'rgba(123,91,164,0.3)', color: BRAND.purpleLight },
        },
      },
      MuiTable: { styleOverrides: { root: { backgroundColor: 'transparent' } } },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 700,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: palette.text.disabled,
              borderColor: palette.divider,
              backgroundColor: isDark ? 'rgba(123,91,164,0.06)' : 'rgba(123,91,164,0.04)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: palette.divider, fontSize: '12px', padding: '10px 14px' },
          head: { fontWeight: 600, color: palette.text.secondary },
          body: { color: palette.text.primary },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 150ms ease',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(123,91,164,0.06)' : 'rgba(123,91,164,0.04)',
            },
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: `1px solid ${palette.divider}`,
            borderRadius: '14px',
            backgroundColor: isDark ? 'rgba(28,24,48,0.85)' : palette.background.paper,
            backdropFilter: isDark ? 'blur(12px)' : 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: isDark ? 'rgba(123,91,164,0.06)' : 'rgba(123,91,164,0.04)',
              borderBottom: `1px solid ${palette.divider}`,
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: isDark ? 'rgba(123,91,164,0.06)' : 'rgba(123,91,164,0.04)',
            },
            '& .MuiDataGrid-cell': {
              borderColor: palette.divider, color: palette.text.primary, fontSize: '12px',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontSize: '10px', textTransform: 'uppercase',
              letterSpacing: '0.08em', color: palette.text.disabled, fontWeight: 700,
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: isDark ? 'rgba(30,25,53,0.95)' : palette.background.paper,
            backdropFilter: 'blur(24px)',
            border: `1px solid ${palette.divider}`,
            boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.6)' : '0 25px 60px rgba(123,91,164,0.2)',
            borderRadius: '16px',
          },
          backdrop: { backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(26,16,51,0.4)' },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: isDark ? 'rgba(30,25,53,0.95)' : palette.background.paper,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${palette.divider}`,
            boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(123,91,164,0.15)',
            borderRadius: '12px',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: '9px',
            transition: TRANSITION,
            '&:hover': { backgroundColor: 'rgba(123,91,164,0.1)' },
          },
        },
      },
      MuiTabs: { styleOverrides: { root: { minHeight: 0 }, indicator: { display: 'none' } } },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 34, borderRadius: 8, padding: '6px 16px',
            color: palette.text.secondary, textTransform: 'none',
            fontSize: '13px', fontWeight: 500, transition: TRANSITION,
            '&.Mui-selected': {
              background: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleDark} 100%)`,
              color: '#fff',
            },
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            background: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleDark} 100%)`,
            color: '#ffffff', fontWeight: 700,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: '4px', height: '5px',
            backgroundColor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)',
          },
          bar: {
            borderRadius: '4px',
            background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.orange})`,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? 'rgba(38,31,61,0.95)' : 'rgba(26,16,51,0.95)',
            backdropFilter: 'blur(12px)',
            color: '#EDE9FA',
            fontSize: '12px', padding: '8px 12px', borderRadius: '8px', fontWeight: 500,
            border: `1px solid ${palette.divider}`,
          },
          arrow: { color: isDark ? '#261F3D' : '#1A1033' },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: BRAND.purple,
              '& + .MuiSwitch-track': { backgroundColor: BRAND.purple, opacity: 0.6 },
            },
          },
        },
      },
      MuiPagination: {
        styleOverrides: {
          root: {
            '& .MuiPaginationItem-page.Mui-selected': {
              backgroundColor: BRAND.purple, color: '#fff',
              '&:hover': { backgroundColor: BRAND.purpleDark },
            },
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
            borderRadius: '8px',
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: {
            fontWeight: 700,
            fontSize: '10px',
            minWidth: '18px',
            height: '18px',
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(123,91,164,0.2)' : 'rgba(123,91,164,0.15)',
              borderRadius: '10px',
              transition: TRANSITION,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(123,91,164,0.45)' : 'rgba(123,91,164,0.35)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: BRAND.purple,
              borderWidth: '1.5px',
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: isDark ? '#1A1230' : '#F5F3FF',
            borderRight: `1px solid ${palette.divider}`,
            borderLeft: `1px solid ${palette.divider}`,
          },
          root: {
            '& .MuiDrawer-paperAnchorRight': {
              borderLeft: `1px solid ${palette.divider}`,
              borderRight: 'none',
              boxShadow: isDark
                ? '-24px 0 60px rgba(0,0,0,0.5)'
                : '-12px 0 40px rgba(90,62,133,0.15)',
            },
          },
        },
      },
      MuiBreadcrumbs: {
        styleOverrides: {
          separator: {
            color: palette.text.disabled,
            fontSize: '14px',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            transition: TRANSITION,
            '&:hover': {
              backgroundColor: isDark ? 'rgba(123,91,164,0.12)' : 'rgba(123,91,164,0.08)',
            },
          },
        },
      },
    } as any,
  })
}

export default createSOCTheme
