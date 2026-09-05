import type { ReactNode, ElementType } from "react";

export function cn(...x: unknown[]) {
  return x.filter(Boolean).map(String).join(" ");
}

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: string }) {
  return <span className={cn("badge", `badge-${tone}`)}>{children}</span>;
}

export function Spark({ color = "#77a7ff" }: { color?: string }) {
  return (
    <svg width="76" height="32" viewBox="0 0 76 32">
      <path
        d="M1 26 L10 20 L18 23 L28 12 L38 18 L49 9 L58 16 L67 4 L75 10"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Stat({
  icon: Icon,
  label,
  value,
  delta,
  color = "#3378f6",
  sub,
}: {
  icon: ElementType;
  label: string;
  value: string;
  delta: string;
  color?: string;
  sub: string;
}) {
  return (
    <div className="stat">
      <div className="stat-icon" style={{ background: `${color}16`, color }}>
        <Icon size={18} />
      </div>
      <div>
        <div className="eyebrow">{label}</div>
        <div className="stat-value">
          {value}
          {delta && <span className="up">↗ {delta}</span>}
        </div>
        <div className="subtle">{sub}</div>
      </div>
      <Spark color={color} />
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow blue-text">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      {action}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      <div className="section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
