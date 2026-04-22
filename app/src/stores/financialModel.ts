import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import costStructure from './cost-structure.json'

const uid = () => Math.random().toString(36).slice(2, 10)

export interface SalaryRow {
  id: string
  role: string
  type: 'Full-time' | 'Part-time' | 'Consultant' | 'Project-based' | 'Retainer'
  monthlyRate: number
  months: number
  fte: number
}

export interface OpexRow {
  id: string
  category: string
  monthlyCost: number
  months: number
  quantity: number
}

export interface CapexRow {
  id: string
  asset: string
  cost: number
  purchaseMonth: number
  usefulLife: number
  depreciation: 'Straight-line' | 'Accelerated' | 'None'
}

export interface SubTier {
  id: string
  name: string
  price: number
  subscribers: number
  churnRate: number       // monthly churn %, e.g. 5 means 5% of subscribers churn each month
  newSubsPerMonth: number // new subscribers acquired per month for this tier
}

export interface AddOn {
  id: string
  name: string
  price: number
  quantity: number
}

export interface MonthData {
  month: number
  label: string
  dealRevenue: number
  subRevenue: number
  addOnRevenue: number
  totalRevenue: number
  cogs: number
  grossProfit: number
  salaries: number
  opex: number
  depreciation: number
  totalCosts: number
  ebit: number
  tax: number
  netProfit: number
  cashFlow: number
  cumCash: number
}

// ── Detailed per-category monthly breakdown (mirrors Excel Sales Forecast) ──

export interface CategoryMonth {
  units: number
  pricePerUnit: number
  total: number
}

export interface RevenueCategoryRow {
  id: string
  name: string
  type: 'deal' | 'subscription' | 'addon'
  months: CategoryMonth[] // length 24
  annual1: number // Y1 total
  annual2: number // Y2 total
}

export interface DetailedForecast {
  categories: RevenueCategoryRow[]
  monthlyTotals: number[]     // 24 entries — sum of all category totals
  annual1Total: number
  annual2Total: number
  // Accumulative rows (running sums)
  accumCost: number[]         // 24 entries
  accumRevenue: number[]      // 24 entries
  accumBudget: number[]       // 24 entries (revenue - cost)
  // Per-month cost / revenue / profit
  monthlyCost: number[]       // 24 entries
  monthlyRevenue: number[]    // same as monthlyTotals
  monthlyProfit: number[]     // revenue - cost
}

export interface Store {
  // Dashboard sliders
  dealsPerYear: number
  avgDealValue: number
  commissionRate: number
  dealRampUpMonths: number
  revenueGrowthRate: number
  numSubscribers: number
  newSubsPerMonth: number
  avgSubscriptionFee: number
  subRevenueMultiplier: number   // 0-200%, scales all subscription revenue from Dashboard
  addOnRevenueMultiplier: number // 0-200%, scales all add-on revenue from Dashboard
  startingCash: number
  taxRate: number

  // Revenue
  dealSuccessRate: number
  subTiers: SubTier[]
  addOns: AddOn[]

  // Costs
  salaries: SalaryRow[]
  opex: OpexRow[]
  capex: CapexRow[]
  cogsPerDeal: number

  // Actions
  set: (partial: Partial<Omit<Store, 'set' | 'addSalary' | 'removeSalary' | 'updateSalary' | 'addOpex' | 'removeOpex' | 'updateOpex' | 'addCapex' | 'removeCapex' | 'updateCapex' | 'addSubTier' | 'removeSubTier' | 'updateSubTier' | 'addAddOn' | 'removeAddOn' | 'updateAddOn'>>) => void
  addSalary: () => void
  removeSalary: (id: string) => void
  updateSalary: (id: string, u: Partial<SalaryRow>) => void
  addOpex: () => void
  removeOpex: (id: string) => void
  updateOpex: (id: string, u: Partial<OpexRow>) => void
  addCapex: () => void
  removeCapex: (id: string) => void
  updateCapex: (id: string, u: Partial<CapexRow>) => void
  addSubTier: () => void
  removeSubTier: (id: string) => void
  updateSubTier: (id: string, u: Partial<SubTier>) => void
  addAddOn: () => void
  removeAddOn: (id: string) => void
  updateAddOn: (id: string, u: Partial<AddOn>) => void
}

