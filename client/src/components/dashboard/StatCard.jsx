
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

const toneStyles = {
  violet: {
    icon: "bg-violet-50 text-violet-600",
    accent: "bg-violet-500",
  },
  blue: {
    icon: "bg-sky-50 text-sky-600",
    accent: "bg-sky-500",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-600",
    accent: "bg-emerald-500",
  },
  orange: {
    icon: "bg-orange-50 text-orange-600",
    accent: "bg-orange-500",
  },
  pink: {
    icon: "bg-pink-50 text-pink-600",
    accent: "bg-pink-500",
  },
};

export default function StatCard({
  label = "Statistic",
  value = 0,
  sub = "",
  icon: Icon,
  tone = "violet",
  change,
  changeLabel = "vs. previous period",
}) {
  const styles = toneStyles[tone] ?? toneStyles.violet;
  const hasChange = change !== undefined && change !== null;
  const numericChange = Number(change);
  const isPositive = numericChange > 0;
  const isNegative = numericChange < 0;

  const formattedValue =
    typeof value === "number"
      ? value.toLocaleString()
      : value ?? 0;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {formattedValue}
          </p>
        </div>

        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
        >
          {Icon ? (
            <Icon size={23} strokeWidth={1.9} aria-hidden="true" />
          ) : (
            <Minus size={23} aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="mt-4 flex min-h-5 flex-wrap items-center gap-1.5">
        {hasChange && Number.isFinite(numericChange) && (
          <span
            className={[
              "inline-flex items-center gap-0.5 text-xs font-semibold",
              isPositive
                ? "text-emerald-600"
                : isNegative
                  ? "text-rose-600"
                  : "text-slate-500",
            ].join(" ")}
          >
            {isPositive ? (
              <ArrowUpRight size={15} aria-hidden="true" />
            ) : isNegative ? (
              <ArrowDownRight size={15} aria-hidden="true" />
            ) : (
              <Minus size={14} aria-hidden="true" />
            )}

            {Math.abs(numericChange)}%
          </span>
        )}

        {sub && (
          <p className="text-xs leading-5 text-slate-500">
            {sub}
            {hasChange ? ` · ${changeLabel}` : ""}
          </p>
        )}
      </div>
    </article>
  );
}
