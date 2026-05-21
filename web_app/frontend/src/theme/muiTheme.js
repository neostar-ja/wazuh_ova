import { createTheme } from '@mui/material/styles'

const createSOCTheme = (mode = 'dark') => {
  const isDark = mode === 'dark'

  // Color palettes
  const palette = {
    mode,
    ...(isDark ? {
      primary: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#1d4ed8',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#8b5cf6',
        light: '#a78bfa',
        dark: '#6d28d9',
        contrastText: '#ffffff',
      },
      success: {
        main: '#10b981',
        light: '#6ee7b7',
        dark: '#059669',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
        contrastText: '#000000',
      },
      error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
        contrastText: '#ffffff',
      },
      info: {
        main: '#6366f1',
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff',
      },
      background: {
        default: '#060c17',
        paper: '#0d1825',
        dark: '#060c17',
        light: '#132032',
      },
      text: {
        primary: '#f0f4ff',
        secondary: '#8899bb',
        disabled: '#445566',
      },
      divider: 'rgba(255,255,255,0.06)',
      action: {
        active: '#3b82f6',
        hover: 'rgba(255,255,255,0.03)',
        hoverOpacity: 0.08,
        selected: 'rgba(59, 130, 246, 0.12)',
        selectedOpacity: 0.12,
        disabled: 'rgba(228, 233, 247, 0.12)',
        disabledBackground: 'rgba(228, 233, 247, 0.06)',
        focus: 'rgba(59, 130, 246, 0.05)',
        focusOpacity: 0.05,
        activatedOpacity: 0.12,
      },
    } : {
      primary: {
        main: '#1d4ed8',
        light: '#3b82f6',
        dark: '#1e40af',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#7c3aed',
        light: '#8b5cf6',
        dark: '#6d28d9',
        contrastText: '#ffffff',
      },
      success: {
        main: '#059669',
        light: '#10b981',
        dark: '#047857',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#d97706',
        light: '#f59e0b',
        dark: '#b45309',
        contrastText: '#ffffff',
      },
      error: {
        main: '#dc2626',
        light: '#ef4444',
        dark: '#b91c1c',
        contrastText: '#ffffff',
      },
      info: {
        main: '#0891b2',
        light: '#06b6d4',
        dark: '#0e7490',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f8fafc',
        paper: '#ffffff',
        dark: '#f1f5f9',
        light: '#ffffff',
      },
      text: {
        primary: '#0f172a',
        secondary: '#64748b',
        disabled: '#94a3b8',
      },
      divider: '#cbd5e1',
      action: {
        active: '#1d4ed8',
        hover: 'rgba(29, 78, 216, 0.08)',
        hoverOpacity: 0.08,
        selected: 'rgba(29, 78, 216, 0.12)',
        selectedOpacity: 0.12,
        disabled: 'rgba(15, 23, 42, 0.12)',
        disabledBackground: 'rgba(15, 23, 42, 0.06)',
        focus: 'rgba(29, 78, 216, 0.05)',
        focusOpacity: 0.05,
        activatedOpacity: 0.12,
      },
    }),
  }

  return createTheme({
    palette,
    typography: {
      fontFamily: '"IBM Plex Sans", "IBM Plex Sans Flex", system-ui, sans-serif',
      fontSize: 14,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      h1: {
        fontSize: '32px',
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '-0.5px',
      },
      h2: {
        fontSize: '28px',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.3px',
      },
      h3: {
        fontSize: '24px',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.2px',
      },
      h4: {
        fontSize: '20px',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '18px',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: '16px',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '14px',
        fontWeight: 400,
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '13px',
        fontWeight: 400,
        lineHeight: 1.5,
      },
      subtitle1: {
        fontSize: '16px',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: '14px',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      caption: {
        fontSize: '12px',
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '0.3px',
      },
      overline: {
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      },
      button: {
        fontSize: '14px',
        fontWeight: 500,
        lineHeight: 1.5,
        textTransform: 'none',
        letterSpacing: '0.15px',
      },
    },
    shape: {
      borderRadius: 8,
    },
    shadows: [
      'none',
      isDark 
        ? '0 1px 2px 0 rgba(0, 0, 0, 0.3)'
        : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      isDark
        ? '0 1px 3px 0 rgba(0, 0, 0, 0.4)'
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      isDark
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)'
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      isDark
        ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
        : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      isDark
        ? '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
        : '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
      ...Array(19).fill(null).map((_, i) =>
        isDark
          ? `0 ${25 + i * 5}px ${30 + i * 5}px ${-12 + i}px rgba(0, 0, 0, 0.7)`
          : `0 ${25 + i * 5}px ${30 + i * 5}px ${-12 + i}px rgba(0, 0, 0, 0.2)`
      ),
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
          },
          html: {
            scrollBehavior: 'smooth',
          },
          body: {
            backgroundColor: palette.background.default,
            color: palette.text.primary,
          },
          'input:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 1000px ' + (isDark ? '#0f1420' : '#ffffff') + ' inset',
            WebkitTextFillColor: palette.text.primary,
          },
          'input:-webkit-autofill:focus': {
            WebkitBoxShadow: '0 0 0 1000px ' + (isDark ? '#161d3a' : '#f8fafc') + ' inset',
            WebkitTextFillColor: palette.text.primary,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: '8px',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: isDark
                ? '0 10px 20px 0 rgba(0, 0, 0, 0.3)'
                : '0 4px 12px 0 rgba(0, 0, 0, 0.1)',
            },
          },
          contained: {
            boxShadow: isDark
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              boxShadow: isDark
                ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            },
          },
          outlined: {
            borderColor: palette.divider,
            color: palette.text.primary,
            '&:hover': {
              borderColor: palette.primary.main,
              backgroundColor: palette.action.hover,
            },
          },
          text: {
            color: palette.primary.main,
            '&:hover': {
              backgroundColor: palette.action.hover,
            },
          },
          sizeLarge: {
            padding: '12px 24px',
            fontSize: '16px',
          },
          sizeMedium: {
            padding: '8px 16px',
            fontSize: '14px',
          },
          sizeSmall: {
            padding: '6px 12px',
            fontSize: '13px',
          },
        },
        defaultProps: {
          disableElevation: false,
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `0.5px solid ${palette.divider}`,
            borderRadius: '12px',
            backgroundColor: isDark ? '#0d1825' : palette.background.paper,
            boxShadow: isDark
              ? '0 10px 24px -18px rgba(0,0,0,0.85)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: isDark
                ? '0 16px 36px -20px rgba(0,0,0,0.9)'
                : '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
              borderColor: isDark ? 'rgba(59,130,246,0.22)' : palette.primary.main,
            },
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: {
            padding: '16px 20px',
            borderBottom: `1px solid ${palette.divider}`,
          },
          title: {
            fontSize: '16px',
            fontWeight: 600,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: '16px',
            '&:last-child': {
              paddingBottom: '16px',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: isDark ? '#1a2c45' : '#ffffff',
              '& fieldset': {
                borderColor: palette.divider,
                borderRadius: '8px',
              },
              '&:hover fieldset': {
                borderColor: palette.text.secondary,
              },
              '&.Mui-focused fieldset': {
                borderColor: 'rgba(59,130,246,0.5)',
                borderWidth: '1px',
              },
            },
            '& .MuiInputBase-input': {
              padding: '10px 12px',
              fontSize: '12px',
              '&::placeholder': {
                color: palette.text.disabled,
                opacity: 1,
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            fontWeight: 600,
            borderRadius: '6px',
            fontSize: '11px',
            height: '24px',
            '& .MuiChip-deleteIcon': {
              color: 'inherit',
              opacity: 0.7,
              '&:hover': {
                opacity: 1,
              },
            },
          },
          filled: {
            backgroundColor: palette.action.selected,
            color: palette.text.primary,
          },
          outlined: {
            borderColor: palette.divider,
            color: palette.text.primary,
          },
          colorError: {
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#ef4444',
          },
          colorWarning: {
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            color: '#f59e0b',
          },
          colorSuccess: {
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
          },
          colorInfo: {
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            color: '#3b82f6',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            fontWeight: 500,
            border: `1px solid`,
            '& .MuiAlert-icon': {
              fontSize: '20px',
            },
          },
          standardError: {
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
          },
          standardWarning: {
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
            borderColor: 'rgba(245, 158, 11, 0.3)',
            color: '#f59e0b',
          },
          standardSuccess: {
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            color: '#10b981',
          },
          standardInfo: {
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            color: '#3b82f6',
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? palette.background.paper : palette.background.paper,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(228, 233, 247, 0.05)' : 'rgba(15, 23, 42, 0.03)',
            '& .MuiTableCell-head': {
              fontWeight: 600,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: palette.text.disabled,
              borderColor: palette.divider,
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15, 23, 42, 0.03)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: palette.divider,
            fontSize: '11px',
            padding: '10px 14px',
          },
          head: {
            fontWeight: 600,
            color: palette.text.secondary,
          },
          body: {
            color: palette.text.primary,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 200ms ease',
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(228, 233, 247, 0.05)'
                : 'rgba(15, 23, 42, 0.02)',
            },
          },
          head: {
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(228, 233, 247, 0.05)'
                : 'rgba(15, 23, 42, 0.03)',
            },
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: `0.5px solid ${palette.divider}`,
            borderRadius: '12px',
            backgroundColor: isDark ? palette.background.paper : palette.background.paper,
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15, 23, 42, 0.03)',
              borderBottom: `0.5px solid ${palette.divider}`,
            },
            '& .MuiDataGrid-row': {
              '&:hover': {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.02)'
                  : 'rgba(29, 78, 216, 0.05)',
              },
            },
            '& .MuiDataGrid-cell': {
              borderColor: palette.divider,
              color: palette.text.primary,
              fontSize: '11px',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: palette.text.disabled,
              fontWeight: 600,
            },
          },
        },
      },
      MuiPagination: {
        styleOverrides: {
          root: {
            '& .MuiPaginationItem-root': {
              color: palette.text.primary,
              borderColor: palette.divider,
              '&:hover': {
                backgroundColor: palette.action.hover,
              },
            },
            '& .MuiPaginationItem-page.Mui-selected': {
              backgroundColor: palette.primary.main,
              color: '#ffffff',
              '&:hover': {
                backgroundColor: palette.primary.dark,
              },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: isDark ? palette.background.paper : palette.background.paper,
            border: `1px solid ${palette.divider}`,
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          },
          backdrop: {
            backgroundColor: isDark
              ? 'rgba(0, 0, 0, 0.6)'
              : 'rgba(0, 0, 0, 0.4)',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: isDark ? '#132032' : palette.background.paper,
            border: `0.5px solid ${palette.divider}`,
            boxShadow: isDark
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
              : '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: isDark ? palette.background.paper : palette.background.paper,
            border: `1px solid ${palette.divider}`,
            boxShadow: isDark
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
              : '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: '7px',
            transition: 'all 200ms ease',
            '&:hover': {
              backgroundColor: palette.action.hover,
            },
            '&.Mui-disabled': {
              color: palette.text.disabled,
            },
          },
          sizeSmall: {
            padding: '6px',
          },
          sizeMedium: {
            padding: '8px',
          },
          sizeLarge: {
            padding: '12px',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 0,
          },
          indicator: {
            display: 'none',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 32,
            borderRadius: 8,
            padding: '6px 14px',
            color: palette.text.secondary,
            textTransform: 'none',
            fontSize: '12px',
            fontWeight: 500,
            '&.Mui-selected': {
              backgroundColor: palette.primary.main,
              color: '#fff',
            },
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: palette.primary.main,
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            '& .MuiSwitch-switchBase': {
              color: palette.action.disabled,
              '&.Mui-checked': {
                color: palette.primary.main,
                '& + .MuiSwitch-track': {
                  backgroundColor: palette.primary.main,
                  opacity: 0.5,
                },
              },
            },
            '& .MuiSwitch-track': {
              backgroundColor: palette.text.disabled,
              opacity: 0.3,
            },
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            '& .MuiSlider-thumb': {
              backgroundColor: palette.primary.main,
              boxShadow: isDark
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
                : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            },
            '& .MuiSlider-track': {
              backgroundColor: palette.primary.main,
            },
            '& .MuiSlider-rail': {
              backgroundColor: palette.divider,
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: '4px',
            height: '4px',
            backgroundColor: palette.divider,
          },
          bar: {
            borderRadius: '4px',
            background: `linear-gradient(90deg, ${palette.primary.main}, ${palette.secondary.main})`,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(15, 23, 42, 0.9)',
            color: isDark ? palette.text.primary : '#ffffff',
            fontSize: '12px',
            padding: '8px 12px',
            borderRadius: '6px',
            fontWeight: 500,
          },
          arrow: {
            color: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(15, 23, 42, 0.9)',
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: {
            backgroundColor: palette.error.main,
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '12px',
            minWidth: '20px',
            height: '20px',
            borderRadius: '10px',
            border: `2px solid ${palette.background.paper}`,
          },
        },
      },
    },
  })
}

export default createSOCTheme
