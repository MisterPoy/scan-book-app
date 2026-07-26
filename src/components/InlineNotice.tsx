interface InlineNoticeProps {
  message: string | null;
  tone?: 'error' | 'success' | 'info';
}

const toneClasses = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

export default function InlineNotice({
  message,
  tone = 'error',
}: InlineNoticeProps) {
  if (!message) return null;

  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`rounded-md border p-3 text-sm font-medium ${toneClasses[tone]}`}
    >
      {message}
    </p>
  );
}
