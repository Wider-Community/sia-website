import ExcelJS from 'exceljs'
import type { Store, MonthData } from '../stores/financialModel'
import { calcSalaryAnnual, calcCapexDepreciation } from '../stores/financialModel'

// ── Style presets ────────────────────────────────────────────────────────────

const GREEN = '1D9E75'
const RED = 'E24B4A'
const DARK = '374151'
const GRAY = '6B7280'
const LIGHT_GREEN_BG = 'F0FDF4'
const LIGHT_GRAY_BG = 'F9FAFB'
const INPUT_BG = 'FFFDE7' // yellow tint for editable cells
const ACCT_FMT = '#,##0;(#,##0)' // accounting: negatives in parens
const NUM_FMT = '#,##0'
const PCT_FMT = '0.0%'
const DEC_FMT = '#,##0.00'

type WS = ExcelJS.Worksheet

function col(c: number): string {
  // 1-based col index → letter. 1=A, 2=B, 26=Z, 27=AA
  let s = ''
  let n = c
  while (n > 0) {
    n--
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26)
  }
  return s
}

function abs(c: number, r: number): string {
  return `$${col(c)}$${r}`
}

function setTitle(ws: WS, r: number, text: string) {
  const cell = ws.getCell(r, 1)
  cell.value = text
  cell.font = { bold: true, size: 14, color: { argb: DARK } }
}

function setSectionHeader(ws: WS, r: number, text: string, lastCol: number) {
  ws.mergeCells(r, 1, r, lastCol)
  const cell = ws.getCell(r, 1)
  cell.value = text
  cell.font = { bold: true, size: 10, color: { argb: GRAY } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY_BG } }
  cell.border = { bottom: { style: 'thin', color: { argb: 'E5E7EB' } } }
}

function setLabel(ws: WS, r: number, text: string, indent = false) {
  const cell = ws.getCell(r, 1)
  cell.value = text
  if (indent) cell.alignment = { indent: 2 }
}

function styleTotalRow(ws: WS, r: number, lastCol: number, opts: { double?: boolean; green?: boolean } = {}) {
  for (let c = 1; c <= lastCol; c++) {
    const cell = ws.getCell(r, c)
    cell.font = { bold: true, size: opts.double ? 12 : 11 }
    cell.border = {
      top: { style: 'medium', color: { argb: opts.green ? GREEN : DARK } },
      bottom: { style: opts.double ? 'double' : 'thin', color: { argb: opts.green ? GREEN : DARK } },
    }
    if (opts.green) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREEN_BG } }
    }
  }
}

