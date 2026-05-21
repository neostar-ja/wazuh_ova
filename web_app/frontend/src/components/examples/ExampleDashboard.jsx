/**
 * Example Component: Dashboard Card
 * Demonstrates the use of new theme system, Tailwind CSS, and MUI components
 */

import { Card, CardHeader, CardContent, Box, Typography, Button, Chip, Grid } from '@mui/material'
import { SeverityBadge, StatusCard } from './common/CommonComponents'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AlertIcon from '@mui/icons-material/Alert'

/**
 * Example: Security Status Dashboard
 * Shows how to use:
 * - Tailwind CSS classes
 * - MUI components with theme
 * - Common components
 * - Theme-aware colors
 */
export function SecurityStatusDashboard() {
  return (
    <Box className="page-enter" sx={{ display: 'grid', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography className="text-display-md" sx={{ mb: 0.5 }}>
          Security Dashboard
        </Typography>
        <Typography className="text-muted">
          Real-time threat monitoring and incident management
        </Typography>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard
            title="Critical Alerts"
            value="3"
            status="critical"
            icon={AlertIcon}
            onClick={() => console.log('Navigate to critical alerts')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard
            title="High Priority"
            value="12"
            status="high"
            icon={AlertIcon}
            onClick={() => console.log('Navigate to high priority')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard
            title="Active Investigations"
            value="5"
            status="medium"
            icon={TrendingUpIcon}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard
            title="Compliance Score"
            value="94%"
            status="success"
            icon={TrendingUpIcon}
          />
        </Grid>
      </Grid>

      {/* Recent Alerts Card */}
      <Card>
        <CardHeader
          title="Recent Critical Alerts"
          subheader="Last 24 hours"
          action={<Button size="small">View All</Button>}
        />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Alert Item 1 */}
            <Box className="card-accent-critical p-3 rounded-lg">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography className="text-heading-sm">
                    SQL Injection Attempt Detected
                  </Typography>
                  <Typography className="text-body-sm text-muted" sx={{ mt: 0.5 }}>
                    Source: 192.168.1.105 | Target: Production Database
                  </Typography>
                </Box>
                <SeverityBadge level="critical" />
              </Box>
            </Box>

            {/* Alert Item 2 */}
            <Box className="card-accent-high p-3 rounded-lg">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography className="text-heading-sm">
                    Brute Force Attack on SSH
                  </Typography>
                  <Typography className="text-body-sm text-muted" sx={{ mt: 0.5 }}>
                    Source: External IP | Failed Attempts: 47
                  </Typography>
                </Box>
                <SeverityBadge level="high" />
              </Box>
            </Box>

            {/* Alert Item 3 */}
            <Box className="card-accent-medium p-3 rounded-lg">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography className="text-heading-sm">
                    Unusual Data Access Pattern
                  </Typography>
                  <Typography className="text-body-sm text-muted" sx={{ mt: 0.5 }}>
                    User: admin@example.com | Access Time: 02:30 AM
                  </Typography>
                </Box>
                <SeverityBadge level="medium" />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <Card>
        <CardHeader title="System Status" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box className="status-dot status-dot-online" sx={{ width: 3, height: 3 }} />
                <Box>
                  <Typography className="text-heading-sm">Wazuh Cluster</Typography>
                  <Typography className="text-body-sm text-muted">Connected</Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Chip label="Online" color="success" size="small" />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box className="status-dot status-dot-online" sx={{ width: 3, height: 3 }} />
                <Box>
                  <Typography className="text-heading-sm">OpenSearch</Typography>
                  <Typography className="text-body-sm text-muted">Connected</Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Chip label="Online" color="success" size="small" />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box className="status-dot status-dot-online" sx={{ width: 3, height: 3 }} />
                <Box>
                  <Typography className="text-heading-sm">Grafana Dashboards</Typography>
                  <Typography className="text-body-sm text-muted">Connected</Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Chip label="Online" color="success" size="small" />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box className="status-dot status-dot-offline" sx={{ width: 3, height: 3 }} />
                <Box>
                  <Typography className="text-heading-sm">Email Gateway</Typography>
                  <Typography className="text-body-sm text-muted">Disconnected</Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Chip label="Offline" color="error" size="small" />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  )
}

export default SecurityStatusDashboard
