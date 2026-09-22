import { X } from "phosphor-react";
import { renderLibraryIcon } from "../utils/iconRenderer";

interface LibraryBadgeProps {
  name: string;
  color?: string;
  icon?: string;
  compact?: boolean;
  onRemove?: () => void;
}

export default function LibraryBadge({
  name,
  color = "#3B82F6",
  icon = "BK",
  compact = false,
  onRemove,
}: LibraryBadgeProps) {
  const classes = compact
    ? "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-white shadow-sm ring-1 ring-white/10"
    : "inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] font-semibold leading-none text-white shadow-sm ring-1 ring-white/10";

  const content = (
    <>
      <span
        className={
          compact
            ? "inline-grid place-items-center"
            : "inline-grid size-5 shrink-0 place-items-center rounded-md bg-black/10"
        }
        aria-hidden="true"
      >
        {renderLibraryIcon(icon, compact ? 15 : 14)}
      </span>
      {!compact && <span className="truncate">{name}</span>}
      {!compact && onRemove && (
        <span
          className="ml-0.5 inline-grid size-4 shrink-0 place-items-center rounded bg-black/10"
          aria-hidden="true"
        >
          <X size={11} weight="bold" />
        </span>
      )}
    </>
  );

  if (onRemove) {
    return (
      <button
        type="button"
        onClick={onRemove}
        className={`${classes} transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer`}
        style={{ backgroundColor: color }}
        title={`Retirer de ${name}`}
        aria-label={`Retirer de ${name}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={classes}
      style={{ backgroundColor: color }}
      title={name}
    >
      {content}
    </span>
  );
}
