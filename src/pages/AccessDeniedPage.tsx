import { Shield, ArrowLeft } from 'lucide-react';

interface Props {
  navigate: (to: string) => void;
  message?: string;
}

export default function AccessDeniedPage({ navigate, message }: Props) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center sm:px-6">
      <div className="relative">
        <Shield className="h-16 w-16 text-red-400/50" />
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          !
        </span>
      </div>
      <h1 className="mt-6 font-serif text-4xl italic text-ink-50">403</h1>
      <p className="mt-2 font-serif text-lg text-ink-300">Access Denied</p>
      <p className="mt-3 max-w-md text-sm text-ink-400">
        {message ?? 'You do not have permission to view this page. If you believe this is an error, contact an administrator.'}
      </p>
      <button
        onClick={() => navigate('/current-week')}
        className="mt-6 flex items-center gap-2 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to current week
      </button>
    </div>
  );
}
