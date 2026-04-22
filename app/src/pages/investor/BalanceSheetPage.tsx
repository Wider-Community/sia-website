import { DataTable } from "@/components/investor/DataTable";

const columns = [
  { key: "item", label: "Item" },
  { key: "q1", label: "Q1" },
  { key: "q2", label: "Q2" },
];

const rows = [
  { item: "Cash & Equivalents", q1: "$450K", q2: "$680K" },
  { item: "Accounts Receivable", q1: "$120K", q2: "$180K" },
  { item: "Total Current Assets", q1: "$570K", q2: "$860K" },
  { item: "Fixed Assets", q1: "$200K", q2: "$190K" },
  { item: "Total Assets", q1: "$770K", q2: "$1.05M" },
  { item: "Accounts Payable", q1: "$80K", q2: "$95K" },
  { item: "Total Liabilities", q1: "$280K", q2: "$320K" },
];

const totalRow = { item: "Total Equity", q1: "$490K", q2: "$730K" };

export function BalanceSheetPage() {
  return (<div className="space-y-8"><div className="section-label">Balance Sheet</div><DataTable columns={columns} rows={rows} totalRow={totalRow} /></div>);
}
