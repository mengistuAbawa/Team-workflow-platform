
import { LoaderCircle } from "lucide-react";

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary:
    "bg-violet-600 text-white shadow-sm hover:bg-violet-700 active:bg-violet-800",

  secondary:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300",

  outline:
    "border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700",

  danger:
    "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800",

  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",

  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
};

const sizes = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
  icon: "size-10 p-2",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  disabled = false,
  fullWidth = false,
  className = "",
  onClick,
  ...props
}) {
  const variantStyles = variants[variant] ?? variants.primary;
  const sizeStyles = sizes[size] ?? sizes.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        baseStyles,
        variantStyles,
        sizeStyles,
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading && (
        <LoaderCircle
          size={17}
          aria-hidden="true"
          className="shrink-0 animate-spin"
        />
      )}

      {children}
    </button>
  );
}
