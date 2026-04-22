import { DataTable } from "@/components/investor/DataTable";

const columns = [
  { key: "item", label: "Item" },
  { key: "m1", label: "Month 1" },
  { key: "m2", label: "Month 2" },
  { key: "m3", label: "Month 3" },
];

const rows = [
  { item: "Operating Cash Flow", m1: "$38K", m2: "$60K", m3: "$85K" },
  { item: "Investing Cash Flow", m1: "-$15K", m2: "-$10K", m3: "-$8K" },
  { item: "Financing Cash Flow", m1: "$0", m2: "$0", m3: "$0" },
];

const totalRow = { item: "Net Cash Flow", m1: "$23K", m2: "$50K", m3: "$77K" };

export function CashFlowPage() {
  return (<div className="space-y-8"><div className="section-label">Cash Flow Statement</div><DataTable columns={columns} rows={rows} totalRow={totalRow} /></div>);
}
