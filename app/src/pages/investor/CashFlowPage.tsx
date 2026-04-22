import { useMemo } from 'react'
import { useStore, calcMonthlyForecast, type MonthData } from '@/stores/financialModel'

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function CashFlowPage() {
  const store = useStore()
  const forecast = useMemo(() => calcMonthlyForecast(store), [store])
  const y1 = forecast.slice(0, 12)

  // CapEx by month: each capex item hits in its purchaseMonth
  const capexByMonth = useMemo(() => {
    const arr = new Array(12).fill(0)
    for (const item of store.capex) {
      if (item.purchaseMonth >= 1 && item.purchaseMonth <= 12) {
        arr[item.purchaseMonth - 1] += item.cost
      }
    }
    return arr
  }, [store.capex])

  const sumCol = (accessor: (m: MonthData, i: number) => number) =>
    y1.reduce((a, m, i) => a + accessor(m, i), 0)

  type RowDef = {
    label: string
    values: (m: MonthData, i: number) => number
    bold?: boolean
    rowTotal?: boolean
    isSectionHeader?: boolean
  }

  const rows: RowDef[] = [
    { label: 'Operating Activities', values: () => 0, isSectionHeader: true },
    { label: 'Net Profit', values: (m) => m.netProfit },
    { label: 'Add: Depreciation', values: (m) => m.depreciation },
    { label: 'Operating Cash Flow', values: (m) => m.netProfit + m.depreciation, bold: true },
    { label: 'Investing Activities', values: () => 0, isSectionHeader: true },
    { label: 'CapEx Purchases', values: (_m, i) => -capexByMonth[i] },
    { label: 'Investing Cash Flow', values: (_m, i) => -capexByMonth[i], bold: true },
    { label: 'Net Cash Flow', values: (m, i) => m.netProfit + m.depreciation - capexByMonth[i], bold: true, rowTotal: true },
    { label: 'Cumulative Cash', values: (m) => m.cumCash, bold: true },
  ]

  return (
    <div className="space-y-8">
      <div className="section-label">Cash Flow Statement</div>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="fin-table">
            <thead>
              <tr>
                <th>Item</th>
                {y1.map((m) => (
                  <th key={m.month}>{m.label}</th>
                ))}
                <th>Y1 Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                if (row.isSectionHeader) {
                  return (
                    <tr key={row.label}>
                      <td
                        colSpan={14}
                        style={{
                          fontWeight: 700,
                          paddingTop: '1rem',
                          opacity: 0.7,
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {row.label}
                      </td>
                    </tr>
                  )
                }

                const total = sumCol(row.values)
                return (
                  <tr key={row.label} className={row.rowTotal ? 'row-total' : undefined}>
                    <td style={{ fontWeight: row.bold ? 700 : undefined }}>{row.label}</td>
                    {y1.map((m, i) => {
                      const val = row.values(m, i)
                      return (
                        <td
                          key={m.month}
                          style={{
                            fontWeight: row.bold ? 700 : undefined,
                            color: val < 0 ? 'var(--danger)' : undefined,
                          }}
                        >
                          {fmt(val)}
                        </td>
                      )
                    })}
                    <td
                      style={{
                        fontWeight: row.bold ? 700 : undefined,
                        color: total < 0 ? 'var(--danger)' : undefined,
                      }}
                    >
                      {row.label === 'Cumulative Cash' ? fmt(y1[11].cumCash) : fmt(total)}
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