function makeDefaults() {
  return {
    dealsPerYear: 25,
    avgDealValue: 5_000_000,
    commissionRate: 2.5,
    dealRampUpMonths: 4,
    revenueGrowthRate: 15,
    numSubscribers: 30,
    newSubsPerMonth: 3,
    avgSubscriptionFee: 1500,
    subRevenueMultiplier: 100,
    addOnRevenueMultiplier: 100,
    startingCash: 50_000,
    taxRate: 20,
    dealSuccessRate: 80,
    subTiers: [
      { id: uid(), name: 'Access', price: 500, subscribers: 15, churnRate: 8, newSubsPerMonth: 5 },
      { id: uid(), name: 'Active', price: 1500, subscribers: 10, churnRate: 5, newSubsPerMonth: 3 },
      { id: uid(), name: 'Premium', price: 3500, subscribers: 5, churnRate: 3, newSubsPerMonth: 2 },
    ] as SubTier[],
    addOns: [
      { id: uid(), name: 'Data Licensing', price: 12000, quantity: 4 },
      { id: uid(), name: 'Due Diligence Advisory', price: 6000, quantity: 6 },
      { id: uid(), name: 'Deal Structuring Consulting', price: 30000, quantity: 3 },
      { id: uid(), name: 'Training & Certification', price: 3500, quantity: 8 },
    ] as AddOn[],
    // Cost structure loaded from cost-structure.json
    salaries: costStructure.salaries.map((s) => ({
      id: uid(),
      role: s.role,
      type: s.type as SalaryRow['type'],
      monthlyRate: s.monthlyRate,
      months: s.months,
      fte: s.fte,
    })) as SalaryRow[],
    opex: costStructure.opex.map((o) => ({
      id: uid(),
      category: o.category,
      monthlyCost: o.monthlyCost,
      months: o.months,
      quantity: o.quantity,
    })) as OpexRow[],
    capex: costStructure.capex.map((c) => ({
      id: uid(),
      asset: c.asset,
      cost: c.cost,
      purchaseMonth: c.purchaseMonth,
      usefulLife: c.usefulLife,
      depreciation: c.depreciation as CapexRow['depreciation'],
    })) as CapexRow[],
    cogsPerDeal: 3000,
  }
}

// Scenario presets loaded from config file (edit scenarios.json to change)
import scenariosConfig from './scenarios.json'

function buildScenario(val: typeof scenariosConfig[keyof typeof scenariosConfig]) {
  const defaults = makeDefaults()
  return {
    ...defaults,
    ...val.params,
    subTiers: val.subTiers.map((t: { name: string; price: number; subscribers: number; churnRate: number; newSubsPerMonth: number }) => ({
      id: uid(), name: t.name, price: t.price, subscribers: t.subscribers, churnRate: t.churnRate, newSubsPerMonth: t.newSubsPerMonth,
    })) as SubTier[],
    addOns: val.addOns.map((a: { name: string; price: number; quantity: number }) => ({
      id: uid(), name: a.name, price: a.price, quantity: a.quantity,
    })) as AddOn[],
  }
}

export const SCENARIOS = Object.fromEntries(
  Object.entries(scenariosConfig).map(([key, val]) => [key, buildScenario(val)])
) as Record<string, ReturnType<typeof makeDefaults>>

// Default = Conservative scenario (what every new visitor sees)
export const DEFAULTS = SCENARIOS.conservative

export const SCENARIO_META = scenariosConfig as Record<string, { label: string; description: string; color: string }>

