import { X } from "phosphor-react";
import type { CSSProperties } from "react";
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
    ? "kodeks-library-badge inline-flex size-7 shrink-0 items-center justify-center rounded-lg shadow-sm"
    : "kodeks-library-badge inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold leading-none shadow-sm";

  const badgeStyle = {
    "--library-accent": color,
  } as CSSProperties;

  const content = (
    <>
      <span
        className={
          compact
            ? "kodeks-library-badge-icon inline-grid place-items-center"
            : "kodeks-library-badge-icon inline-grid size-5 shrink-0 place-items-center rounded-md"
        }
        aria-hidden="true"
      >
        {renderLibraryIcon(icon, compact ? 15 : 14)}
      </span>
      {!compact && (
        <span
          className="kodeks-library-badge-accent h-4 w-0.5 shrink-0 rounded-full"
          aria-hidden="true"
        />
      )}
      {!compact && <span className="truncate">{name}</span>}
      {!compact && onRemove && (
        <span
          className="kodeks-library-badge-remove ml-0.5 inline-grid size-4 shrink-0 place-items-center rounded"
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
        className={`${classes} transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer`}
        style={badgeStyle}
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
      style={badgeStyle}
      title={name}
    >
      {content}
    </span>
  );
}
