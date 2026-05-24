import React from 'react'
import { UserRole } from '../../../types/auth'

export const DRAWER_WIDTH = 296
export const DRAWER_COLLAPSED = 80
export const MOBILE_WIDTH = 300

export interface NavBadge {
  count?: number
  label?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
}

export interface NavItemData {
  id: string
  label: string
  descriptionTh: string
  path: string
  exact?: boolean
  section: string
  roles?: UserRole[]
  color: string
  gradient: string
  glow: string
  icon: React.ReactNode
  badge?: NavBadge
}

export interface NavGroupData {
  id: string
  section: string
  roles?: UserRole[]
  items: NavItemData[]
}
