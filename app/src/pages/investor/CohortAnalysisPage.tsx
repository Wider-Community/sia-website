import { useStore, calcTierSubsAtMonth } from '@/stores/financialModel'

const numFmt = (n: number) => Math.round(n).toLocaleString()

export function CohortAnalysisPage() {
  const subTiers = useStore((s) => s.subTiers)

  // Total active subs at M12
  const totalM12 = subTiers.reduce((sum, tier) => sum + calcTierSubsAtMonth(tier, 12), 0)

  // Weighted average churn
  const totalSubs = subTiers.reduce((sum, tier) => sum + tier.subscribers, 0)
  const weightedChurn = totalSubs > 0
    ? subTiers.reduce((sum, tier) => sum + tier.churnRate * tier.subscribers, 0) / totalSubs
    : 0

  return (
    <div className="space-y-8">
      <div className="section-label">Cohort Analysis</div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card-accent p-6">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            Total Active Subs at M12
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            {numFmt(totalM12)}
          </div>
        </div>
        <div className="glass-card-accent p-6">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            Weighted Average Churn
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            {weightedChurn.toFixed(1)}%/mo
          </div>
        </div>
      </div>

      {/* Cohort tables per tier */}
      {subTiers.map((tier) => {
        const months = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          subs: calcTierSubsAtMonth(tier, i + 1),
        }))
        const startSubs = tier.subscribers

        return (
          <div key={tier.id} className="glass-card p-6 overflow-x-auto">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
              {tier.name} Tier — {tier.churnRate}% churn/mo, +{tier.newSubsPerMonth} new/mo
            </h3>
            <table className="fin-table" style={{ minWidth: '800px' }}>
              <thead>
                <tr>
                  <th>Metric</th>
                  {months.map((m) => (
                    <th key={m.month}>M{m.month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium whitespace-nowrap" style={{ color: 'var(--text)' }}>
                    Active Subscribers
                  </td>
                  {months.map((m) => {
                    const growing = m.subs >= startSubs
                    return (
                      <td
                        key={m.month}
                        style={{
                          color: growing ? '#4ade80' : '#f87171',
                          fontWeight: 600,
                        }}
                      >
                        {numFmt(m.subs)}
                      </td>
                    )
                  })}
                </tr>
                <tr>
                  <td className="font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    vs Starting
                  </td>
                  {months.map((m) => {
                    const delta = m.subs - startSubs
                    const pct = startSubs > 0 ? (delta / startSubs) * 100 : 0
                    return (
                      <td
                        key={m.month}
                        style={{ color: delta >= 0 ? '#4ade80' : '#f87171', fontSize: '0.75rem' }}
                      >
                        {delta >= 0 ? '+' : ''}{pct.toFixed(1)}%
                      </td>
                    )
                  })}
                </tr>
                <tr>
                  <td className="font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    MRR
                  </td>
                  {months.map((m) => (
                    <td key={m.month} style={{ color: 'var(--text-secondary)' }}>
                      ${Math.round(m.subs * tier.price).toLocaleString()}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
