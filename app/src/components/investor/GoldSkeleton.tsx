import { cn } from "@/lib/utils";

interface GoldSkeletonProps {
  className?: string;
  lines?: number;
}

export function GoldSkeleton({ className, lines = 3 }: GoldSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton-gold h-4" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  );
}
