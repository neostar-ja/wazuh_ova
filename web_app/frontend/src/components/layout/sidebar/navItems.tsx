import React from 'react'
import { NavGroupData } from './sidebar.types'

export const NAV_GROUPS: NavGroupData[] = [
  {
    id: 'overview',
    section: 'OVERVIEW',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        descriptionTh: 'ภาพรวมสถานะความมั่นคงปลอดภัยของระบบ',
        path: '/',
        exact: true,
        section: 'OVERVIEW',
        color: '#7B5BA4',
        gradient: 'linear-gradient(135deg,#7B5BA4,#4A2D7A)',
        glow: 'rgba(123,91,164,0.55)',
        icon: (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'security-ops',
    section: 'SECURITY OPERATIONS',
    items: [
      {
        id: 'threat-alerts',
        label: 'Threat Alerts',
        descriptionTh: 'ตรวจสอบและติดตามการแจ้งเตือนภัยคุกคามจาก Wazuh',
        path: '/alerts',
        section: 'SECURITY OPERATIONS',
        color: '#EF4444',
        gradient: 'linear-gradient(135deg,#EF4444,#B91C1C)',
        glow: 'rgba(239,68,68,0.55)',
        icon: (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
        ),
      },
      {
        id: 'investigation',
        label: 'Investigation',
        descriptionTh: 'ค้นหาและวิเคราะห์ IP, Host, User, IOC และเหตุการณ์ที่เกี่ยวข้อง',
        path: '/investigate',
        section: 'SECURITY OPERATIONS',
        color: '#3B82F6',
        gradient: 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
        glow: 'rgba(59,130,246,0.55)',
        icon: (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        ),
      },
      {
        id: 'ioc-lookup',
        label: 'IOC Lookup',
        descriptionTh: 'ตรวจสอบตัวบ่งชี้ภัยคุกคาม เช่น IP, Domain, Hash และ URL',
        path: '/ioc',
        section: 'SECURITY OPERATIONS',
        color: '#F17422',
        gradient: 'linear-gradient(135deg,#F17422,#C05310)',
        glow: 'rgba(241,116,34,0.55)',
        icon: (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 6z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'governance',
    section: 'GOVERNANCE',
    items: [
      {
        id: 'compliance',
        label: 'Compliance',
        descriptionTh: 'ติดตามสถานะมาตรฐานความปลอดภัย เช่น CIS, NIST, HIPAA และ PCI-DSS',
        path: '/compliance',
        section: 'GOVERNANCE',
        color: '#22C55E',
        gradient: 'linear-gradient(135deg,#22C55E,#15803D)',
        glow: 'rgba(34,197,94,0.55)',
        icon: (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        ),
      },
      {
        id: 'kpi-metrics',
        label: 'KPI & Metrics',
        descriptionTh: 'ดูตัวชี้วัด ประสิทธิภาพ และแนวโน้มด้านความมั่นคงปลอดภัย',
        path: '/kpi',
        section: 'GOVERNANCE',
        color: '#F59E0B',
        gradient: 'linear-gradient(135deg,#F59E0B,#B45309)',
        glow: 'rgba(245,158,11,0.55)',
        icon: (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'infrastructure',
    section: 'INFRASTRUCTURE',
    items: [
      {
        id: 'network-assets',
        label: 'Network Assets',
        descriptionTh: 'ตรวจสอบอุปกรณ์ เครือข่าย Agent และทรัพยากรที่เชื่อมต่อ',
        path: '/assets',
        section: 'INFRASTRUCTURE',
        color: '#0EA5E9',
        gradient: 'linear-gradient(135deg,#0EA5E9,#0284C7)',
        glow: 'rgba(14,165,233,0.55)',
        icon: (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M17 16l-4-4V8.82C14.16 8.4 15 7.3 15 6c0-1.66-1.34-3-3-3S9 4.34 9 6c0 1.3.84 2.4 2 2.82V12l-4 4H3v5h5v-3.05l4-4.2 4 4.2V21h5v-5h-4z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'management',
    section: 'MANAGEMENT',
    roles: ['admin', 'superadmin'],
    items: [
      {
        id: 'administration',
        label: 'Administration',
        descriptionTh: 'ตั้งค่าระบบ ผู้ใช้ สิทธิ์การเข้าถึง และการจัดการส่วนกลาง',
        path: '/admin',
        section: 'MANAGEMENT',
        roles: ['admin', 'superadmin'],
        color: '#64748B',
        gradient: 'linear-gradient(135deg,#64748B,#334155)',
        glow: 'rgba(100,116,139,0.55)',
        icon: (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
          </svg>
        ),
      },
    ],
  },
]
