import React from 'react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  loading?: boolean;
}

export interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | string;
  className?: string;
}

export interface StatusDotProps {
  status: 'active' | 'disconnected' | 'never_connected' | 'unknown' | 'pass' | 'fail' | 'warning' | string;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface DetailPanelProps<T = any> {
  open: boolean;
  onClose: () => void;
  data: T | null;
  title?: string;
}

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface LoadingSpinnerProps {
  message?: string;
  size?: number | string;
}

export interface AlertMessageProps {
  severity?: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  message: string;
  onClose?: () => void;
}
