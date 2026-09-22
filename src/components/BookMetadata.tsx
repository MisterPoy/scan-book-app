import {
  Book,
  Books,
  Check,
  Circle,
  Clock,
  DeviceMobile,
  Headphones,
  X,
} from "phosphor-react";

export type ReadingStatus =
  | "lu"
  | "non_lu"
  | "a_lire"
  | "en_cours"
  | "abandonne";

export type BookType = "physique" | "numerique" | "audio";

const READING_STATUS_OPTIONS: Array<{
  value: ReadingStatus;
  label: string;
}> = [
  { value: "non_lu", label: "Non lu" },
  { value: "a_lire", label: "À lire" },
  { value: "en_cours", label: "En cours" },
  { value: "lu", label: "Lu" },
  { value: "abandonne", label: "Abandonné" },
];

const BOOK_TYPE_OPTIONS: Array<{ value: BookType; label: string }> = [
  { value: "physique", label: "Physique" },
  { value: "numerique", label: "Numérique" },
  { value: "audio", label: "Audio" },
];

const statusConfig = {
  lu: {
    icon: Check,
    label: "Lu",
    className: "bg-emerald-100 text-emerald-800",
  },
  non_lu: {
    icon: Circle,
    label: "Non lu",
    className: "bg-slate-100 text-slate-700",
  },
  a_lire: {
    icon: Book,
    label: "À lire",
    className: "bg-blue-100 text-blue-800",
  },
  en_cours: {
    icon: Clock,
    label: "En cours",
    className: "bg-amber-100 text-amber-800",
  },
  abandonne: {
    icon: X,
    label: "Abandonné",
    className: "bg-rose-100 text-rose-800",
  },
} satisfies Record<ReadingStatus, object>;

const typeConfig = {
  physique: {
    icon: Books,
    label: "Physique",
    className: "bg-orange-100 text-orange-800",
  },
  numerique: {
    icon: DeviceMobile,
    label: "Numérique",
    className: "bg-indigo-100 text-indigo-800",
  },
  audio: {
    icon: Headphones,
    label: "Audio",
    className: "bg-violet-100 text-violet-800",
  },
} satisfies Record<BookType, object>;

export function ReadingStatusBadge({
  status,
  compact = false,
}: {
  status: ReadingStatus;
  compact?: boolean;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${config.className}`}
      title={config.label}
    >
      <Icon size={14} weight={status === "lu" ? "bold" : "regular"} />
      <span className={compact ? "sr-only sm:not-sr-only" : undefined}>
        {config.label}
      </span>
    </span>
  );
}

export function BookTypeBadge({
  type,
  compact = false,
}: {
  type: BookType;
  compact?: boolean;
}) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${config.className}`}
      title={config.label}
    >
      <Icon size={14} weight="regular" />
      <span className={compact ? "sr-only sm:not-sr-only" : undefined}>
        {config.label}
      </span>
    </span>
  );
}

export function ReadingStatusField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ReadingStatus;
  onChange: (value: ReadingStatus) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as ReadingStatus)}
      className="kodeks-field"
    >
      {READING_STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function BookTypeField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: BookType;
  onChange: (value: BookType) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as BookType)}
      className="kodeks-field"
    >
      {BOOK_TYPE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