function inputStyle(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_BG } }
  cell.border = {
    top: { style: 'thin', color: { argb: 'E5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
    left: { style: 'thin', color: { argb: 'E5E7EB' } },
    right: { style: 'thin', color: { argb: 'E5E7EB' } },
  }
}

// ── Assumptions sheet ────────────────────────────────────────────────────────

interface Refs {
  dealsPerYear: string; avgDealValue: string; commissionRate: string
  successRate: string; rampMonths: string; growthRate: string
  taxRate: string; startingCash: string; cogsPerDeal: string
  tierStartRow: number; tierCount: number
  addOnStartRow: number; addOnCount: number
  annualAddOnCell: string
  salTotalCell: string; opexTotalCell: string; depTotalCell: string
  subTotalMRRRow: number
}

function buildAssumptions(wb: ExcelJS.Workbook, s: Store): Refs {
  const ws = wb.addWorksheet('Assumptions')
  ws.getColumn(1).width = 28
  ws.getColumn(2).width = 16
  ws.getColumn(3).width = 14
  ws.getColumn(4).width = 14
  ws.getColumn(5).width = 14

  setTitle(ws, 1, 'Assumptions')
  ws.getCell(2, 1).value = 'Yellow cells are editable inputs'
  ws.getCell(2, 1).font = { italic: true, size: 10, color: { argb: GRAY } }

  // Deal parameters
  setSectionHeader(ws, 3, 'DEAL PARAMETERS', 5)
  const dealRows: [string, number, string][] = [
    ['Deals per Year', s.dealsPerYear, NUM_FMT],
    ['Average Deal Value ($)', s.avgDealValue, NUM_FMT],
    ['Commission Rate (%)', s.commissionRate / 100, PCT_FMT],
    ['Deal Success Rate (%)', s.dealSuccessRate / 100, PCT_FMT],
    ['Deal Ramp-up Months', s.dealRampUpMonths, NUM_FMT],
    ['Revenue Growth Rate (%)', s.revenueGrowthRate / 100, PCT_FMT],
  ]
  dealRows.forEach(([label, val, fmt], i) => {
    const r = 4 + i
    setLabel(ws, r, label)
    const c = ws.getCell(r, 2)
    c.value = val
    c.numFmt = fmt
    inputStyle(c)
  })

  // General
  setSectionHeader(ws, 11, 'GENERAL', 5)
  const genRows: [string, number, string][] = [
    ['Tax Rate (%)', s.taxRate / 100, PCT_FMT],
    ['Starting Cash ($)', s.startingCash, NUM_FMT],
    ['COGS per Deal ($)', s.cogsPerDeal, NUM_FMT],
  ]
  genRows.forEach(([label, val, fmt], i) => {
    const r = 12 + i
    setLabel(ws, r, label)
    const c = ws.getCell(r, 2)
    c.value = val
    c.numFmt = fmt
    inputStyle(c)
  })

  // Subscription tiers
  const tierStart = 16
  setSectionHeader(ws, tierStart, 'SUBSCRIPTION TIERS', 5)
  const tierHeaderRow = tierStart + 1
  ;['Tier', 'Price/Mo', 'Starting Subs', 'Churn %/Mo', 'New Subs/Mo'].forEach((h, i) => {
    const c = ws.getCell(tierHeaderRow, i + 1)
    c.value = h
    c.font = { bold: true, size: 10, color: { argb: GRAY } }
  })
  s.subTiers.forEach((tier, i) => {
    const r = tierHeaderRow + 1 + i
    ws.getCell(r, 1).value = tier.name
    const priceC = ws.getCell(r, 2); priceC.value = tier.price; priceC.numFmt = NUM_FMT; inputStyle(priceC)
    const subsC = ws.getCell(r, 3); subsC.value = tier.subscribers; subsC.numFmt = NUM_FMT; inputStyle(subsC)
    const churnC = ws.getCell(r, 4); churnC.value = tier.churnRate / 100; churnC.numFmt = PCT_FMT; inputStyle(churnC)
    const newC = ws.getCell(r, 5); newC.value = tier.newSubsPerMonth; newC.numFmt = NUM_FMT; inputStyle(newC)
  })

  // Add-ons
  const addOnStart = tierHeaderRow + 1 + s.subTiers.length + 1
  setSectionHeader(ws, addOnStart, 'ADD-ON SERVICES', 5)
  const addOnHeaderRow = addOnStart + 1
  ;['Service', 'Price per Engagement', 'Qty / Year', 'Annual Revenue'].forEach((h, i) => {
    const c = ws.getCell(addOnHeaderRow, i + 1)
    c.value = h
    c.font = { bold: true, size: 10, color: { argb: GRAY } }
  })
  s.addOns.forEach((addon, i) => {
    const r = addOnHeaderRow + 1 + i
    ws.getCell(r, 1).value = addon.name
    const pC = ws.getCell(r, 2); pC.value = addon.price; pC.numFmt = NUM_FMT; inputStyle(pC)
    const qC = ws.getCell(r, 3); qC.value = addon.quantity; qC.numFmt = NUM_FMT; inputStyle(qC)
    // Formula: price * qty
    const fC = ws.getCell(r, 4)
    fC.value = { formula: `B${r}*C${r}`, result: addon.price * addon.quantity }
    fC.numFmt = NUM_FMT
  })

  // Add-on total
  const addOnTotalRow = addOnHeaderRow + 1 + s.addOns.length
  setLabel(ws, addOnTotalRow, 'Total Annual Add-on Revenue')
  ws.getCell(addOnTotalRow, 1).font = { bold: true }
  const addOnFirstR = addOnHeaderRow + 1
  const addOnLastR = addOnTotalRow - 1
  const atC = ws.getCell(addOnTotalRow, 4)
  atC.value = { formula: `SUM(D${addOnFirstR}:D${addOnLastR})`, result: s.addOns.reduce((a, r) => a + r.price * r.quantity, 0) }
  atC.numFmt = NUM_FMT
  atC.font = { bold: true }

  // Computed costs (will reference Salaries/OPEX/CAPEX sheets)
  const compStart = addOnTotalRow + 2
  setSectionHeader(ws, compStart, 'COMPUTED MONTHLY COSTS (from detail sheets)', 5)
  const totalSalary = s.salaries.reduce((a, r) => a + calcSalaryAnnual(r), 0)
  const totalOpex = s.opex.reduce((a, r) => a + r.monthlyCost * r.months * r.quantity, 0)
  const monthlyDep = s.capex.reduce((a, r) => a + calcCapexDepreciation(r), 0) * 12

  setLabel(ws, compStart + 1, 'Monthly Salaries')
  const salC = ws.getCell(compStart + 1, 2)
  salC.value = { formula: `Salaries!B${2 + s.salaries.length + 1}/12`, result: Math.round(totalSalary / 12) }
  salC.numFmt = NUM_FMT

  setLabel(ws, compStart + 2, 'Monthly OPEX')
  const opexC = ws.getCell(compStart + 2, 2)
  opexC.value = { formula: `OPEX!E${2 + s.opex.length + 1}/12`, result: Math.round(totalOpex / 12) }
  opexC.numFmt = NUM_FMT

  setLabel(ws, compStart + 3, 'Monthly Depreciation')
  const depC = ws.getCell(compStart + 3, 2)
  depC.value = { formula: `CAPEX!F${2 + s.capex.length + 1}/12`, result: Math.round(monthlyDep / 12) }
  depC.numFmt = NUM_FMT

  return {
    dealsPerYear: abs(2, 4),
    avgDealValue: abs(2, 5),
    commissionRate: abs(2, 6),
    successRate: abs(2, 7),
    rampMonths: abs(2, 8),
    growthRate: abs(2, 9),
    taxRate: abs(2, 12),
    startingCash: abs(2, 13),
    cogsPerDeal: abs(2, 14),
    tierStartRow: tierHeaderRow + 1,
    tierCount: s.subTiers.length,
    addOnStartRow: addOnHeaderRow + 1,
    addOnCount: s.addOns.length,
    annualAddOnCell: abs(4, addOnTotalRow),
    salTotalCell: abs(2, compStart + 1),
    opexTotalCell: abs(2, compStart + 2),
    depTotalCell: abs(2, compStart + 3),
    subTotalMRRRow: 0, // set after building Subscribers sheet
  }
}

// ── Salaries sheet ───────────────────────────────────────────────────────────

function buildSalaries(wb: ExcelJS.Workbook, s: Store) {
  const ws = wb.addWorksheet('Salaries')
  ws.getColumn(1).width = 30; ws.getColumn(2).width = 14; ws.getColumn(3).width = 12
  ws.getColumn(4).width = 10; ws.getColumn(5).width = 10; ws.getColumn(6).width = 16

  setTitle(ws, 1, 'Salaries')
  const headers = ['Role', 'Type', 'Rate', 'Months', 'FTE/Qty', 'Annual Cost']
  headers.forEach((h, i) => {
    const c = ws.getCell(2, i + 1)
    c.value = h
    c.font = { bold: true, size: 10, color: { argb: GRAY } }
    c.border = { bottom: { style: 'thin' } }
  })

  s.salaries.forEach((sal, i) => {
    const r = 3 + i
    ws.getCell(r, 1).value = sal.role
    ws.getCell(r, 2).value = sal.type
    const rateC = ws.getCell(r, 3); rateC.value = sal.monthlyRate; rateC.numFmt = NUM_FMT; inputStyle(rateC)
    const moC = ws.getCell(r, 4); moC.value = sal.months; inputStyle(moC)
    const fteC = ws.getCell(r, 5); fteC.value = sal.fte; fteC.numFmt = DEC_FMT; inputStyle(fteC)
    // Formula: depends on type
    const fc = ws.getCell(r, 6)
    const formula = `IF(B${r}="Consultant",C${r}*20*D${r}*E${r},IF(B${r}="Project-based",C${r}*E${r},C${r}*D${r}*E${r}))`
    fc.value = { formula, result: Math.round(calcSalaryAnnual(sal)) }
    fc.numFmt = NUM_FMT
  })

  // Total
  const totalR = 3 + s.salaries.length
  ws.getCell(totalR, 1).value = 'Total Annual Salaries'
  ws.getCell(totalR, 1).font = { bold: true }
  // Put total in col B for simpler referencing
  const tfc = ws.getCell(totalR, 6)
  tfc.value = { formula: `SUM(F3:F${totalR - 1})`, result: Math.round(s.salaries.reduce((a, r) => a + calcSalaryAnnual(r), 0)) }
  tfc.numFmt = NUM_FMT
  tfc.font = { bold: true }
  // Also put in B for Assumptions reference
  ws.getCell(totalR, 2).value = { formula: `F${totalR}`, result: tfc.value.result as number }
  ws.getCell(totalR, 2).numFmt = NUM_FMT
  ws.getCell(totalR, 2).font = { bold: true }
  styleTotalRow(ws, totalR, 6)
}

// ── OPEX sheet ───────────────────────────────────────────────────────────────

function buildOPEX(wb: ExcelJS.Workbook, s: Store) {
  const ws = wb.addWorksheet('OPEX')
  ws.getColumn(1).width = 28; ws.getColumn(2).width = 14; ws.getColumn(3).width = 10
  ws.getColumn(4).width = 10; ws.getColumn(5).width = 16

  setTitle(ws, 1, 'Operating Expenses')
  ;['Category', 'Monthly Cost', 'Months', 'Qty', 'Annual Cost'].forEach((h, i) => {
    const c = ws.getCell(2, i + 1)
    c.value = h
    c.font = { bold: true, size: 10, color: { argb: GRAY } }
    c.border = { bottom: { style: 'thin' } }
  })

  s.opex.forEach((op, i) => {
    const r = 3 + i
    ws.getCell(r, 1).value = op.category
    const mC = ws.getCell(r, 2); mC.value = op.monthlyCost; mC.numFmt = NUM_FMT; inputStyle(mC)
    const moC = ws.getCell(r, 3); moC.value = op.months; inputStyle(moC)
    const qC = ws.getCell(r, 4); qC.value = op.quantity; inputStyle(qC)
    const fc = ws.getCell(r, 5)
    fc.value = { formula: `B${r}*C${r}*D${r}`, result: op.monthlyCost * op.months * op.quantity }
    fc.numFmt = NUM_FMT
  })

  const totalR = 3 + s.opex.length
  ws.getCell(totalR, 1).value = 'Total Annual OPEX'
  ws.getCell(totalR, 1).font = { bold: true }
  const tc = ws.getCell(totalR, 5)
  tc.value = { formula: `SUM(E3:E${totalR - 1})`, result: s.opex.reduce((a, r) => a + r.monthlyCost * r.months * r.quantity, 0) }
  tc.numFmt = NUM_FMT
  tc.font = { bold: true }
  styleTotalRow(ws, totalR, 5)
}

// ── CAPEX sheet ──────────────────────────────────────────────────────────────

function buildCAPEX(wb: ExcelJS.Workbook, s: Store) {
  const ws = wb.addWorksheet('CAPEX')
  ws.getColumn(1).width = 26; ws.getColumn(2).width = 14; ws.getColumn(3).width = 10
  ws.getColumn(4).width = 10; ws.getColumn(5).width = 16; ws.getColumn(6).width = 16

  setTitle(ws, 1, 'Capital Expenditures')
  ;['Asset', 'Cost', 'Life (Yr)', 'Method', 'Annual Dep.', 'Monthly Dep.'].forEach((h, i) => {
    const c = ws.getCell(2, i + 1)
    c.value = h
    c.font = { bold: true, size: 10, color: { argb: GRAY } }
    c.border = { bottom: { style: 'thin' } }
  })

  s.capex.forEach((cap, i) => {
    const r = 3 + i
    ws.getCell(r, 1).value = cap.asset
    const cC = ws.getCell(r, 2); cC.value = cap.cost; cC.numFmt = NUM_FMT; inputStyle(cC)
    const lC = ws.getCell(r, 3); lC.value = cap.usefulLife; inputStyle(lC)
    ws.getCell(r, 4).value = cap.depreciation
    // Annual depreciation formula
    const annDep = ws.getCell(r, 5)
    annDep.value = {
      formula: `IF(D${r}="None",0,IF(D${r}="Accelerated",B${r}*2/C${r},B${r}/C${r}))`,
      result: Math.round(calcCapexDepreciation(cap) * 12),
    }
    annDep.numFmt = NUM_FMT
    // Monthly depreciation
    const moDep = ws.getCell(r, 6)
    moDep.value = { formula: `E${r}/12`, result: Math.round(calcCapexDepreciation(cap)) }
    moDep.numFmt = NUM_FMT
  })

  const totalR = 3 + s.capex.length
  ws.getCell(totalR, 1).value = 'Total'
  ws.getCell(totalR, 1).font = { bold: true }
  ws.getCell(totalR, 2).value = { formula: `SUM(B3:B${totalR - 1})`, result: s.capex.reduce((a, r) => a + r.cost, 0) }
  ws.getCell(totalR, 2).numFmt = NUM_FMT; ws.getCell(totalR, 2).font = { bold: true }
  ws.getCell(totalR, 5).value = { formula: `SUM(E3:E${totalR - 1})`, result: Math.round(s.capex.reduce((a, r) => a + calcCapexDepreciation(r) * 12, 0)) }
  ws.getCell(totalR, 5).numFmt = NUM_FMT; ws.getCell(totalR, 5).font = { bold: true }
  ws.getCell(totalR, 6).value = { formula: `SUM(F3:F${totalR - 1})`, result: Math.round(s.capex.reduce((a, r) => a + calcCapexDepreciation(r), 0)) }
  ws.getCell(totalR, 6).numFmt = NUM_FMT; ws.getCell(totalR, 6).font = { bold: true }
  styleTotalRow(ws, totalR, 6)
}

// ── Subscribers sheet (churn model with formulas) ────────────────────────────

function buildSubscribers(wb: ExcelJS.Workbook, s: Store, refs: Refs): number {
  const ws = wb.addWorksheet('Subscribers')
  ws.getColumn(1).width = 26
  for (let c = 2; c <= 26; c++) ws.getColumn(c).width = 12

  setTitle(ws, 1, 'Subscriber Model (Churn)')

  // Month headers in row 2
  ws.getCell(2, 1).value = ''
  for (let m = 1; m <= 24; m++) {
    const c = ws.getCell(2, m + 1)
    c.value = `M${m}`
    c.font = { bold: true, size: 10, color: { argb: GRAY } }
    c.alignment = { horizontal: 'center' }
  }

  let currentRow = 3
  const mrrRows: number[] = [] // track MRR rows for total

  for (let ti = 0; ti < s.subTiers.length; ti++) {
    const tier = s.subTiers[ti]
    const tierDataRow = refs.tierStartRow + ti // row in Assumptions sheet
    const priceRef = `Assumptions!$B$${tierDataRow}`
    const subsRef = `Assumptions!$C$${tierDataRow}`
    const churnRef = `Assumptions!$D$${tierDataRow}`
    const newSubsRef = `Assumptions!$E$${tierDataRow}`

    // Section header
    setSectionHeader(ws, currentRow, `${tier.name} Tier`, 25)
    currentRow++

    // Active Subs row
    const subsRow = currentRow
    setLabel(ws, subsRow, `Active Subscribers`)

    // M1 = starting subs
    let prevActive = tier.subscribers
    ws.getCell(subsRow, 2).value = { formula: `${subsRef}`, result: prevActive }
    ws.getCell(subsRow, 2).numFmt = DEC_FMT

    // M2-M24: prev*(1-churn)+new
    for (let m = 2; m <= 24; m++) {
      prevActive = prevActive * (1 - tier.churnRate / 100) + tier.newSubsPerMonth
      const prevCol = col(m) // previous month column
      const thisCol = m + 1  // current column index
      ws.getCell(subsRow, thisCol).value = {
        formula: `${prevCol}${subsRow}*(1-${churnRef})+${newSubsRef}`,
        result: prevActive,
      }
      ws.getCell(subsRow, thisCol).numFmt = DEC_FMT
    }
    currentRow++

    // Churned row
    const churnRow = currentRow
    setLabel(ws, churnRow, `Churned`)
    let active = tier.subscribers
    for (let m = 1; m <= 24; m++) {
      if (m > 1) active = active * (1 - tier.churnRate / 100) + tier.newSubsPerMonth
      const churned = active * (tier.churnRate / 100)
      ws.getCell(churnRow, m + 1).value = {
        formula: `${col(m + 1)}${subsRow}*${churnRef}`,
        result: churned,
      }
      ws.getCell(churnRow, m + 1).numFmt = DEC_FMT
      ws.getCell(churnRow, m + 1).font = { color: { argb: RED } }
    }
    currentRow++

    // MRR row
    const mrrRow = currentRow
    mrrRows.push(mrrRow)
    setLabel(ws, mrrRow, `MRR`)
    active = tier.subscribers
    for (let m = 1; m <= 24; m++) {
      if (m > 1) active = active * (1 - tier.churnRate / 100) + tier.newSubsPerMonth
      ws.getCell(mrrRow, m + 1).value = {
        formula: `${col(m + 1)}${subsRow}*${priceRef}`,
        result: Math.round(active * tier.price),
      }
      ws.getCell(mrrRow, m + 1).numFmt = NUM_FMT
      ws.getCell(mrrRow, m + 1).font = { color: { argb: GREEN } }
    }
    currentRow += 2 // blank row between tiers
  }

  // Total MRR row
  const totalRow = currentRow
  setLabel(ws, totalRow, 'Total Subscription Revenue')
  ws.getCell(totalRow, 1).font = { bold: true }

  for (let m = 1; m <= 24; m++) {
    const c = m + 1
    const parts = mrrRows.map((r) => `${col(c)}${r}`)
    const formula = parts.join('+')
    let result = 0
    // Compute cached value
    let actives = s.subTiers.map((t) => t.subscribers)
    for (let mo = 1; mo <= m; mo++) {
      if (mo > 1) actives = actives.map((a, i) => a * (1 - s.subTiers[i].churnRate / 100) + s.subTiers[i].newSubsPerMonth)
    }
    result = actives.reduce((a, subs, i) => a + subs * s.subTiers[i].price, 0)
    ws.getCell(totalRow, c).value = { formula, result: Math.round(result) }
    ws.getCell(totalRow, c).numFmt = NUM_FMT
    ws.getCell(totalRow, c).font = { bold: true }
  }
  styleTotalRow(ws, totalRow, 25, { green: true })

  return totalRow
}

// ── Income Statement sheet ───────────────────────────────────────────────────

function buildIncomeStatement(wb: ExcelJS.Workbook, _s: Store, forecast: MonthData[], refs: Refs) {
  const ws = wb.addWorksheet('Income Statement')
  ws.getColumn(1).width = 32
  for (let c = 2; c <= 27; c++) ws.getColumn(c).width = 13

  setTitle(ws, 1, 'Income Statement')
  ws.getCell(2, 1).value = '$ in actual figures'
  ws.getCell(2, 1).font = { italic: true, size: 10, color: { argb: GRAY } }

  // Month headers (row 2, cols 2-25) and Y1/Y2 totals (cols 26-27)
  for (let m = 1; m <= 24; m++) {
    const c = ws.getCell(2, m + 1)
    c.value = `M${m}`
    c.font = { bold: true, size: 10, color: { argb: GRAY } }
    c.alignment = { horizontal: 'right' }
  }
  ws.getCell(2, 26).value = 'Y1 Total'
  ws.getCell(2, 26).font = { bold: true, size: 10 }
  ws.getCell(2, 27).value = 'Y2 Total'
  ws.getCell(2, 27).font = { bold: true, size: 10 }

  // Helper row 3: month numbers (hidden helper for formulas)
  for (let m = 1; m <= 24; m++) {
    ws.getCell(3, m + 1).value = m
  }
  ws.getRow(3).hidden = true

  const AS = 'Assumptions'
  const SUB = 'Subscribers'
  const y1SumRange = (r: number) => `SUM(B${r}:M${r})`
  const y2SumRange = (r: number) => `SUM(N${r}:Y${r})`

  let row = 4
  // ── SALES ──
  setSectionHeader(ws, row, 'SALES', 27); row++

  // Deal Revenue
  const dealRevRow = row
  setLabel(ws, row, 'Deal Revenue', true)
  for (let m = 1; m <= 24; m++) {
    const mc = col(m + 1)
    // = dealsPerYear/12 * MIN(month/rampMonths, 1) * avgDealValue * commissionRate * successRate * (1 + growthRate*(month-1)/12)
    const f = `'${AS}'!${refs.dealsPerYear}/12*MIN(${mc}$3/'${AS}'!${refs.rampMonths},1)*'${AS}'!${refs.avgDealValue}*'${AS}'!${refs.commissionRate}*'${AS}'!${refs.successRate}*(1+'${AS}'!${refs.growthRate}*(${mc}$3-1)/12)`
    ws.getCell(row, m + 1).value = { formula: f, result: Math.round(forecast[m - 1].dealRevenue) }
    ws.getCell(row, m + 1).numFmt = NUM_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row), result: Math.round(forecast.slice(0, 12).reduce((a, m) => a + m.dealRevenue, 0)) }
  ws.getCell(row, 26).numFmt = NUM_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row), result: Math.round(forecast.slice(12).reduce((a, m) => a + m.dealRevenue, 0)) }
  ws.getCell(row, 27).numFmt = NUM_FMT
  row++

  // Subscription Revenue
  const subRevRow = row
  setLabel(ws, row, 'Subscription Revenue', true)
  for (let m = 1; m <= 24; m++) {
    const mc = col(m + 1)
    // Reference Subscribers sheet total MRR row
    const f = `'${SUB}'!${mc}${refs.subTotalMRRRow}`
    ws.getCell(row, m + 1).value = { formula: f, result: Math.round(forecast[m - 1].subRevenue) }
    ws.getCell(row, m + 1).numFmt = NUM_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row), result: Math.round(forecast.slice(0, 12).reduce((a, m) => a + m.subRevenue, 0)) }
  ws.getCell(row, 26).numFmt = NUM_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row), result: Math.round(forecast.slice(12).reduce((a, m) => a + m.subRevenue, 0)) }
  ws.getCell(row, 27).numFmt = NUM_FMT
  row++

  // Add-on Revenue
  const addOnRevRow = row
  setLabel(ws, row, 'Add-on Revenue', true)
  for (let m = 1; m <= 24; m++) {
    const mc = col(m + 1)
    // = annualAddOnTotal/12 * rampFactor * growthFactor
    const f = `'${AS}'!${refs.annualAddOnCell}/12*MIN(${mc}$3/'${AS}'!${refs.rampMonths},1)*(1+'${AS}'!${refs.growthRate}*(${mc}$3-1)/12)`
    ws.getCell(row, m + 1).value = { formula: f, result: Math.round(forecast[m - 1].addOnRevenue) }
    ws.getCell(row, m + 1).numFmt = NUM_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row), result: Math.round(forecast.slice(0, 12).reduce((a, m) => a + m.addOnRevenue, 0)) }
  ws.getCell(row, 26).numFmt = NUM_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row), result: Math.round(forecast.slice(12).reduce((a, m) => a + m.addOnRevenue, 0)) }
  ws.getCell(row, 27).numFmt = NUM_FMT
  row++

  // Total Sales
  const totalSalesRow = row
  setLabel(ws, row, 'Total Sales')
  for (let m = 1; m <= 24; m++) {
    const mc = col(m + 1)
    ws.getCell(row, m + 1).value = { formula: `${mc}${dealRevRow}+${mc}${subRevRow}+${mc}${addOnRevRow}`, result: Math.round(forecast[m - 1].totalRevenue) }
    ws.getCell(row, m + 1).numFmt = NUM_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row), result: Math.round(forecast.slice(0, 12).reduce((a, m) => a + m.totalRevenue, 0)) }
  ws.getCell(row, 26).numFmt = NUM_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row), result: Math.round(forecast.slice(12).reduce((a, m) => a + m.totalRevenue, 0)) }
  ws.getCell(row, 27).numFmt = NUM_FMT
  styleTotalRow(ws, row, 27, { green: true })
  row += 2

  // ── COGS ──
  setSectionHeader(ws, row, 'COST OF GOODS SOLD', 27); row++
  const cogsRow = row
  setLabel(ws, row, 'Per-deal COGS', true)
  for (let m = 1; m <= 24; m++) {
    const mc = col(m + 1)
    // deals_this_month * cogs_per_deal
    const f = `'${AS}'!${refs.dealsPerYear}/12*MIN(${mc}$3/'${AS}'!${refs.rampMonths},1)*'${AS}'!${refs.successRate}*(1+'${AS}'!${refs.growthRate}*(${mc}$3-1)/12)*'${AS}'!${refs.cogsPerDeal}`
    ws.getCell(row, m + 1).value = { formula: f, result: Math.round(forecast[m - 1].cogs) }
    ws.getCell(row, m + 1).numFmt = NUM_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row), result: Math.round(forecast.slice(0, 12).reduce((a, m) => a + m.cogs, 0)) }
  ws.getCell(row, 26).numFmt = NUM_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row), result: Math.round(forecast.slice(12).reduce((a, m) => a + m.cogs, 0)) }
  ws.getCell(row, 27).numFmt = NUM_FMT
  row += 2

  // Gross Profit
  const gpRow = row
  setLabel(ws, row, 'Gross Profit')
  for (let m = 1; m <= 24; m++) {
    const mc = col(m + 1)
    ws.getCell(row, m + 1).value = { formula: `${mc}${totalSalesRow}-${mc}${cogsRow}`, result: Math.round(forecast[m - 1].grossProfit) }
    ws.getCell(row, m + 1).numFmt = ACCT_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row), result: Math.round(forecast.slice(0, 12).reduce((a, m) => a + m.grossProfit, 0)) }
  ws.getCell(row, 26).numFmt = ACCT_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row), result: Math.round(forecast.slice(12).reduce((a, m) => a + m.grossProfit, 0)) }
  ws.getCell(row, 27).numFmt = ACCT_FMT
  styleTotalRow(ws, row, 27, { double: true, green: true })
  row += 2

  // ── OPEX ──
  setSectionHeader(ws, row, 'OPERATING EXPENSES', 27); row++

  const salRow = row
  setLabel(ws, row, 'Salaries & Wages', true)
  for (let m = 1; m <= 24; m++) {
    ws.getCell(row, m + 1).value = { formula: `'${AS}'!${refs.salTotalCell}`, result: Math.round(forecast[0].salaries) }
    ws.getCell(row, m + 1).numFmt = NUM_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row) }; ws.getCell(row, 26).numFmt = NUM_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row) }; ws.getCell(row, 27).numFmt = NUM_FMT
  row++

  const opexRow = row
  setLabel(ws, row, 'Operating Expenses', true)
  for (let m = 1; m <= 24; m++) {
    ws.getCell(row, m + 1).value = { formula: `'${AS}'!${refs.opexTotalCell}`, result: Math.round(forecast[0].opex) }
    ws.getCell(row, m + 1).numFmt = NUM_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row) }; ws.getCell(row, 26).numFmt = NUM_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row) }; ws.getCell(row, 27).numFmt = NUM_FMT
  row++

  const depRow = row
  setLabel(ws, row, 'Depreciation', true)
  for (let m = 1; m <= 24; m++) {
    ws.getCell(row, m + 1).value = { formula: `'${AS}'!${refs.depTotalCell}`, result: Math.round(forecast[0].depreciation) }
    ws.getCell(row, m + 1).numFmt = NUM_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row) }; ws.getCell(row, 26).numFmt = NUM_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row) }; ws.getCell(row, 27).numFmt = NUM_FMT
  row++

  // Total OpEx
  const totalOpexRow = row
  setLabel(ws, row, 'Total Operating Expenses')
  for (let m = 1; m <= 24; m++) {
    const mc = col(m + 1)
    ws.getCell(row, m + 1).value = { formula: `${mc}${salRow}+${mc}${opexRow}+${mc}${depRow}`, result: Math.round(forecast[m - 1].salaries + forecast[m - 1].opex + forecast[m - 1].depreciation) }
    ws.getCell(row, m + 1).numFmt = NUM_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row) }; ws.getCell(row, 26).numFmt = NUM_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row) }; ws.getCell(row, 27).numFmt = NUM_FMT
  styleTotalRow(ws, row, 27)
  row += 2

  // EBIT
  const ebitRow = row
  setLabel(ws, row, 'EBIT')
  for (let m = 1; m <= 24; m++) {
    const mc = col(m + 1)
    ws.getCell(row, m + 1).value = { formula: `${mc}${gpRow}-${mc}${totalOpexRow}`, result: Math.round(forecast[m - 1].ebit) }
    ws.getCell(row, m + 1).numFmt = ACCT_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row) }; ws.getCell(row, 26).numFmt = ACCT_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row) }; ws.getCell(row, 27).numFmt = ACCT_FMT
  styleTotalRow(ws, row, 27, { double: true })
  row += 2

  // Tax
  const taxRow = row
  setLabel(ws, row, `Income Taxes`, true)
  for (let m = 1; m <= 24; m++) {
    const mc = col(m + 1)
    ws.getCell(row, m + 1).value = {
      formula: `IF(${mc}${ebitRow}>0,${mc}${ebitRow}*'${AS}'!${refs.taxRate},0)`,
      result: Math.round(forecast[m - 1].tax),
    }
    ws.getCell(row, m + 1).numFmt = NUM_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row) }; ws.getCell(row, 26).numFmt = NUM_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row) }; ws.getCell(row, 27).numFmt = NUM_FMT
  row += 2

  // Net Income
  const niRow = row
  setLabel(ws, row, 'Net Income')
  for (let m = 1; m <= 24; m++) {
    const mc = col(m + 1)
    ws.getCell(row, m + 1).value = { formula: `${mc}${ebitRow}-${mc}${taxRow}`, result: Math.round(forecast[m - 1].netProfit) }
    ws.getCell(row, m + 1).numFmt = ACCT_FMT
  }
  ws.getCell(row, 26).value = { formula: y1SumRange(row) }; ws.getCell(row, 26).numFmt = ACCT_FMT
  ws.getCell(row, 27).value = { formula: y2SumRange(row) }; ws.getCell(row, 27).numFmt = ACCT_FMT
  styleTotalRow(ws, row, 27, { double: true })
  row += 2

  // Cumulative Net Income
  setLabel(ws, row, 'Cumulative Net Income')
  ws.getCell(row, 1).font = { bold: true, color: { argb: GRAY } }
  let cumNI = 0
  for (let m = 1; m <= 24; m++) {
    cumNI += forecast[m - 1].netProfit
    const mc = col(m + 1)
    if (m === 1) {
      ws.getCell(row, m + 1).value = { formula: `${mc}${niRow}`, result: Math.round(cumNI) }
    } else {
      const prevC = col(m)
      ws.getCell(row, m + 1).value = { formula: `${prevC}${row}+${mc}${niRow}`, result: Math.round(cumNI) }
    }
    ws.getCell(row, m + 1).numFmt = ACCT_FMT
  }

  // Freeze panes
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }]
}

