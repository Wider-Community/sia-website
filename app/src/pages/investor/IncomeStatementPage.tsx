import { DataTable } from "@/components/investor/DataTable";

const columns = [
  { key: "item", label: "Item" },
  { key: "m1", label: "Month 1" },
  { key: "m2", label: "Month 2" },
  { key: "m3", label: "Month 3" },
  { key: "m4", label: "Month 4" },
  { key: "m5", label: "Month 5" },
  { key: "m6", label: "Month 6" },
];

const rows = [
  { item: "Revenue", m1: "$120K", m2: "$150K", m3: "$180K", m4: "$200K", m5: "$240K", m6: "$280K" },
  { item: "COGS", m1: "$36K", m2: "$45K", m3: "$54K", m4: "$60K", m5: "$72K", m6: "$84K" },
  { item: "Gross Profit", m1: "$84K", m2: "$105K", m3: "$126K", m4: "$140K", m5: "$168K", m6: "$196K" },
  { item: "Operating Expenses", m1: "$44K", m2: "$40K", m3: "$36K", m4: "$35K", m5: "$28K", m6: "$26K" },
  { item: "EBITDA", m1: "$40K", m2: "$65K", m3: "$90K", m4: "$105K", m5: "$140K", m6: "$170K" },
];

const totalRow = { item: "Net Income", m1: "$32K", m2: "$52K", m3: "$72K", m4: "$84K", m5: "$112K", m6: "$136K" };

export function IncomeStatementPage() {
  return (<div className="space-y-8"><div className="section-label">Income Statement</div><DataTable columns={columns} rows={rows} totalRow={totalRow} /></div>);
}
