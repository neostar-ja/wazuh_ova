import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box, Button, CircularProgress, Stack, TextField, Typography, Divider,
  Chip,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded'
import PrintRoundedIcon from '@mui/icons-material/PrintRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import { soarApi, IrisCase, CaseTask, CaseEvidence, CaseActivityEntry, ShuffleAction, CaseNoteGroup, extractCaseIocs } from '../../../services/soarApi'
import { fmtIrisTimeToBangkok, fmtIrisUtcToBangkok } from '../soarUtils'

interface Props {
  caseId: number
  caseData: IrisCase | null
}

// ── Bangkok time helper ────────────────────────────────────────────────────────

function nowBangkok(): string {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date())
}

// ── Markdown builder ───────────────────────────────────────────────────────────

function buildMarkdown(
  caseData: IrisCase | null,
  tasks: CaseTask[],
  iocs: unknown[],
  timeline: unknown[],
  evidence: CaseEvidence[],
  activity: CaseActivityEntry[],
  shuffleActions: ShuffleAction[],
  noteGroups: CaseNoteGroup[],
  lessons: string,
  recommendations: string,
): string {
  const now = nowBangkok()
  const doneTasks = tasks.filter(t => t.status === 'done')
  const evidenceSummary = {
    wazuh: evidence.filter(e => e.source === 'wazuh').length,
    opensearch: evidence.filter(e => e.source === 'opensearch').length,
    misp: evidence.filter(e => e.source === 'misp').length,
  }
  const totalNotes = noteGroups.reduce((sum, g) => sum + (g.notes?.length ?? 0), 0)

  const lines: string[] = [
    `# Incident Report — ${caseData?.case_name ?? 'Case #' + caseData?.case_id}`,
    ``,
    `> **TLP:AMBER** — สำหรับการใช้งานภายในองค์กรเท่านั้น`,
    ``,
    `| ฟิลด์ | ค่า |`,
    `|-------|-----|`,
    `| Case ID | #${caseData?.case_id ?? '—'} |`,
    `| สถานะ | ${caseData?.case_close_date ? 'ปิดแล้ว' : 'เปิดอยู่'} |`,
    `| เปิดโดย | ${caseData?.opened_by ?? '—'} |`,
    `| ผู้รับผิดชอบ | ${caseData?.owner ?? '—'} |`,
    `| วันที่เปิด | ${caseData?.case_open_date ?? '—'} |`,
    caseData?.case_close_date ? `| วันที่ปิด | ${caseData.case_close_date} |` : '',
    `| สร้าง Report | ${now} |`,
    ``,
    `---`,
    ``,
    `## รายละเอียดเคส`,
    ``,
    caseData?.case_description ? caseData.case_description : '_ไม่มีรายละเอียด_',
    ``,
    `---`,
    ``,
    `## สรุปสถิติ`,
    ``,
    `| หมวด | จำนวน |`,
    `|------|-------|`,
    `| Tasks ทั้งหมด | ${tasks.length} |`,
    `| Tasks เสร็จสิ้น | ${doneTasks.length} |`,
    `| IOC | ${(iocs as unknown[]).length} |`,
    `| Timeline Events | ${(timeline as unknown[]).length} |`,
    `| Evidence (Wazuh) | ${evidenceSummary.wazuh} |`,
    `| Evidence (OpenSearch) | ${evidenceSummary.opensearch} |`,
    `| Evidence (MISP) | ${evidenceSummary.misp} |`,
    `| Notes | ${totalNotes} |`,
    `| Shuffle Actions | ${shuffleActions.length} |`,
    ``,
    `---`,
    ``,
    `## Tasks (${tasks.length} รายการ)`,
    ``,
    `**ความคืบหน้า: ${doneTasks.length}/${tasks.length} (${tasks.length > 0 ? Math.round(doneTasks.length / tasks.length * 100) : 0}%)**`,
    ``,
    ...tasks.map(t =>
      `- [${t.status === 'done' ? 'x' : ' '}] **[${(t.priority ?? 'medium').toUpperCase()}]** ${t.title}${t.assignee ? ` _(${t.assignee})_` : ''}${t.status !== 'done' && t.status !== 'todo' ? ` \`${t.status}\`` : ''}`
    ),
    tasks.length === 0 ? '_ไม่มี Task_' : '',
    ``,
    `---`,
    ``,
    `## Indicators of Compromise (${(iocs as Record<string, unknown>[]).length} รายการ)`,
    ``,
    ...(iocs as Record<string, unknown>[]).map(ioc =>
      `- \`${ioc.ioc_value}\` — ${(ioc.ioc_type as Record<string, unknown>)?.type_name ?? 'unknown'}${ioc.ioc_description ? ` — ${ioc.ioc_description}` : ''}`
    ),
    iocs.length === 0 ? '_ไม่มี IOC_' : '',
    ``,
    `---`,
    ``,
    `## Timeline (${(timeline as Record<string, unknown>[]).length} เหตุการณ์)`,
    ``,
    ...(timeline as Record<string, unknown>[]).slice(0, 30).map(ev =>
      `- **${fmtIrisTimeToBangkok(
        String((ev.event_date_wtz as string) || (ev.event_date as string) || ''),
        String((ev.event_tz as string) || '+00:00'),
      )}** — ${ev.event_title}${ev.event_content ? `\n  > ${String(ev.event_content).slice(0, 120)}` : ''}`
    ),
    timeline.length === 0 ? '_ไม่มีเหตุการณ์_' : '',
    ``,
    `---`,
    ``,
    `## Evidence (${evidence.length} รายการ)`,
    ``,
    `_Wazuh: ${evidenceSummary.wazuh} | OpenSearch: ${evidenceSummary.opensearch} | MISP: ${evidenceSummary.misp}_`,
    ``,
    ...evidence.slice(0, 30).map(ev => [
      `- **${ev.title}** \`[${ev.source}/${ev.ev_type}]\``,
      ev.ioc_value ? `  IOC: \`${ev.ioc_value}\`${ev.ioc_type ? ` (${ev.ioc_type})` : ''}` : '',
      ev.source_ref ? `  Ref: \`${ev.source_ref}\`` : '',
      ev.created_at ? `  เวลา: ${fmtIrisUtcToBangkok(ev.created_at)}` : '',
    ].filter(Boolean).join('\n')),
    evidence.length === 0 ? '_ไม่มี evidence_' : '',
    evidence.length > 30 ? `\n_...และอีก ${evidence.length - 30} รายการ (ดูใน Evidence tab)_` : '',
    ``,
    `---`,
    ``,
    `## Case Notes (${totalNotes} รายการ)`,
    ``,
    ...noteGroups.flatMap(g => [
      `### ${g.group_title}`,
      ``,
      ...(g.notes ?? []).map(n => [
        `#### ${n.note_title}`,
        ``,
        n.note_content ? n.note_content.slice(0, 500) + (n.note_content.length > 500 ? '\n_...(truncated)_' : '') : '_ไม่มีเนื้อหา_',
        ``,
        `_${fmtIrisUtcToBangkok(n.note_creationdate)}_`,
        ``,
      ].join('\n')),
    ]),
    totalNotes === 0 ? '_ไม่มี Note_' : '',
    ``,
    `---`,
    ``,
    `## Shuffle Actions (${shuffleActions.length} รายการ)`,
    ``,
    ...shuffleActions.map(a =>
      `- **${a.action_type}** [${a.response_mode}] ${a.response_ok ? '✓' : '✗'} — ${fmtIrisUtcToBangkok(a.created_at)}${a.created_by ? ` _(${a.created_by})_` : ''}`
    ),
    shuffleActions.length === 0 ? '_ไม่มี action_' : '',
    ``,
    `---`,
    ``,
    `## Activity Log (${Math.min(activity.length, 20)} รายการล่าสุด)`,
    ``,
    ...activity.slice(0, 20).map(a =>
      `- **${a.action}** — ${a.detail ?? ''} _(${a.username ?? '?'}, ${fmtIrisUtcToBangkok(a.created_at)})_`
    ),
    ``,
    `---`,
    ``,
    `## Recommendations`,
    ``,
    recommendations || '_ยังไม่ได้กรอก_',
    ``,
    `---`,
    ``,
    `## Lessons Learned`,
    ``,
    lessons || '_ยังไม่ได้กรอก_',
    ``,
    `---`,
    ``,
    `_Report นี้สร้างอัตโนมัติโดย SOC Center เมื่อ ${now}_`,
    `_ข้อมูลจาก: DFIR-IRIS · Wazuh · OpenSearch · MISP · SQLite Activity Log_`,
  ]

  return lines.filter(l => l !== '').join('\n')
}