export const useStore = create<Store>()(persist((set) => ({
  ...DEFAULTS,

  set: (partial) => set(partial),

  addSalary: () => set((s) => ({ salaries: [...s.salaries, { id: uid(), role: 'New Role', type: 'Full-time', monthlyRate: 2000, months: 12, fte: 1 }] })),
  removeSalary: (id) => set((s) => ({ salaries: s.salaries.filter((r) => r.id !== id) })),
  updateSalary: (id, u) => set((s) => ({ salaries: s.salaries.map((r) => r.id === id ? { ...r, ...u } : r) })),

  addOpex: () => set((s) => ({ opex: [...s.opex, { id: uid(), category: 'New Category', monthlyCost: 500, months: 12, quantity: 1 }] })),
  removeOpex: (id) => set((s) => ({ opex: s.opex.filter((r) => r.id !== id) })),
  updateOpex: (id, u) => set((s) => ({ opex: s.opex.map((r) => r.id === id ? { ...r, ...u } : r) })),

  addCapex: () => set((s) => ({ capex: [...s.capex, { id: uid(), asset: 'New Asset', cost: 5000, purchaseMonth: 1, usefulLife: 3, depreciation: 'Straight-line' }] })),
  removeCapex: (id) => set((s) => ({ capex: s.capex.filter((r) => r.id !== id) })),
  updateCapex: (id, u) => set((s) => ({ capex: s.capex.map((r) => r.id === id ? { ...r, ...u } : r) })),

  addSubTier: () => set((s) => ({ subTiers: [...s.subTiers, { id: uid(), name: 'New Tier', price: 1000, subscribers: 5, churnRate: 5, newSubsPerMonth: 2 }] })),
  removeSubTier: (id) => set((s) => ({ subTiers: s.subTiers.filter((r) => r.id !== id) })),
  updateSubTier: (id, u) => set((s) => ({ subTiers: s.subTiers.map((r) => r.id === id ? { ...r, ...u } : r) })),

  addAddOn: () => set((s) => ({ addOns: [...s.addOns, { id: uid(), name: 'New Add-On', price: 5000, quantity: 2 }] })),
  removeAddOn: (id) => set((s) => ({ addOns: s.addOns.filter((r) => r.id !== id) })),
  updateAddOn: (id, u) => set((s) => ({ addOns: s.addOns.map((r) => r.id === id ? { ...r, ...u } : r) })),
}), { name: 'sia-financial-model', version: 1, migrate: (persisted) => persisted as Store }))

// ── Derived calculations ──

export function calcSalaryAnnual(r: SalaryRow): number {
  switch (r.type) {
    case 'Consultant': return r.monthlyRate * 20 * r.months * r.fte
    case 'Project-based': return r.monthlyRate * r.fte
    default: return r.monthlyRate * r.months * r.fte
  }
}

export function calcCapexDepreciation(r: CapexRow): number {
  if (r.depreciation === 'None' || r.usefulLife === 0) return 0
  if (r.depreciation === 'Accelerated') return (r.cost * 2) / r.usefulLife / 12
  return r.cost / r.usefulLife / 12
}

export function calcMonthlyDep(r: CapexRow, month: number): number {
  if (r.depreciation === 'None' || r.usefulLife === 0) return 0
  if (month < r.purchaseMonth) return 0
  const monthsDepreciated = month - r.purchaseMonth + 1
  const totalDepMonths = r.usefulLife * 12
  if (monthsDepreciated > totalDepMonths) return 0
  if (r.depreciation === 'Accelerated') return (r.cost * 2) / r.usefulLife / 12
  return r.cost / r.usefulLife / 12
}

export function calcTierSubsAtMonth(tier: SubTier, month: number): number {
  let active = tier.subscribers
  for (let m = 2; m <= month; m++) {
    active = active * (1 - tier.churnRate / 100) + tier.newSubsPerMonth
  }
  return active
}

