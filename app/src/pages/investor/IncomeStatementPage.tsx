import { useMemo } from 'react'
import { useStore, calcMonthlyForecast, type MonthData } from '@/stores/financialModel'

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function IncomeStatementPage() {
  const store = useStore()
  const forecast = useMemo(() => calcMonthlyForecast(store), [store])
  const y1 = forecast.slice(0, 12)

  const sum = (accessor: (m: MonthData) => number) =>
    y1.reduce((a, m) => a + accessor(m), 0)

  const rows: {
    label: string
    accessor: (m: MonthData) => number
    bold?: boolean
    rowTotal?: boolean
    colorBySign?: boolean
  }[] = [
    { label: 'Deal Revenue', accessor: (m) => m.dealRevenue },
    { label: 'Subscription Revenue', accessor: (m) => m.subRevenue },
    { label: 'Add-on Revenue', accessor: (m) => m.addOnRevenue },
    { label: 'Total Revenue', accessor: (m) => m.totalRevenue, bold: true },
    { label: 'COGS', accessor: (m) => m.cogs },
    { label: 'Gross Profit', accessor: (m) => m.grossProfit, bold: true },
    { label: 'Salaries', accessor: (m) => m.salaries },
    { label: 'Operating Expenses', accessor: (m) => m.opex },
    { label: 'Depreciation', accessor: (m) => m.depreciation },
    { label: 'Total Costs', accessor: (m) => m.totalCosts, bold: true, rowTotal: true },
    { label: 'EBIT', accessor: (m) => m.ebit, bold: true },
    { label: 'Tax', accessor: (m) => m.tax },
    { label: 'Net Profit', accessor: (m) => m.netProfit, bold: true, rowTotal: true, colorBySign: true },
  ]

  return (
    <div className="space-y-8">
      <div className="section-label">Income Statement</div>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="fin-table">
            <thead>
              <tr>
                <th>Line Item</th>
                {y1.map((m) => (
                  <th key={m.month}>{m.label}</th>
                ))}
                <th>Y1 Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const total = sum(row.accessor)
                return (
                  <tr
                    key={row.label}
                    className={row.rowTotal ? 'row-total' : undefined}
                  >
                    <td style={{ fontWeight: row.bold ? 700 : undefined }}>
                      {row.label}
                    </td>
                    {y1.map((m) => {
                      const val = row.accessor(m)
                      return (
                        <td
                          key={m.month}
                          style={{
                            fontWeight: row.bold ? 700 : undefined,
                            color: row.colorBySign
                              ? val < 0
                                ? 'var(--danger)'
                                : 'var(--success, green)'
                              : val < 0
                                ? 'var(--danger)'
                                : undefined,
                          }}
                        >
                          {fmt(val)}
                        </td>
                      )
                    })}
                    <td
                      style={{
                        fontWeight: row.bold ? 700 : undefined,
                        color: row.colorBySign
                          ? total < 0
                            ? 'var(--danger)'
                            : 'var(--success, green)'
                          : total < 0
                            ? 'var(--danger)'
                            : undefined,
                      }}
                    >
                      {fmt(total)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