// ── HTML report builder (for print/PDF) ───────────────────────────────────────

function buildHtml(
  caseData: IrisCase | null,
  tasks: CaseTask[],
  iocs: unknown[],
  timeline: unknown[],
  evidence: CaseEvidence[],
  activity: CaseActivityEntry[],
  shuffleActions: ShuffleAction[],
  noteGroups: CaseNoteGroup[],
  lessons: string,
  recommendations: string,
): string {
  const now = nowBangkok()
  const doneTasks = tasks.filter(t => t.status === 'done')
  const pendingTasks = tasks.filter(t => t.status !== 'done')
  const progress = tasks.length > 0 ? Math.round(doneTasks.length / tasks.length * 100) : 0
  const totalNotes = noteGroups.reduce((sum, g) => sum + (g.notes?.length ?? 0), 0)

  const PRIORITY_COLOR: Record<string, string> = {
    critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a',
  }

  const row = (label: string, value: string) =>
    `<tr><td style="font-weight:600;padding:4px 10px 4px 0;white-space:nowrap;color:#374151">${label}</td><td style="padding:4px 0;color:#111827">${value}</td></tr>`

  const section = (title: string, content: string) => `
    <div class="section">
      <h2 style="font-size:14px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #3b82f6;padding-bottom:4px;margin:20px 0 10px">${title}</h2>
      ${content}
    </div>`

  const badge = (text: string, color: string) =>
    `<span style="display:inline-block;padding:1px 7px;border-radius:12px;font-size:10px;font-weight:700;background:${color}20;color:${color};border:1px solid ${color}40">${text}</span>`

  const iocList = (iocs as Record<string, unknown>[]).map(ioc =>
    `<li><code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;font-size:11px">${ioc.ioc_value}</code> — ${(ioc.ioc_type as Record<string, unknown>)?.type_name ?? 'unknown'}</li>`
  ).join('')

  const taskList = tasks.map(t => {
    const done = t.status === 'done'
    const pColor = PRIORITY_COLOR[t.priority ?? 'medium'] ?? '#6b7280'
    return `<li style="padding:3px 0;${done ? 'opacity:0.6' : ''}">
      <span style="display:inline-block;width:14px;height:14px;border:2px solid ${done ? '#16a34a' : '#9ca3af'};border-radius:3px;vertical-align:middle;margin-right:6px;background:${done ? '#16a34a' : 'transparent'}"></span>
      <span style="background:${pColor}20;color:${pColor};font-size:9px;font-weight:700;padding:1px 5px;border-radius:10px;margin-right:5px">${(t.priority ?? 'medium').toUpperCase()}</span>
      <span style="font-size:12px;${done ? 'text-decoration:line-through' : ''}">${t.title}</span>
      ${t.assignee ? `<span style="color:#6b7280;font-size:10px;margin-left:6px">(${t.assignee})</span>` : ''}
    </li>`
  }).join('')

  const timelineList = (timeline as Record<string, unknown>[]).slice(0, 30).map(ev =>
    `<li style="padding:4px 0;border-bottom:1px solid #f3f4f6">
      <span style="font-weight:600;color:#1e3a5f;font-size:11px">${fmtIrisTimeToBangkok(String((ev.event_date_wtz as string) || (ev.event_date as string) || ''), String((ev.event_tz as string) || '+00:00'))}</span>
      <span style="margin-left:8px;font-size:12px">${ev.event_title}</span>
    </li>`
  ).join('')

  const evidenceSummary = {
    wazuh: evidence.filter(e => e.source === 'wazuh').length,
    opensearch: evidence.filter(e => e.source === 'opensearch').length,
    misp: evidence.filter(e => e.source === 'misp').length,
  }
  const evidenceList = evidence.slice(0, 30).map(ev =>
    `<li style="padding:3px 0;font-size:11px">
      <strong>${ev.title}</strong>
      <span style="margin-left:6px;background:#f3f4f6;padding:1px 5px;border-radius:3px;font-size:10px">${ev.source}/${ev.ev_type}</span>
      ${ev.ioc_value ? `<code style="margin-left:4px;background:#fef3c7;padding:1px 5px;border-radius:3px;font-size:10px">${ev.ioc_value}</code>` : ''}
      ${ev.created_at ? `<span style="color:#6b7280;margin-left:6px;font-size:10px">${fmtIrisUtcToBangkok(ev.created_at)}</span>` : ''}
    </li>`
  ).join('')

  const notesHtml = noteGroups.map(g => `
    <div style="margin-bottom:12px">
      <h4 style="font-size:12px;font-weight:700;color:#374151;margin:8px 0 4px">${g.group_title}</h4>
      ${(g.notes ?? []).map(n => `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px;margin-bottom:6px">
          <div style="font-weight:600;font-size:11px;color:#1e3a5f;margin-bottom:4px">${n.note_title}</div>
          <div style="font-size:11px;color:#374151;white-space:pre-wrap">${(n.note_content ?? '').slice(0, 400)}${(n.note_content ?? '').length > 400 ? '...' : ''}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:4px">${fmtIrisUtcToBangkok(n.note_creationdate)}</div>
        </div>`).join('')}
    </div>`).join('')

  const shuffleHtml = shuffleActions.map(a =>
    `<tr>
      <td style="padding:3px 6px;font-size:11px;font-family:monospace">${a.action_type}</td>
      <td style="padding:3px 6px;font-size:11px">${a.response_mode}</td>
      <td style="padding:3px 6px;text-align:center">${a.response_ok ? '✓' : '✗'}</td>
      <td style="padding:3px 6px;font-size:10px;color:#6b7280">${fmtIrisUtcToBangkok(a.created_at)}</td>
    </tr>`
  ).join('')

  const activityHtml = activity.slice(0, 20).map(a =>
    `<tr>
      <td style="padding:3px 6px;font-size:11px;font-family:monospace">${a.action}</td>
      <td style="padding:3px 6px;font-size:11px">${(a.detail ?? '').slice(0, 60)}</td>
      <td style="padding:3px 6px;font-size:10px;color:#6b7280">${a.username ?? '—'}</td>
      <td style="padding:3px 6px;font-size:10px;color:#6b7280">${fmtIrisUtcToBangkok(a.created_at)}</td>
    </tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Incident Report — Case #${caseData?.case_id}</title>
<style>
  @page { size: A4; margin: 15mm 12mm 15mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Sarabun', 'IBM Plex Sans Thai', Arial, sans-serif; font-size:12px; color:#111827; margin:0; padding:0; }
  @media print { .no-print { display:none!important; } }
  table { border-collapse: collapse; width: 100%; }
  th { background:#1e3a5f; color:#fff; padding:5px 8px; font-size:11px; text-align:left; }
  td { border-bottom: 1px solid #f3f4f6; }
  ul { margin:6px 0; padding-left:18px; }
  li { margin:3px 0; line-height:1.5; }
  code { font-family:'IBM Plex Mono',monospace; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
<!-- Header -->
<div style="background:#1e3a5f;color:#fff;padding:14px 18px;border-radius:4px 4px 0 0">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:18px;font-weight:700">${caseData?.case_name ?? 'Incident Report'}</div>
      <div style="font-size:11px;opacity:0.8;margin-top:3px">SOC Center — Incident Response Report</div>
    </div>
    <div style="text-align:right;font-size:11px;opacity:0.8">
      <div>Case #${caseData?.case_id}</div>
      <div>${now}</div>
      <div style="background:#fbbf24;color:#1e3a5f;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;margin-top:4px">TLP:AMBER</div>
    </div>
  </div>
</div>

<!-- Meta table -->
<div style="background:#f8fafc;border:1px solid #e5e7eb;padding:10px 14px;margin-bottom:4px">
<table style="width:auto">
  ${row('Case ID', `#${caseData?.case_id ?? '—'}`)}
  ${row('สถานะ', caseData?.case_close_date ? '🔒 ปิดแล้ว' : '🟢 เปิดอยู่')}
  ${row('เปิดโดย', caseData?.opened_by ?? '—')}
  ${row('ผู้รับผิดชอบ', caseData?.owner ?? '—')}
  ${row('วันที่เปิด', caseData?.case_open_date ?? '—')}
  ${caseData?.case_close_date ? row('วันที่ปิด', caseData.case_close_date) : ''}
</table>
</div>

<!-- Stats bar -->
<div style="display:flex;gap:8px;flex-wrap:wrap;padding:8px 0;margin-bottom:4px">
  ${[
    ['Tasks', `${doneTasks.length}/${tasks.length} (${progress}%)`, '#3b82f6'],
    ['IOC', String((iocs as unknown[]).length), '#ef4444'],
    ['Timeline', String((timeline as unknown[]).length), '#8b5cf6'],
    ['Evidence', String(evidence.length), '#06b6d4'],
    ['Notes', String(totalNotes), '#10b981'],
    ['Shuffle', String(shuffleActions.length), '#f59e0b'],
  ].map(([label, val, color]) => `
    <div style="background:${color}10;border:1px solid ${color}30;border-radius:8px;padding:5px 12px;text-align:center">
      <div style="font-size:16px;font-weight:700;color:${color}">${val}</div>
      <div style="font-size:9px;color:#6b7280">${label}</div>
    </div>`).join('')}
</div>

<!-- Description -->
${section('รายละเอียดเคส', `<div style="background:#f9fafb;padding:10px;border-radius:6px;font-size:12px;line-height:1.6">${caseData?.case_description ?? '<i>ไม่มีรายละเอียด</i>'}</div>`)}

<!-- Tasks progress bar -->
${section('Tasks',
  `<div style="background:#e5e7eb;border-radius:6px;height:8px;margin-bottom:10px">
    <div style="background:#3b82f6;height:8px;border-radius:6px;width:${progress}%"></div>
  </div>
  <div style="font-size:11px;color:#6b7280;margin-bottom:8px">เสร็จสิ้น ${doneTasks.length}/${tasks.length} รายการ (${progress}%)</div>
  <ul style="list-style:none;padding:0">${taskList}</ul>
  ${pendingTasks.length > 0 ? `<div style="margin-top:6px;font-size:11px;color:#d97706">⚠️ ยังมี ${pendingTasks.length} task ที่ยังไม่เสร็จ</div>` : '<div style="margin-top:6px;font-size:11px;color:#16a34a">✓ Tasks ทั้งหมดเสร็จสิ้น</div>'}`
)}

<!-- IOCs -->
${section(`Indicators of Compromise (${(iocs as unknown[]).length} รายการ)`,
  iocs.length > 0 ? `<ul>${iocList}</ul>` : '<i style="color:#9ca3af">ไม่มี IOC</i>'
)}

<!-- Timeline -->
${section(`Timeline (${(timeline as unknown[]).length} เหตุการณ์)`,
  timeline.length > 0 ? `<ul style="list-style:none;padding:0">${timelineList}</ul>` : '<i style="color:#9ca3af">ไม่มีเหตุการณ์</i>'
)}

<!-- Evidence -->
<div class="page-break"></div>
${section(`Evidence (${evidence.length} รายการ)`,
  `<div style="font-size:11px;color:#6b7280;margin-bottom:6px">
    Wazuh: ${evidenceSummary.wazuh} | OpenSearch: ${evidenceSummary.opensearch} | MISP: ${evidenceSummary.misp}
  </div>` +
  (evidence.length > 0 ? `<ul>${evidenceList}</ul>${evidence.length > 30 ? `<div style="font-size:11px;color:#6b7280">...และอีก ${evidence.length - 30} รายการ</div>` : ''}` : '<i style="color:#9ca3af">ไม่มี evidence</i>')
)}

<!-- Notes -->
${section(`Case Notes (${totalNotes} รายการ)`,
  totalNotes > 0 ? notesHtml : '<i style="color:#9ca3af">ไม่มี Note</i>'
)}

<!-- Shuffle Actions -->
${section(`Shuffle Actions (${shuffleActions.length} รายการ)`,
  shuffleActions.length > 0
    ? `<table><tr><th>Action</th><th>Mode</th><th>สถานะ</th><th>เวลา</th></tr>${shuffleHtml}</table>`
    : '<i style="color:#9ca3af">ไม่มี action</i>'
)}

<!-- Activity Log -->
${section('Activity Log',
  activity.length > 0
    ? `<table><tr><th>Action</th><th>Detail</th><th>User</th><th>เวลา</th></tr>${activityHtml}</table>`
    : '<i style="color:#9ca3af">ไม่มี activity</i>'
)}

<!-- Recommendations -->
${section('Recommendations (คำแนะนำ)',
  `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:10px 12px;border-radius:0 6px 6px 0;white-space:pre-wrap;font-size:12px">${recommendations || '<i style="color:#9ca3af">ยังไม่ได้กรอก</i>'}</div>`
)}

<!-- Lessons Learned -->
${section('Lessons Learned (บทเรียนที่ได้รับ)',
  `<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px 12px;border-radius:0 6px 6px 0;white-space:pre-wrap;font-size:12px">${lessons || '<i style="color:#9ca3af">ยังไม่ได้กรอก</i>'}</div>`
)}

<!-- Footer -->
<div style="margin-top:20px;padding:10px;background:#f8fafc;border-top:2px solid #1e3a5f;text-align:center;font-size:10px;color:#6b7280">
  Report นี้สร้างอัตโนมัติโดย <strong>SOC Center</strong> เมื่อ ${now}<br>
  ข้อมูลจาก: DFIR-IRIS · Wazuh · OpenSearch · MISP · SQLite Activity Log
</div>
</body>
</html>`
}

// ── Simple markdown preview renderer ─────────────────────────────────────────

function renderMarkdownToHtml(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:16px;font-weight:800;color:#1A1033;margin:12px 0 6px;border-bottom:2px solid #6366F1;padding-bottom:4px">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:13px;font-weight:700;color:#1e3a5f;margin:10px 0 4px">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:12px;font-weight:600;color:#374151;margin:8px 0 3px">$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4 style="font-size:11px;font-weight:600;color:#4b5563;margin:6px 0 2px">$1</h4>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e5e7eb;margin:10px 0">')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:1px 4px;border-radius:3px;font-family:monospace;font-size:10px">$1</code>')
    .replace(/^\| (.+) \|$/gm, (m) => {
      const cells = m.split('|').filter(s => s.trim() && !s.trim().match(/^[-:]+$/))
      return cells.length > 0
        ? `<tr>${cells.map(c => `<td style="border:1px solid #e5e7eb;padding:3px 8px;font-size:11px">${c.trim()}</td>`).join('')}</tr>`
        : m
    })
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #f59e0b;padding:4px 10px;background:#fffbeb;margin:6px 0;font-size:11px;color:#92400e">$1</blockquote>')
    .replace(/^- \[x\] (.+)$/gm, '<li style="list-style:none;padding:2px 0"><span style="color:#16a34a;margin-right:5px">☑</span><span style="text-decoration:line-through;color:#6b7280;font-size:11px">$1</span></li>')
    .replace(/^- \[ \] (.+)$/gm, '<li style="list-style:none;padding:2px 0"><span style="color:#9ca3af;margin-right:5px">☐</span><span style="font-size:11px">$1</span></li>')
    .replace(/^- (.+)$/gm, '<li style="font-size:11px;padding:2px 0">$1</li>')
    .replace(/\n/g, '<br>')
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ReportPanel({ caseId, caseData }: Props) {
  const { palette } = useTheme()
  const isDark = palette.mode === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,40,100,0.45)'
  const cardBg    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,246,255,0.8)'
  const border    = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'

  const [lessons, setLessons] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [generating, setGenerating] = useState(false)
  const [mdPreview, setMdPreview] = useState('')

  const { data: tasksData }    = useQuery({ queryKey: ['case-tasks',    caseId], queryFn: () => soarApi.getCaseTasks(caseId).then(r => r.data),    enabled: !!caseId })
  const { data: iocsData }     = useQuery({ queryKey: ['case-iocs',     caseId], queryFn: () => soarApi.getCaseIocs(caseId).then(r => r.data),     enabled: !!caseId })
  const { data: timelineData } = useQuery({ queryKey: ['case-timeline', caseId], queryFn: () => soarApi.getCaseTimeline(caseId).then(r => r.data), enabled: !!caseId })
  const { data: evData }       = useQuery({ queryKey: ['case-evidence', caseId], queryFn: () => soarApi.getCaseEvidence(caseId).then(r => r.data), enabled: !!caseId })
  const { data: actData }      = useQuery({ queryKey: ['case-activity', caseId], queryFn: () => soarApi.getCaseActivity(caseId).then(r => r.data), enabled: !!caseId })
  const { data: shaData }      = useQuery({ queryKey: ['shuffle-actions', caseId], queryFn: () => soarApi.getShuffleActions(caseId).then(r => r.data), enabled: !!caseId })
  const { data: notesData }    = useQuery({ queryKey: ['case-notes',    caseId], queryFn: () => soarApi.getCaseNotes(caseId).then(r => r.data),   enabled: !!caseId })

  const tasks          = tasksData?.tasks ?? []
  const iocs           = extractCaseIocs(iocsData)
  const timeline       = (timelineData?.data as Record<string,unknown>)?.timeline as unknown[] ?? []
  const evidence       = evData?.evidence ?? []
  const activity       = actData?.activity ?? []
  const shuffleActions = shaData?.actions ?? []
  const noteGroups     = (notesData?.data ?? []) as CaseNoteGroup[]

  const doneTasks = tasks.filter(t => t.status === 'done')
  const progress  = tasks.length > 0 ? Math.round(doneTasks.length / tasks.length * 100) : 0
  const totalNotes = noteGroups.reduce((s, g) => s + (g.notes?.length ?? 0), 0)

  const collectArgs = (): Parameters<typeof buildMarkdown> => [
    caseData, tasks, iocs, timeline, evidence, activity, shuffleActions, noteGroups, lessons, recommendations,
  ]

  const handleGenerate = () => {
    setGenerating(true)
    setMdPreview(buildMarkdown(...collectArgs()))
    setGenerating(false)
  }

  const handleDownloadMd = () => {
    if (!mdPreview) return
    const blob = new Blob([mdPreview], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `incident_report_case${caseId}_${Date.now()}.md` })
    a.click(); URL.revokeObjectURL(url)
  }

  const handleDownloadJson = () => {
    const payload = {
      generated_at: new Date().toISOString(),
      case: caseData,
      tasks, iocs, timeline, evidence, activity,
      shuffle_actions: shuffleActions,
      notes: noteGroups,
      lessons_learned: lessons,
      recommendations,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `incident_report_case${caseId}_${Date.now()}.json` })
    a.click(); URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const html = buildHtml(...collectArgs())
    const win  = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 500)
  }

  const inputSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 12 } }

  // ── Stats summary bar ──────────────────────────────────────────────────────
  const stats = [
    { label: 'Tasks', value: `${doneTasks.length}/${tasks.length}`, sub: `${progress}%`, color: '#3b82f6' },
    { label: 'IOC', value: String(iocs.length), color: '#ef4444' },
    { label: 'Timeline', value: String((timeline as unknown[]).length), color: '#8b5cf6' },
    { label: 'Evidence', value: String(evidence.length), color: '#06b6d4' },
    { label: 'Notes', value: String(totalNotes), color: '#10b981' },
    { label: 'Shuffle', value: String(shuffleActions.length), color: '#f59e0b' },
  ]

  return (
    <Stack spacing={2.5}>
      {/* Stats bar */}
      <Box className="grid gap-2" sx={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px,1fr))' }}>
        {stats.map(s => (
          <Box key={s.label} className="rounded-xl px-3 py-2 text-center"
            sx={{ background: `rgba(${s.color.replace(/[^0-9,]/g,'')},.07)`.replace('rgba(,', 'rgba(0,0,0,'), border: `1px solid ${s.color}30` }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</Typography>
            {s.sub && <Typography sx={{ fontSize: 9, color: s.color, opacity: 0.8 }}>{s.sub}</Typography>}
            <Typography sx={{ fontSize: 9, color: textMuted, mt: 0.25 }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Data source status */}
      <Box className="flex flex-wrap gap-1.5 px-3 py-2 rounded-xl"
        sx={{ background: cardBg, border: `1px solid ${border}` }}>
        <Typography sx={{ fontSize: 9, fontWeight: 700, color: textMuted, mr: 1, alignSelf: 'center', letterSpacing: '0.06em' }}>
          DATA SOURCES
        </Typography>
        {[
          { label: 'IRIS IOC', ok: true },
          { label: 'IRIS Timeline', ok: true },
          { label: 'IRIS Notes', ok: true },
          { label: 'Wazuh Evidence', ok: evidence.filter(e=>e.source==='wazuh').length > 0 },
          { label: 'OpenSearch', ok: evidence.filter(e=>e.source==='opensearch').length > 0 },
          { label: 'MISP', ok: evidence.filter(e=>e.source==='misp').length > 0 },
          { label: 'Local Tasks', ok: true },
          { label: 'Activity Log', ok: true },
          { label: 'Shuffle History', ok: true },
        ].map(s => (
          <Box key={s.label} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            sx={{ background: s.ok ? 'rgba(34,197,94,0.08)' : 'rgba(100,116,139,0.08)', border: `1px solid ${s.ok ? 'rgba(34,197,94,0.25)' : 'rgba(100,116,139,0.2)'}` }}>
            {s.ok
              ? <CheckCircleOutlineRoundedIcon sx={{ fontSize: 10, color: '#22C55E' }} />
              : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 10, color: '#64748B' }} />}
            <Typography sx={{ fontSize: 9, fontWeight: 600, color: s.ok ? '#22C55E' : '#64748B' }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Input fields */}
      <Box className="rounded-xl p-3.5" sx={{ background: cardBg, border: `1px solid ${border}` }}>
        <Typography className="text-[9px] font-bold tracking-widest mb-3" sx={{ color: textMuted }}>
          ข้อมูลเพิ่มเติมสำหรับ REPORT
        </Typography>
        <Stack spacing={2}>
          <TextField size="small" multiline rows={3} label="Recommendations (คำแนะนำ)"
            value={recommendations} onChange={e => setRecommendations(e.target.value)} fullWidth
            placeholder="ข้อแนะนำเพื่อป้องกันเหตุการณ์ซ้ำ..." sx={inputSx} />
          <TextField size="small" multiline rows={3} label="Lessons Learned (บทเรียนที่ได้รับ)"
            value={lessons} onChange={e => setLessons(e.target.value)} fullWidth
            placeholder="บทเรียนที่ได้รับจากเหตุการณ์นี้..." sx={inputSx} />
        </Stack>
      </Box>

      {/* Action buttons */}
      <Box className="flex flex-wrap gap-2">
        <Button variant="contained"
          startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <AssessmentRoundedIcon sx={{ fontSize: 16 }} />}
          onClick={handleGenerate} disabled={generating}
          sx={{ borderRadius: 2, fontSize: 12, fontWeight: 700, boxShadow: 'none', background: '#6366F1', '&:hover': { background: '#4F46E5', boxShadow: 'none' } }}>
          สร้าง / Preview Report
        </Button>
        <Button variant="outlined"
          startIcon={<PrintRoundedIcon sx={{ fontSize: 15 }} />}
          onClick={handlePrint}
          sx={{ borderRadius: 2, fontSize: 12, borderColor: 'rgba(30,58,95,0.35)', color: '#1e3a5f', '&:hover': { borderColor: '#1e3a5f', background: 'rgba(30,58,95,0.05)' } }}>
          Print / Save PDF
        </Button>
        {mdPreview && (
          <>
            <Button variant="outlined" startIcon={<DownloadRoundedIcon sx={{ fontSize: 15 }} />} onClick={handleDownloadMd}
              sx={{ borderRadius: 2, fontSize: 12, borderColor: 'rgba(99,102,241,0.4)', color: '#6366F1', '&:hover': { borderColor: '#6366F1', background: 'rgba(99,102,241,0.06)' } }}>
              Download Markdown
            </Button>
            <Button variant="outlined" startIcon={<DownloadRoundedIcon sx={{ fontSize: 15 }} />} onClick={handleDownloadJson}
              sx={{ borderRadius: 2, fontSize: 12, borderColor: 'rgba(56,189,248,0.4)', color: '#38BDF8', '&:hover': { borderColor: '#38BDF8', background: 'rgba(56,189,248,0.06)' } }}>
              Download JSON
            </Button>
          </>
        )}
      </Box>

      {/* Markdown preview */}
      {mdPreview && (
        <Box className="rounded-xl overflow-hidden"
          sx={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.15)'}` }}>
          <Box className="px-3 py-2 flex items-center gap-2"
            sx={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.05)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}` }}>
            <AssessmentRoundedIcon sx={{ fontSize: 13, color: '#6366F1' }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#6366F1', letterSpacing: '0.06em' }}>PREVIEW</Typography>
            <Chip label={`${mdPreview.split('\n').length} บรรทัด`} size="small"
              sx={{ height: 16, fontSize: 9, bgcolor: 'rgba(99,102,241,0.1)', color: '#6366F1', border: 'none' }} />
          </Box>
          <Box className="overflow-auto max-h-[520px] p-4"
            sx={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff' }}>
            <Box
              sx={{ fontSize: 11, lineHeight: 1.7, color: isDark ? 'rgba(255,255,255,0.85)' : '#111827',
                '& h1,& h2,& h3,& h4': { color: isDark ? '#EDE9FA' : undefined },
                '& hr': { borderColor: isDark ? 'rgba(255,255,255,0.1)' : undefined },
                '& code': { background: isDark ? 'rgba(255,255,255,0.08)' : undefined, color: isDark ? '#93c5fd' : undefined },
                '& blockquote': { background: isDark ? 'rgba(245,158,11,0.1)' : undefined, borderColor: '#f59e0b' },
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(mdPreview) }}
            />
          </Box>
        </Box>
      )}
    </Stack>
  )
}