export function calcMonthlyForecast(s: Store): MonthData[] {
  const months: MonthData[] = []
  const totalSalaryAnnual = s.salaries.reduce((a, r) => a + calcSalaryAnnual(r), 0)
  const monthlySalary = totalSalaryAnnual / 12
  const monthlyOpex = s.opex.reduce((a, r) => a + r.monthlyCost * r.quantity * (r.months / 12), 0)

  const annualCommission = s.dealsPerYear * s.avgDealValue * (s.commissionRate / 100) * (s.dealSuccessRate / 100)
  const annualAddOn = s.addOns.reduce((a, r) => a + r.price * r.quantity, 0)

  // Build per-tier active subscriber counts using churn model
  const tierActiveSubs: number[][] = s.subTiers.map((tier) => {
    const subs: number[] = []
    for (let m = 1; m <= 24; m++) {
      if (m === 1) {
        subs.push(tier.subscribers)
      } else {
        subs.push(subs[m - 2] * (1 - tier.churnRate / 100) + tier.newSubsPerMonth)
      }
    }
    return subs
  })

  let cumCash = s.startingCash
  const totalCapex = s.capex.reduce((a, r) => a + r.cost, 0)
  cumCash -= totalCapex

  for (let m = 1; m <= 24; m++) {
    const growthFactor = 1 + (s.revenueGrowthRate / 100) * ((m - 1) / 12)
    const rampFactor = Math.min(m / Math.max(s.dealRampUpMonths, 1), 1)

    const dealRevenue = (annualCommission / 12) * rampFactor * growthFactor
    const subRevenue = s.subTiers.reduce((sum, tier, i) => sum + tierActiveSubs[i][m - 1] * tier.price, 0) * (s.subRevenueMultiplier / 100)
    const addOnRevenue = (annualAddOn / 12) * rampFactor * growthFactor * (s.addOnRevenueMultiplier / 100)
    const totalRevenue = dealRevenue + subRevenue + addOnRevenue

    const dealsThisMonth = (s.dealsPerYear / 12) * rampFactor * (s.dealSuccessRate / 100) * growthFactor
    const cogs = dealsThisMonth * s.cogsPerDeal
    const monthlyDepreciation = s.capex.reduce((a, r) => a + calcMonthlyDep(r, m), 0)

    const grossProfit = totalRevenue - cogs
    const totalCosts = cogs + monthlySalary + monthlyOpex + monthlyDepreciation
    const ebit = totalRevenue - totalCosts
    const tax = ebit > 0 ? ebit * (s.taxRate / 100) : 0
    const netProfit = ebit - tax
    const cashFlow = netProfit + monthlyDepreciation // add back non-cash
    cumCash += cashFlow

    months.push({
      month: m,
      label: `M${m}`,
      dealRevenue,
      subRevenue,
      addOnRevenue,
      totalRevenue,
      cogs,
      grossProfit,
      salaries: monthlySalary,
      opex: monthlyOpex,
      depreciation: monthlyDepreciation,
      totalCosts,
      ebit,
      tax,
      netProfit,
      cashFlow,
      cumCash,
    })
  }
  return months
}

// ── Detailed Sales Forecast (Excel-style build-up) ──