// ── Cash Flow sheet ──────────────────────────────────────────────────────────

function buildCashFlow(wb: ExcelJS.Workbook, s: Store, forecast: MonthData[], refs: Refs) {
  const ws = wb.addWorksheet('Cash Flow')
  ws.getColumn(1).width = 32
  ws.getColumn(2).width = 16
  ws.getColumn(3).width = 16

  setTitle(ws, 1, 'Statement of Cash Flows')
  ws.getCell(2, 1).value = '$ in actual figures'
  ws.getCell(2, 1).font = { italic: true, size: 10, color: { argb: GRAY } }
  ws.getCell(2, 2).value = 'Year 1'; ws.getCell(2, 2).font = { bold: true }
  ws.getCell(2, 3).value = 'Year 2'; ws.getCell(2, 3).font = { bold: true }

  const y1NI = forecast.slice(0, 12).reduce((a, m) => a + m.netProfit, 0)
  const y2NI = forecast.slice(12).reduce((a, m) => a + m.netProfit, 0)
  const y1Dep = forecast.slice(0, 12).reduce((a, m) => a + m.depreciation, 0)
  const y2Dep = forecast.slice(12).reduce((a, m) => a + m.depreciation, 0)
  const totalCapex = s.capex.reduce((a, r) => a + r.cost, 0)

  let row = 4
  // Net Income
  setLabel(ws, row, 'Net Income')
  ws.getCell(row, 1).font = { bold: true }
  ws.getCell(row, 2).value = Math.round(y1NI); ws.getCell(row, 2).numFmt = ACCT_FMT
  ws.getCell(row, 3).value = Math.round(y2NI); ws.getCell(row, 3).numFmt = ACCT_FMT
  const niCFRow = row
  row++

  setSectionHeader(ws, row, 'OPERATING ACTIVITIES', 3); row++
  setLabel(ws, row, 'Depreciation (add-back)', true)
  ws.getCell(row, 2).value = Math.round(y1Dep); ws.getCell(row, 2).numFmt = NUM_FMT
  ws.getCell(row, 3).value = Math.round(y2Dep); ws.getCell(row, 3).numFmt = NUM_FMT
  const depCFRow = row; row++

  setLabel(ws, row, 'Operating Cash Flow')
  ws.getCell(row, 2).value = { formula: `B${niCFRow}+B${depCFRow}`, result: Math.round(y1NI + y1Dep) }
  ws.getCell(row, 2).numFmt = ACCT_FMT; ws.getCell(row, 2).font = { bold: true }
  ws.getCell(row, 3).value = { formula: `C${niCFRow}+C${depCFRow}`, result: Math.round(y2NI + y2Dep) }
  ws.getCell(row, 3).numFmt = ACCT_FMT; ws.getCell(row, 3).font = { bold: true }
  const opCFRow = row
  styleTotalRow(ws, row, 3)
  row += 2

  setSectionHeader(ws, row, 'INVESTING ACTIVITIES', 3); row++
  setLabel(ws, row, 'Capital Expenditures', true)
  ws.getCell(row, 2).value = -totalCapex; ws.getCell(row, 2).numFmt = ACCT_FMT
  ws.getCell(row, 2).font = { color: { argb: RED } }
  ws.getCell(row, 3).value = 0; ws.getCell(row, 3).numFmt = ACCT_FMT
  const capexCFRow = row; row++

  setLabel(ws, row, 'Investing Cash Flow')
  ws.getCell(row, 2).value = { formula: `B${capexCFRow}`, result: -totalCapex }
  ws.getCell(row, 2).numFmt = ACCT_FMT; ws.getCell(row, 2).font = { bold: true }
  ws.getCell(row, 3).value = { formula: `C${capexCFRow}`, result: 0 }
  ws.getCell(row, 3).numFmt = ACCT_FMT; ws.getCell(row, 3).font = { bold: true }
  const invCFRow = row
  styleTotalRow(ws, row, 3)
  row += 2

  // Net Cash Flow
  setLabel(ws, row, 'Net Cash Flow')
  ws.getCell(row, 2).value = { formula: `B${opCFRow}+B${invCFRow}`, result: Math.round(y1NI + y1Dep - totalCapex) }
  ws.getCell(row, 2).numFmt = ACCT_FMT
  ws.getCell(row, 3).value = { formula: `C${opCFRow}+C${invCFRow}`, result: Math.round(y2NI + y2Dep) }
  ws.getCell(row, 3).numFmt = ACCT_FMT
  const netCFRow = row
  styleTotalRow(ws, row, 3, { double: true })
  row += 2

  // Cash position
  setSectionHeader(ws, row, 'CASH POSITION', 3); row++
  setLabel(ws, row, 'Opening Cash')
  ws.getCell(row, 2).value = { formula: `'Assumptions'!${refs.startingCash}`, result: s.startingCash }
  ws.getCell(row, 2).numFmt = NUM_FMT
  ws.getCell(row, 3).value = { formula: `C${row + 1}`, result: 0 } // will be closing Y1
  ws.getCell(row, 3).numFmt = NUM_FMT // placeholder, corrected below
  const openRow = row; row++

  setLabel(ws, row, 'Closing Cash')
  ws.getCell(row, 1).font = { bold: true }
  const closingY1 = Math.round(s.startingCash + y1NI + y1Dep - totalCapex)
  ws.getCell(row, 2).value = { formula: `B${openRow}+B${netCFRow}`, result: closingY1 }
  ws.getCell(row, 2).numFmt = ACCT_FMT; ws.getCell(row, 2).font = { bold: true }
  // Fix Y2 opening to reference Y1 closing
  ws.getCell(openRow, 3).value = { formula: `B${row}`, result: closingY1 }
  ws.getCell(row, 3).value = { formula: `C${openRow}+C${netCFRow}`, result: Math.round(closingY1 + y2NI + y2Dep) }
  ws.getCell(row, 3).numFmt = ACCT_FMT; ws.getCell(row, 3).font = { bold: true }
  styleTotalRow(ws, row, 3, { double: true, green: true })
}

// ── Main export function ─────────────────────────────────────────────────────

export async function exportToExcel(s: Store, forecast: MonthData[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SIA Financial Model'
  wb.created = new Date()

  // Build sheets in dependency order
  const refs = buildAssumptions(wb, s)
  buildSalaries(wb, s)
  buildOPEX(wb, s)
  buildCAPEX(wb, s)
  refs.subTotalMRRRow = buildSubscribers(wb, s, refs)
  buildIncomeStatement(wb, s, forecast, refs)
  buildCashFlow(wb, s, forecast, refs)

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'SIA_Financial_Model.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
