"use client";

export function ServerErrorToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-[70] flex items-center gap-3 rounded-[10px] border border-rule bg-paper px-4 py-2.5 text-[12px] text-ink shadow-card">
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-faint transition-colors hover:text-ink"
        aria-label="dismiss"
      >
        ×
      </button>
    </div>
  );
}
