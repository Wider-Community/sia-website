import { type ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="glass-card p-6">
      <div className="section-label mb-4">{title}</div>
      {children}
    </div>
  );
}