export function calcDetailedForecast(s: Store): DetailedForecast {
  const categories: RevenueCategoryRow[] = []

  // 1. Deal Commissions category
  const commissionPerDeal = s.avgDealValue * (s.commissionRate / 100)
  const dealMonths: CategoryMonth[] = []
  for (let m = 1; m <= 24; m++) {
    const growthFactor = 1 + (s.revenueGrowthRate / 100) * ((m - 1) / 12)
    const rampFactor = Math.min(m / Math.max(s.dealRampUpMonths, 1), 1)
    const dealsThisMonth = (s.dealsPerYear / 12) * rampFactor * (s.dealSuccessRate / 100) * growthFactor
    dealMonths.push({
      units: dealsThisMonth,
      pricePerUnit: commissionPerDeal,
      total: dealsThisMonth * commissionPerDeal,
    })
  }
  const dealAnn1 = dealMonths.slice(0, 12).reduce((a, m) => a + m.total, 0)
  const dealAnn2 = dealMonths.slice(12).reduce((a, m) => a + m.total, 0)
  categories.push({ id: 'deals', name: 'Deal Commissions', type: 'deal', months: dealMonths, annual1: dealAnn1, annual2: dealAnn2 })

  // 2. Subscription tiers — each tier is its own category (per-tier churn model)
  for (const tier of s.subTiers) {
    const tierMonths: CategoryMonth[] = []
    let activeSubs = tier.subscribers
    for (let m = 1; m <= 24; m++) {
      if (m === 1) {
        activeSubs = tier.subscribers
      } else {
        activeSubs = activeSubs * (1 - tier.churnRate / 100) + tier.newSubsPerMonth
      }
      tierMonths.push({
        units: activeSubs,
        pricePerUnit: tier.price,
        total: activeSubs * tier.price * (s.subRevenueMultiplier / 100),
      })
    }
    const ann1 = tierMonths.slice(0, 12).reduce((a, m) => a + m.total, 0)
    const ann2 = tierMonths.slice(12).reduce((a, m) => a + m.total, 0)
    categories.push({ id: `sub-${tier.id}`, name: `Sub: ${tier.name}`, type: 'subscription', months: tierMonths, annual1: ann1, annual2: ann2 })
  }

  // 3. Add-on services — each is its own category
  for (const addon of s.addOns) {
    const addonMonths: CategoryMonth[] = []
    for (let m = 1; m <= 24; m++) {
      const growthFactor = 1 + (s.revenueGrowthRate / 100) * ((m - 1) / 12)
      const rampFactor = Math.min(m / Math.max(s.dealRampUpMonths, 1), 1)
      const unitsThisMonth = (addon.quantity / 12) * rampFactor * growthFactor
      addonMonths.push({
        units: unitsThisMonth,
        pricePerUnit: addon.price,
        total: unitsThisMonth * addon.price * (s.addOnRevenueMultiplier / 100),
      })
    }
    const ann1 = addonMonths.slice(0, 12).reduce((a, m) => a + m.total, 0)
    const ann2 = addonMonths.slice(12).reduce((a, m) => a + m.total, 0)
    categories.push({ id: `addon-${addon.id}`, name: addon.name, type: 'addon', months: addonMonths, annual1: ann1, annual2: ann2 })
  }

  // Monthly totals
  const monthlyTotals = Array.from({ length: 24 }, (_, i) =>
    categories.reduce((a, cat) => a + cat.months[i].total, 0)
  )
  const annual1Total = monthlyTotals.slice(0, 12).reduce((a, v) => a + v, 0)
  const annual2Total = monthlyTotals.slice(12).reduce((a, v) => a + v, 0)

  // Cost per month (salaries + opex + depreciation + COGS)
  const totalSalaryAnnual = s.salaries.reduce((a, r) => a + calcSalaryAnnual(r), 0)
  const monthlySalary = totalSalaryAnnual / 12
  const monthlyOpex = s.opex.reduce((a, r) => a + r.monthlyCost * r.quantity * (r.months / 12), 0)
  const fixedMonthlyCostBase = monthlySalary + monthlyOpex

  const monthlyCost: number[] = []
  const monthlyRevenue = monthlyTotals
  const monthlyProfit: number[] = []

  for (let m = 0; m < 24; m++) {
    const growthFactor = 1 + (s.revenueGrowthRate / 100) * (m / 12)
    const rampFactor = Math.min((m + 1) / Math.max(s.dealRampUpMonths, 1), 1)
    const dealsThisMonth = (s.dealsPerYear / 12) * rampFactor * (s.dealSuccessRate / 100) * growthFactor
    const cogs = dealsThisMonth * s.cogsPerDeal
    const monthlyDepreciation = s.capex.reduce((a, r) => a + calcMonthlyDep(r, m + 1), 0)
    const cost = fixedMonthlyCostBase + monthlyDepreciation + cogs
    monthlyCost.push(cost)
    monthlyProfit.push(monthlyRevenue[m] - cost)
  }

  // Accumulative (running sums)
  const totalCapex = s.capex.reduce((a, r) => a + r.cost, 0)
  const accumCost: number[] = []
  const accumRevenue: number[] = []
  const accumBudget: number[] = []
  let runCost = totalCapex // start with CAPEX as initial cost
  let runRev = 0
  for (let m = 0; m < 24; m++) {
    runCost += monthlyCost[m]
    runRev += monthlyRevenue[m]
    accumCost.push(runCost)
    accumRevenue.push(runRev)
    accumBudget.push(runRev - runCost)
  }

  return {
    categories,
    monthlyTotals,
    annual1Total,
    annual2Total,
    accumCost,
    accumRevenue,
    accumBudget,
    monthlyCost,
    monthlyRevenue,
    monthlyProfit,
  }
}

export function calcBreakevenMonth(forecast: MonthData[]): number | null {
  for (const m of forecast) {
    if (m.totalRevenue > m.totalCosts) return m.month
  }
  return null
}

export function calcCumBreakevenMonth(forecast: MonthData[]): number | null {
  for (const m of forecast) {
    if (m.cumCash > 0) return m.month
  }
  return null
}

export function calcPeakDeficit(forecast: MonthData[]): number {
  return Math.min(...forecast.map((m) => m.cumCash))
}
