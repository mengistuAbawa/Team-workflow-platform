
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Modal({
  isOpen = false,
  onClose,
  title = "Dialog",
  description,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
  showCloseButton = true,
  className = "",
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-6xl",
  };

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget && closeOnOverlay) {
      onClose?.();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={handleOverlayClick}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="teamflow-modal-title"
        aria-describedby={
          description ? "teamflow-modal-description" : undefined
        }
        className={[
          "my-auto w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl",
          sizes[size] ?? sizes.md,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h2
              id="teamflow-modal-title"
              className="text-lg font-bold tracking-tight text-slate-900"
            >
              {title}
            </h2>

            {description && (
              <p
                id="teamflow-modal-description"
                className="mt-1 text-sm leading-6 text-slate-500"
              >
                {description}
              </p>
            )}
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
            >
              <X size={19} aria-hidden="true" />
            </button>
          )}
        </header>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            {footer}
          </footer>
        )}
      </section>
    </div>,
    document.body
  );
}
