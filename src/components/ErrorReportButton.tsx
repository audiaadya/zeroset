import { useState } from 'react';
import { AlertTriangle, Loader2, X, Send, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';

interface Props {
  problemId: string;
}

export default function ErrorReportButton({ problemId }: Props) {
  const { user, configured } = useAuth();
  const displayName = useDisplayName();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('problem_error_reports').insert({
        problem_id: problemId,
        user_id: user.id,
        user_name: displayName,
        description: description.trim(),
      });
      if (insertError) throw insertError;
      setSuccess(true);
      setDescription('');
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (!configured) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-2.5 py-1.5 text-xs text-ink-400 transition hover:border-red-500/40 hover:text-red-300"
        title="Report an error or typo"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Report Error
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-lg border border-ink-700 bg-ink-850 p-5 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 text-ink-400 hover:text-ink-200"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-serif text-lg text-ink-50">Report an Error</h3>
            </div>

            <p className="mt-2 text-sm text-ink-400">
              Found a typo, incorrect answer, or other issue? Describe it below.
            </p>

            {success ? (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-accent-400/40 bg-accent-400/10 px-3 py-3 text-sm text-accent-300">
                <Check className="h-4 w-4" />
                Report submitted successfully!
              </div>
            ) : !user ? (
              <div className="mt-4 rounded-md border border-ink-700 bg-ink-900/50 px-3 py-3 text-sm text-ink-400">
                Sign in to report errors.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-900 p-3 text-sm text-ink-100 placeholder:text-ink-500"
                  placeholder="Describe the error..."
                />

                {error && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="focus-ring rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-300 hover:text-ink-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting || !description.trim()}
                    className="focus-ring flex items-center gap-1.5 rounded-md border border-red-500/50 bg-red-500/15 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Submit Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
