
import { Search, X } from "lucide-react";

export default function SearchInput({
  value = "",
  onChange,
  placeholder = "Search...",
  className = "",
  disabled = false,
  onClear,
  name = "search",
  id,
}) {
  const handleClear = () => {
    onChange?.("");
    onClear?.();
  };

  return (
    <div
      className={[
        "relative flex w-full items-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Search
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 shrink-0 text-slate-400"
      />

      <input
        id={id}
        name={name}
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-label={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"
      />

      {value.length > 0 && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
