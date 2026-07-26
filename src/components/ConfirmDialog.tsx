import { useEffect, useId } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmer',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen || isPending) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCloseRequest = () => onCancel();
    dialog.addEventListener('modal-close-request', handleCloseRequest);
    return () => dialog.removeEventListener('modal-close-request', handleCloseRequest);
  }, [dialogRef, isOpen, isPending, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
      >
        <h2 id={titleId} className="text-xl font-bold text-gray-900">
          {title}
        </h2>
        <p className="mt-3 text-sm text-gray-700">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Traitement…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
