import { useStore, calcDetailedForecast } from '@/stores/financialModel'

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function SalesForecastPage() {
  const store = useStore()
  const forecast = calcDetailedForecast(store)

  return (
    <div className="space-y-8">
      <div className="section-label">Sales Forecast</div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card-accent p-6">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            Y1 Revenue Total
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            {fmt(forecast.annual1Total)}
          </div>
        </div>
        <div className="glass-card-accent p-6">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            Y2 Revenue Total
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            {fmt(forecast.annual2Total)}
          </div>
        </div>
      </div>

      {/* Forecast Table */}
      <div className="glass-card p-6 overflow-x-auto">
        <table className="fin-table" style={{ minWidth: '1200px' }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10" style={{ background: 'var(--surface)' }}>Category</th>
              {Array.from({ length: 12 }, (_, i) => (
                <th key={i}>M{i + 1}</th>
              ))}
              <th>Y1 Total</th>
            </tr>
          </thead>
          <tbody>
            {forecast.categories.map((cat) => (
              <tr key={cat.id}>
                <td
                  className="sticky left-0 z-10 font-medium whitespace-nowrap"
                  style={{ background: 'var(--surface)' }}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{
                      background:
                        cat.type === 'deal'
                          ? '#c8a951'
                          : cat.type === 'subscription'
                            ? '#6ec1e4'
                            : '#a78bfa',
                    }}
                  />
                  {cat.name}
                </td>
                {cat.months.slice(0, 12).map((m, i) => (
                  <td key={i} style={{ color: 'var(--text-secondary)' }}>
                    {fmt(m.total)}
                  </td>
                ))}
                <td className="font-semibold" style={{ color: 'var(--text)' }}>
                  {fmt(cat.annual1)}
                </td>
              </tr>
            ))}

            {/* Monthly Total */}
            <tr className="row-total">
              <td
                className="sticky left-0 z-10 font-bold"
                style={{ background: 'var(--surface)', color: 'var(--text)' }}
              >
                Monthly Total
              </td>
              {forecast.monthlyTotals.slice(0, 12).map((t, i) => (
                <td key={i} className="font-bold" style={{ color: 'var(--text)' }}>
                  {fmt(t)}
                </td>
              ))}
              <td className="font-bold" style={{ color: 'var(--accent)' }}>
                {fmt(forecast.annual1Total)}
              </td>
            </tr>

            {/* Monthly Cost */}
            <tr>
              <td
                className="sticky left-0 z-10 font-medium"
                style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}
              >
                Monthly Cost
              </td>
              {forecast.monthlyCost.slice(0, 12).map((c, i) => (
                <td key={i} style={{ color: 'var(--text-secondary)' }}>
                  {fmt(c)}
                </td>
              ))}
              <td style={{ color: 'var(--text-secondary)' }}>
                {fmt(forecast.monthlyCost.slice(0, 12).reduce((a, v) => a + v, 0))}
              </td>
            </tr>

            {/* Monthly Profit */}
            <tr>
              <td
                className="sticky left-0 z-10 font-medium"
                style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}
              >
                Monthly Profit
              </td>
              {forecast.monthlyProfit.slice(0, 12).map((p, i) => (
                <td key={i} style={{ color: p >= 0 ? '#4ade80' : '#f87171' }}>
                  {fmt(p)}
                </td>
              ))}
              <td
                className="font-semibold"
                style={{
                  color:
                    forecast.monthlyProfit.slice(0, 12).reduce((a, v) => a + v, 0) >= 0
                      ? '#4ade80'
                      : '#f87171',
                }}
              >
                {fmt(forecast.monthlyProfit.slice(0, 12).reduce((a, v) => a + v, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
