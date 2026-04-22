import { useMemo } from 'react'
import { useStore, calcMonthlyForecast, calcMonthlyDep } from '@/stores/financialModel'

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function BalanceSheetPage() {
  const store = useStore()
  const forecast = useMemo(() => calcMonthlyForecast(store), [store])

  const totalCapex = store.capex.reduce((a, r) => a + r.cost, 0)

  const accumDepY1 = store.capex.reduce(
    (a, r) => a + Array.from({ length: 12 }, (_, i) => calcMonthlyDep(r, i + 1)).reduce((s, v) => s + v, 0),
    0
  )
  const accumDepY2 = store.capex.reduce(
    (a, r) => a + Array.from({ length: 24 }, (_, i) => calcMonthlyDep(r, i + 1)).reduce((s, v) => s + v, 0),
    0
  )

  const openingCash = store.startingCash
  const y1Cash = forecast[11].cumCash
  const y2Cash = forecast[23].cumCash

  const nfaY1 = totalCapex - accumDepY1
  const nfaY2 = totalCapex - accumDepY2

  const totalAssetsOpening = openingCash // no fixed assets purchased yet at opening
  const totalAssetsY1 = y1Cash + nfaY1
  const totalAssetsY2 = y2Cash + nfaY2

  const retainedY1 = forecast.slice(0, 12).reduce((a, m) => a + m.netProfit, 0)
  const retainedY2 = forecast.reduce((a, m) => a + m.netProfit, 0)

  const rows: {
    label: string
    opening: number
    y1: number
    y2: number
    bold?: boolean
    rowTotal?: boolean
  }[] = [
    { label: 'Cash', opening: openingCash, y1: y1Cash, y2: y2Cash },
    { label: 'Net Fixed Assets', opening: 0, y1: nfaY1, y2: nfaY2 },
    { label: 'Total Assets', opening: totalAssetsOpening, y1: totalAssetsY1, y2: totalAssetsY2, bold: true, rowTotal: true },
    { label: 'Retained Earnings', opening: 0, y1: retainedY1, y2: retainedY2 },
    { label: 'Total Equity', opening: 0, y1: retainedY1, y2: retainedY2, bold: true, rowTotal: true },
  ]

  return (
    <div className="space-y-8">
      <div className="section-label">Balance Sheet</div>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="fin-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Opening</th>
                <th>End of Y1</th>
                <th>End of Y2</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className={row.rowTotal ? 'row-total' : undefined}>
                  <td style={{ fontWeight: row.bold ? 700 : undefined }}>{row.label}</td>
                  {[row.opening, row.y1, row.y2].map((val, i) => (
                    <td
                      key={i}
                      style={{
                        fontWeight: row.bold ? 700 : undefined,
                        color: val < 0 ? 'var(--danger)' : undefined,
                      }}
                    >
                      {fmt(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
