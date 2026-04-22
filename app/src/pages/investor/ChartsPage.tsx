import { useMemo } from 'react'
import { useStore, calcMonthlyForecast } from '@/stores/financialModel'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts'

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const GOLD = '#c8a951'
const BLUE = '#6ec1e4'
const PURPLE = '#a78bfa'
const GREEN = '#4ade80'
const RED = '#f87171'

const tooltipStyle = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: 12,
  },
  labelStyle: { color: 'var(--text-secondary)' },
}

export function ChartsPage() {
  const store = useStore()
  const forecast = useMemo(() => calcMonthlyForecast(store), [store])

  // Revenue vs Cost bar data
  const barData = forecast.map((m, i) => ({
    label: i % 2 === 0 ? m.label : '',
    month: m.label,
    revenue: Math.round(m.totalRevenue),
    costs: Math.round(m.totalCosts),
  }))

  // Cumulative cash line data
  const cumCashData = forecast.map((m, i) => ({
    label: i % 2 === 0 ? m.label : '',
    month: m.label,
    cumCash: Math.round(m.cumCash),
  }))

  // Revenue mix pie (Y1)
  const y1 = forecast.slice(0, 12)
  const dealTotal = y1.reduce((a, m) => a + m.dealRevenue, 0)
  const subTotal = y1.reduce((a, m) => a + m.subRevenue, 0)
  const addonTotal = y1.reduce((a, m) => a + m.addOnRevenue, 0)
  const pieData = [
    { name: 'Deal Commissions', value: Math.round(dealTotal), color: GOLD },
    { name: 'Subscriptions', value: Math.round(subTotal), color: BLUE },
    { name: 'Add-ons', value: Math.round(addonTotal), color: PURPLE },
  ]

  // Monthly P/L bar data
  const plData = forecast.map((m, i) => ({
    label: i % 2 === 0 ? m.label : '',
    month: m.label,
    profit: Math.round(m.netProfit),
    fill: m.netProfit >= 0 ? GREEN : RED,
  }))

  return (
    <div className="space-y-8">
      <div className="section-label">Charts</div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Revenue vs Costs */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
            Revenue vs Costs
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => fmt(value)}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.month ?? ''}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Bar dataKey="revenue" name="Revenue" fill={GOLD} radius={[2, 2, 0, 0]} />
              <Bar dataKey="costs" name="Costs" fill="var(--text-tertiary)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Cumulative Cash */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
            Cumulative Cash Position
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumCashData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => fmt(value)}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.month ?? ''}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="cumCash"
                name="Cumulative Cash"
                stroke={GOLD}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: GOLD }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Revenue Mix Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
            Y1 Revenue Mix
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: 'var(--text-tertiary)' }}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => fmt(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Monthly Profit/Loss */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
            Monthly Profit / Loss
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={plData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => fmt(value)}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.month ?? ''}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
              <Bar dataKey="profit" name="Net Profit">
                {plData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
