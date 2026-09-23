import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { User } from "firebase/auth";
import {
  Books,
  Camera,
  CheckCircle,
  CircleNotch,
  MagnifyingGlass,
  Plus,
  Trash,
  Warning,
  X,
} from "phosphor-react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import LibrarySelector from "./LibrarySelector";
import type { UserLibrary } from "../types/library";
import type {
  ExistingShelfBook,
  ShelfAnalysisUsage,
  ShelfCatalogCandidate,
  ShelfDetectedBook,
  ShelfReviewBook,
} from "../types/shelfImport";
import { prepareShelfImage, type PreparedShelfImage } from "../utils/shelfImage";
import { analyzeShelfPhoto, ShelfImportApiError } from "../services/shelfImportApi";
import {
  buildShelfReviewBooks,
  deduplicateShelfDetections,
  getShelfDuplicateReason,
  searchShelfCatalogCandidates,
} from "../utils/shelfCatalog";

type ImportPhase = "capture" | "analyzing" | "review" | "submitting";

interface ShelfImportModalProps {
  isOpen: boolean;
  user: User;
  existingBooks: ExistingShelfBook[];
  userLibraries: UserLibrary[];
  onClose: () => void;
  onConfirm: (isbns: string[], libraries?: string[]) => Promise<void>;
}

const MAX_PHOTOS = 5;

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

function selectedCandidate(row: ShelfReviewBook): ShelfCatalogCandidate | undefined {
  return row.candidates.find((candidate) => candidate.isbn === row.selectedIsbn);
}

const statusPresentation = {
  ready: { label: "Prêt", className: "bg-green-100 text-green-800" },
  review: { label: "À vérifier", className: "bg-amber-100 text-amber-800" },
  unresolved: { label: "Non résolu", className: "bg-red-100 text-red-800" },
  duplicate: { label: "Déjà présent", className: "bg-gray-200 text-gray-700" },
} as const;

