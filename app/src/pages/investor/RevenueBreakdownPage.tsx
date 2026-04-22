import { useStore, calcTierSubsAtMonth } from '@/stores/financialModel'

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const inputCls = 'bg-transparent border border-[var(--border)] rounded px-2 py-1 text-sm emissive-focus text-[var(--text)]'

export function RevenueBreakdownPage() {
  const subTiers = useStore((s) => s.subTiers)
  const addOns = useStore((s) => s.addOns)
  const addSubTier = useStore((s) => s.addSubTier)
  const removeSubTier = useStore((s) => s.removeSubTier)
  const updateSubTier = useStore((s) => s.updateSubTier)
  const addAddOn = useStore((s) => s.addAddOn)
  const removeAddOn = useStore((s) => s.removeAddOn)
  const updateAddOn = useStore((s) => s.updateAddOn)

  // KPIs
  const totalMRR12 = subTiers.reduce((sum, tier) => sum + calcTierSubsAtMonth(tier, 12) * tier.price, 0)
  const annualAddOnRevenue = addOns.reduce((sum, a) => sum + a.price * a.quantity, 0)

  return (
    <div className="space-y-8">
      <div className="section-label">Revenue Breakdown</div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card-accent p-6">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            Total Subscription MRR (Month 12)
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            {fmt(totalMRR12)}
          </div>
        </div>
        <div className="glass-card-accent p-6">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            Annual Add-on Revenue
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            {fmt(annualAddOnRevenue)}
          </div>
        </div>
      </div>

      {/* Subscription Tiers */}
      <div className="glass-card p-6 overflow-x-auto">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
          Subscription Tiers
        </h3>
        <table className="fin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price/mo</th>
              <th>Starting Subs</th>
              <th>Churn %/mo</th>
              <th>New Subs/mo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {subTiers.map((tier) => (
              <tr key={tier.id}>
                <td>
                  <input
                    className={inputCls}
                    type="text"
                    value={tier.name}
                    onChange={(e) => updateSubTier(tier.id, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className={`${inputCls} w-24`}
                    type="number"
                    min={0}
                    value={tier.price}
                    onChange={(e) => updateSubTier(tier.id, { price: +e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className={`${inputCls} w-20`}
                    type="number"
                    min={0}
                    value={tier.subscribers}
                    onChange={(e) => updateSubTier(tier.id, { subscribers: +e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className={`${inputCls} w-20`}
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={tier.churnRate}
                    onChange={(e) => updateSubTier(tier.id, { churnRate: +e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className={`${inputCls} w-20`}
                    type="number"
                    min={0}
                    value={tier.newSubsPerMonth}
                    onChange={(e) => updateSubTier(tier.id, { newSubsPerMonth: +e.target.value })}
                  />
                </td>
                <td>
                  <button
                    onClick={() => removeSubTier(tier.id)}
                    className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                    title="Delete"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addSubTier}
        className="px-4 py-2 rounded text-sm font-medium border border-[var(--accent)] hover:bg-[var(--accent)]/10 transition"
        style={{ color: 'var(--accent)' }}
      >
        + Add Tier
      </button>

      {/* Add-on Services */}
      <div className="glass-card p-6 overflow-x-auto">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
          Add-on Services
        </h3>
        <table className="fin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Quantity/yr</th>
              <th>Annual</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {addOns.map((addon) => (
              <tr key={addon.id}>
                <td>
                  <input
                    className={inputCls}
                    type="text"
                    value={addon.name}
                    onChange={(e) => updateAddOn(addon.id, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className={`${inputCls} w-24`}
                    type="number"
                    min={0}
                    value={addon.price}
                    onChange={(e) => updateAddOn(addon.id, { price: +e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className={`${inputCls} w-20`}
                    type="number"
                    min={0}
                    value={addon.quantity}
                    onChange={(e) => updateAddOn(addon.id, { quantity: +e.target.value })}
                  />
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {fmt(addon.price * addon.quantity)}
                </td>
                <td>
                  <button
                    onClick={() => removeAddOn(addon.id)}
                    className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                    title="Delete"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
            <tr className="row-total">
              <td colSpan={3} className="text-right font-semibold" style={{ color: 'var(--text)' }}>
                Total
              </td>
              <td className="font-bold" style={{ color: 'var(--accent)' }}>{fmt(annualAddOnRevenue)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <button
        onClick={addAddOn}
        className="px-4 py-2 rounded text-sm font-medium border border-[var(--accent)] hover:bg-[var(--accent)]/10 transition"
        style={{ color: 'var(--accent)' }}
      >
        + Add Add-on
      </button>
    </div>
  )
}
