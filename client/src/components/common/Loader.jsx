
import { LoaderCircle } from "lucide-react";

export default function Loader({
  label = "Loading...",
  fullPage = false,
  size = "md",
  className = "",
}) {
  const iconSizes = {
    sm: 18,
    md: 28,
    lg: 40,
  };

  const iconSize = iconSizes[size] ?? iconSizes.md;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "flex flex-col items-center justify-center gap-3",
        fullPage ? "min-h-screen" : "min-h-40 py-10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <LoaderCircle
        size={iconSize}
        aria-hidden="true"
        className="animate-spin text-violet-600"
      />

      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <span className="sr-only">Please wait</span>
    </div>
  );
}