export default function ShelfImportModal({
  isOpen,
  user,
  existingBooks,
  userLibraries,
  onClose,
  onConfirm,
}: ShelfImportModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<ImportPhase>("capture");
  const [photos, setPhotos] = useState<PreparedShelfImage[]>([]);
  const [reviewBooks, setReviewBooks] = useState<ShelfReviewBook[]>([]);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressValue, setProgressValue] = useState(0);
  const [usage, setUsage] = useState<ShelfAnalysisUsage>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  });
  const [searchingRows, setSearchingRows] = useState<Set<string>>(new Set());

  const selectedRows = useMemo(
    () =>
      reviewBooks.filter(
        (row) => row.selected && row.selectedIsbn && row.status !== "duplicate",
      ),
    [reviewBooks],
  );

  const statusCounts = useMemo(
    () =>
      reviewBooks.reduce(
        (counts, row) => ({ ...counts, [row.status]: counts[row.status] + 1 }),
        { ready: 0, review: 0, unresolved: 0, duplicate: 0 },
      ),
    [reviewBooks],
  );

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const handleCloseRequest = () => {
      if (phase !== "analyzing" && phase !== "submitting") onClose();
    };
    modal.addEventListener("modal-close-request", handleCloseRequest);
    return () => modal.removeEventListener("modal-close-request", handleCloseRequest);
  }, [modalRef, onClose, phase]);

  useEffect(() => {
    if (isOpen) return;
    setPhase("capture");
    setPhotos([]);
    setReviewBooks([]);
    setSelectedLibraries([]);
    setError(null);
    setWarnings([]);
    setProgressLabel("");
    setProgressValue(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setError(`Vous pouvez analyser jusqu'à ${MAX_PHOTOS} photos par session.`);
      return;
    }

    setError(null);
    const prepared: PreparedShelfImage[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      try {
        prepared.push(await prepareShelfImage(file));
      } catch (preparationError) {
        setError(
          preparationError instanceof Error
            ? preparationError.message
            : "Une photo n'a pas pu être préparée.",
        );
      }
    }
    setPhotos((current) => [...current, ...prepared]);
  };

  const removePhoto = (photoId: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    setError(null);
  };

  const runAnalysis = async () => {
    if (photos.length === 0) return;
    setPhase("analyzing");
    setError(null);
    setWarnings([]);
    setProgressValue(0);
    setUsage({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });

    const detections: ShelfDetectedBook[] = [];
    const collectedWarnings: string[] = [];
    const failedPhotos: string[] = [];
    const collectedUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    try {
      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        setProgressLabel(`Analyse de la photo ${index + 1} sur ${photos.length}`);
        setProgressValue(Math.round((index / (photos.length + 1)) * 100));
        try {
          const result = await analyzeShelfPhoto(photo.dataUrl, user);
          result.books.forEach((book, bookIndex) => {
            detections.push({
              ...book,
              id: `${photo.id}-${book.position}-${bookIndex}`,
              photoId: photo.id,
              photoIndex: index,
            });
          });
          collectedWarnings.push(...result.warnings);
          if (result.usage) {
            collectedUsage.inputTokens += result.usage.inputTokens;
            collectedUsage.outputTokens += result.usage.outputTokens;
            collectedUsage.totalTokens += result.usage.totalTokens;
          }
        } catch (analysisError) {
          if (analysisError instanceof ShelfImportApiError) {
            if (analysisError.code === "OPENAI_NOT_CONFIGURED") {
              throw new Error(
                "La fonction est prête, mais la clé OpenAI n'est pas encore configurée sur le serveur.",
              );
            }
            if (
              analysisError.status === 401 ||
              analysisError.status === 403 ||
              analysisError.status === 413 ||
              analysisError.status === 429 ||
              analysisError.code === "SERVER_NOT_CONFIGURED" ||
              analysisError.code === "OPENAI_ACCOUNT_ERROR"
            ) {
              throw analysisError;
            }
          }
          failedPhotos.push(photo.name);
        }
      }

      const uniqueDetections = deduplicateShelfDetections(detections);
      if (uniqueDetections.length === 0) {
        throw new Error(
          failedPhotos.length === photos.length
            ? "Aucune photo n'a pu être analysée. Réessayez avec une photo plus rapprochée."
            : "Aucun livre suffisamment lisible n'a été détecté.",
        );
      }

      setProgressLabel("Recherche des éditions dans les catalogues");
      setProgressValue(85);
      const rows = await buildShelfReviewBooks(uniqueDetections, existingBooks);
      if (failedPhotos.length > 0) {
        collectedWarnings.push(
          `${failedPhotos.length} photo${failedPhotos.length > 1 ? "s n'ont" : " n'a"} pas pu être analysée${failedPhotos.length > 1 ? "s" : ""}.`,
        );
      }
      setReviewBooks(rows);
      setWarnings([...new Set(collectedWarnings)]);
      setUsage(collectedUsage);
      setProgressValue(100);
      setPhase("review");
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "L'analyse de l'étagère n'a pas abouti.",
      );
      setPhase("capture");
      setProgressLabel("");
      setProgressValue(0);
    }
  };

  const updateRow = (rowId: string, update: Partial<ShelfReviewBook>) => {
    setReviewBooks((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, ...update } : row)),
    );
  };

  const chooseCandidate = (row: ShelfReviewBook, isbn: string) => {
    const candidate = row.candidates.find((item) => item.isbn === isbn);
    if (!candidate) return;
    const duplicateReason = getShelfDuplicateReason(candidate, existingBooks);
    updateRow(row.id, {
      selectedIsbn: isbn,
      duplicateReason,
      status: duplicateReason ? "duplicate" : "review",
      selected: !duplicateReason,
    });
  };

  const searchRow = async (row: ShelfReviewBook) => {
    const title = row.queryTitle.trim();
    if (!title) {
      setError("Saisissez au moins un titre pour relancer la recherche.");
      return;
    }
    setError(null);
    setSearchingRows((current) => new Set(current).add(row.id));
    try {
      const candidates = await searchShelfCatalogCandidates(
        title,
        row.queryAuthor.trim() || null,
      );
      const candidate = candidates[0];
      const duplicateReason = candidate
        ? getShelfDuplicateReason(candidate, existingBooks)
        : undefined;
      updateRow(row.id, {
        candidates,
        selectedIsbn: candidate?.isbn || null,
        duplicateReason,
        status: !candidate ? "unresolved" : duplicateReason ? "duplicate" : "review",
        selected: Boolean(candidate && !duplicateReason),
      });
    } catch {
      setError("La recherche dans les catalogues n'a pas abouti.");
    } finally {
      setSearchingRows((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  };

  const confirmImport = async () => {
    const isbns = [...new Set(selectedRows.flatMap((row) => row.selectedIsbn || []))];
    if (isbns.length === 0) return;
    setPhase("submitting");
    setError(null);
    try {
      await onConfirm(isbns, selectedLibraries.length > 0 ? selectedLibraries : undefined);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Les livres n'ont pas pu être ajoutés.",
      );
      setPhase("review");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && phase !== "analyzing" && phase !== "submitting") {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shelf-import-title"
        className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-4 sm:px-6">
          <div>
            <div className="mb-1 flex items-center gap-2 text-indigo-700">
              <Camera size={22} weight="bold" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-wide">Fonction administrateur</span>
            </div>
            <h2 id="shelf-import-title" className="text-xl font-bold text-gray-950 sm:text-2xl">
              Importer une étagère
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Les livres ne seront ajoutés qu'après votre vérification.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === "analyzing" || phase === "submitting"}
            className="rounded-full p-2 text-gray-600 transition hover:bg-white hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Fermer l'import d'étagère"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              <Warning size={20} weight="bold" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {(phase === "capture" || phase === "analyzing") && (
            <>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["1", "Une rangée à la fois", "Les dos doivent remplir la photo."],
                  ["2", "Photo bien droite", "Évitez les reflets et le flou."],
                  ["3", "Vérification obligatoire", "Les éditions ambiguës resteront à confirmer."],
                ].map(([number, title, description]) => (
                  <div key={number} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                      {number}
                    </div>
                    <p className="font-semibold text-gray-900">{title}</p>
                    <p className="mt-1 text-sm text-gray-600">{description}</p>
                  </div>
                ))}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                multiple
                className="sr-only"
                onChange={handleFiles}
                disabled={phase === "analyzing"}
              />

              {photos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 px-6 text-center transition hover:border-indigo-500 hover:bg-indigo-50"
                >
                  <Camera size={48} weight="duotone" className="mb-3 text-indigo-600" />
                  <span className="text-lg font-semibold text-gray-950">Prendre ou choisir des photos</span>
                  <span className="mt-1 text-sm text-gray-600">
                    JPEG, PNG ou WebP · jusqu'à {MAX_PHOTOS} photos
                  </span>
                </button>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((photo, index) => (
                    <div key={photo.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="relative aspect-[4/3] bg-gray-100">
                        <img src={photo.dataUrl} alt={`Étagère ${index + 1}`} className="h-full w-full object-cover" />
                        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
                          Photo {index + 1}
                        </span>
                        {phase !== "analyzing" && (
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="absolute right-2 top-2 rounded-full bg-white/95 p-2 text-red-600 shadow hover:bg-red-50"
                            aria-label={`Supprimer la photo ${index + 1}`}
                          >
                            <Trash size={18} weight="bold" />
                          </button>
                        )}
                      </div>
                      <div className="p-3 text-xs text-gray-600">
                        <p className="truncate font-medium text-gray-800">{photo.name}</p>
                        <p>{photo.width} × {photo.height} · {formatBytes(photo.encodedBytes)}</p>
                      </div>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && phase !== "analyzing" && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <Plus size={30} weight="bold" />
                      <span className="mt-2 font-medium">Ajouter une photo</span>
                    </button>
                  )}
                </div>
              )}

              {phase === "analyzing" && (
                <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5" role="status" aria-live="polite">
                  <div className="mb-3 flex items-center gap-3">
                    <CircleNotch size={24} weight="bold" className="animate-spin text-indigo-600" />
                    <div>
                      <p className="font-semibold text-indigo-950">{progressLabel}</p>
                      <p className="text-sm text-indigo-700">Vous pourrez tout vérifier avant l'ajout.</p>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
                    <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progressValue}%` }} />
                  </div>
                </div>
              )}

              <p className="mt-5 text-xs leading-relaxed text-gray-500">
                Les photos sont compressées et débarrassées de leurs métadonnées dans votre navigateur,
                puis envoyées au service OpenAI uniquement lorsque vous lancez l'analyse. Elles ne sont pas
                enregistrées dans votre collection.
              </p>
            </>
          )}

          {(phase === "review" || phase === "submitting") && (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["ready", statusCounts.ready],
                    ["review", statusCounts.review],
                    ["unresolved", statusCounts.unresolved],
                    ["duplicate", statusCounts.duplicate],
                  ] as const
                ).map(([status, count]) => (
                  <div key={status} className="rounded-xl border border-gray-200 p-3 text-center">
                    <div className="text-2xl font-bold text-gray-950">{count}</div>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusPresentation[status].className}`}>
                      {statusPresentation[status].label}
                    </span>
                  </div>
                ))}
              </div>

              {warnings.length > 0 && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="mb-1 font-semibold">Points à contrôler</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </div>
              )}

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Cochez uniquement les correspondances que vous avez vérifiées.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setReviewBooks((rows) =>
                      rows.map((row) => ({
                        ...row,
                        selected: row.status === "ready" ? true : row.selected,
                      })),
                    )
                  }
                  className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  Sélectionner tous les prêts
                </button>
              </div>

              <div className="space-y-4">
                {reviewBooks.map((row) => {
                  const candidate = selectedCandidate(row);
                  const presentation = statusPresentation[row.status];
                  const searching = searchingRows.has(row.id);
                  return (
                    <article key={row.id} className={`rounded-xl border-2 p-4 ${row.selected ? "border-indigo-300 bg-indigo-50/30" : "border-gray-200 bg-white"}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={!candidate || row.status === "duplicate" || phase === "submitting"}
                          onChange={(event) => updateRow(row.id, { selected: event.target.checked })}
                          className="mt-2 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          aria-label={`Sélectionner ${candidate?.title || row.detection.visibleText || "ce livre"}`}
                        />
                        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
                          {candidate?.thumbnail ? (
                            <img src={candidate.thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-300"><Books size={34} /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Photo {row.detection.photoIndex + 1} · position {row.detection.position}
                              </p>
                              <p className="mt-0.5 text-sm text-gray-600">
                                Lu sur le dos : « {row.detection.visibleText || "texte illisible"} »
                              </p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${presentation.className}`}>
                              {presentation.label}
                            </span>
                          </div>

                          {candidate ? (
                            <div className="mb-3">
                              <h3 className="font-semibold text-gray-950">{candidate.title}</h3>
                              <p className="text-sm text-gray-700">{candidate.authors.join(", ") || "Auteur non renseigné"}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {candidate.source} · ISBN {candidate.isbn}
                                {candidate.publishedDate ? ` · ${candidate.publishedDate}` : ""}
                              </p>
                            </div>
                          ) : (
                            <p className="mb-3 text-sm text-red-700">Aucune édition n'a été trouvée automatiquement.</p>
                          )}

                          {row.candidates.length > 1 && (
                            <label className="mb-3 block text-sm font-medium text-gray-700">
                              Édition retenue
                              <select
                                value={row.selectedIsbn || ""}
                                onChange={(event) => chooseCandidate(row, event.target.value)}
                                disabled={phase === "submitting"}
                                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                              >
                                {row.candidates.map((item) => (
                                  <option key={`${item.source}-${item.isbn}`} value={item.isbn}>
                                    {item.title} — {item.authors[0] || "auteur inconnu"} — {item.publishedDate || "date inconnue"} — {item.isbn}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}

                          {row.duplicateReason && (
                            <p className="mb-3 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700">
                              {row.duplicateReason}
                            </p>
                          )}

                          {(row.status === "unresolved" || row.status === "review") && (
                            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                              <label className="text-xs font-medium text-gray-700">
                                Titre à rechercher
                                <input
                                  value={row.queryTitle}
                                  onChange={(event) => updateRow(row.id, { queryTitle: event.target.value })}
                                  disabled={phase === "submitting"}
                                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="text-xs font-medium text-gray-700">
                                Auteur
                                <input
                                  value={row.queryAuthor}
                                  onChange={(event) => updateRow(row.id, { queryAuthor: event.target.value })}
                                  disabled={phase === "submitting"}
                                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => searchRow(row)}
                                disabled={searching || phase === "submitting"}
                                className="mt-auto flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                              >
                                {searching ? <CircleNotch size={17} className="animate-spin" /> : <MagnifyingGlass size={17} />}
                                Rechercher
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {userLibraries.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <LibrarySelector
                    libraries={userLibraries}
                    selectedLibraries={selectedLibraries}
                    onSelectionChange={setSelectedLibraries}
                    title="Ajouter les livres sélectionnés à une bibliothèque (optionnel)"
                    emptyMessage="Créez d'abord une bibliothèque pour classer ces livres"
                  />
                </div>
              )}

              {usage.totalTokens > 0 && (
                <p className="mt-5 text-xs text-gray-500">
                  Analyse OpenAI : {usage.totalTokens.toLocaleString("fr-FR")} tokens utilisés
                  ({usage.inputTokens.toLocaleString("fr-FR")} en entrée, {usage.outputTokens.toLocaleString("fr-FR")} en sortie).
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm text-gray-600">
            {phase === "review" || phase === "submitting" ? (
              <><strong>{selectedRows.length}</strong> livre{selectedRows.length > 1 ? "s" : ""} sélectionné{selectedRows.length > 1 ? "s" : ""}</>
            ) : (
              <><strong>{photos.length}</strong> photo{photos.length > 1 ? "s" : ""} prête{photos.length > 1 ? "s" : ""}</>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={phase === "analyzing" || phase === "submitting"}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Annuler
            </button>
            {phase === "capture" && (
              <button
                type="button"
                onClick={runAnalysis}
                disabled={photos.length === 0}
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Camera size={19} weight="bold" />
                Analyser {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? "s" : ""}` : "les photos"}
              </button>
            )}
            {phase === "review" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPhase("capture");
                    setReviewBooks([]);
                    setWarnings([]);
                  }}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  Reprendre les photos
                </button>
                <button
                  type="button"
                  onClick={confirmImport}
                  disabled={selectedRows.length === 0}
                  className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <CheckCircle size={19} weight="bold" />
                  {selectedRows.length > 0
                    ? `Ajouter ${selectedRows.length} livre${selectedRows.length > 1 ? "s" : ""}`
                    : "Ajouter les livres sélectionnés"}
                </button>
              </>
            )}
            {phase === "submitting" && (
              <button type="button" disabled className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white opacity-75">
                <CircleNotch size={19} weight="bold" className="animate-spin" />
                Ajout en cours...
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
