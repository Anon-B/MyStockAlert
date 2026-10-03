import type { ReactNode } from "react";

type Tone = "positive" | "negative" | "warning" | "info" | "pending" | "cancelled" | "neutral";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <article className={`ms-card ${className}`}>{children}</article>;
}

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  tone?: Tone;
}) {
  return (
    <Card className="ms-card-body ms-stat-card">
      <div className="ms-caption ms-text-muted">{label}</div>
      <div className={`ms-stat-value ms-financial-mono ${tone !== "neutral" ? `ms-${tone}` : ""}`}>
        {value}
      </div>
      {sub && <div className="ms-body-sm ms-text-secondary">{sub}</div>}
    </Card>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
  stale = false,
}: {
  children: ReactNode;
  tone?: Tone;
  stale?: boolean;
}) {
  return (
    <span className={`ms-status-badge ${stale ? "warning" : tone}`}>
      {stale ? "⚠ " : ""}
      {children}
    </span>
  );
}

export function MarketBadge({ market }: { market: "TH" | "US" | string }) {
  return <span className="ms-market-badge">{market}</span>;
}

export function FinancialValue({
  value,
  tone = "neutral",
  className = "",
}: {
  value: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={`ms-financial-mono ${tone !== "neutral" ? `ms-${tone}` : ""} ${className}`}>
      {value}
    </span>
  );
}

export function Skeleton({
  width = "100%",
  height = 16,
  className = "",
}: {
  width?: string;
  height?: number;
  className?: string;
}) {
  return (
    <span
      className={`ms-skeleton ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
