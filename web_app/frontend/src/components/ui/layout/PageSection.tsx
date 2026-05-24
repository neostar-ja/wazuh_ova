import React from 'react'
import { Box, Typography, Divider, useTheme } from '@mui/material'
import { PageSectionProps, SectionSpacing } from './layout.types'

const SPACING_MAP: Record<SectionSpacing, { pt: number; pb: number }> = {
  sm: { pt: 1.5, pb: 1 },
  md: { pt: 2.5, pb: 1.25 },
  lg: { pt: 3.5, pb: 1.5 },
}

/**
 * PageSection — lightweight section heading inside a page.
 *
 * Lighter than SectionCard (no card container). Used to group
 * related blocks visually without adding a card frame.
 *
 * Usage:
 *   <PageSection title="Summary" subtitle="Last 24 hours" actions={<RefreshBtn/>}>
 *     …content blocks…
 *   </PageSection>
 */
export function PageSection({
  title,
  subtitle,
  actions,
  children,
  spacing = 'md',
  divider = false,
  className = '',
}: PageSectionProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const sp = SPACING_MAP[spacing]
  const hasHeading = !!(title || subtitle || actions)

  return (
    <Box className={className} sx={{ minWidth: 0 }}>
      {hasHeading && (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              gap: 1,
              pt: sp.pt,
              pb: sp.pb,
            }}
          >
            <Box>
              {title && (
                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    letterSpacing: '-0.2px',
                    color: isDark ? 'rgba(237,233,250,0.9)' : '#1A1033',
                  }}
                >
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography
                  sx={{
                    fontSize: 12,
                    mt: 0.2,
                    color: isDark ? 'rgba(237,233,250,0.4)' : 'rgba(26,16,51,0.5)',
                    lineHeight: 1.5,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            {actions && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                {actions}
              </Box>
            )}
          </Box>
          {divider && (
            <Divider
              sx={{
                mb: 2,
                borderColor: isDark ? 'rgba(123,91,164,0.15)' : 'rgba(123,91,164,0.1)',
              }}
            />
          )}
        </>
      )}
      {children}
    </Box>
  )
}

export default PageSection
