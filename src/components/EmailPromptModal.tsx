import { useEffect, useState } from 'react';
import { X, Mail, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

export default function EmailPromptModal() {
  const { user, isHost, configured } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !configured || isHost) return;
    if (localStorage.getItem('zeroset_email_prompted')) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!data?.email) {
        setOpen(true);
      }
    })();
  }, [user, configured, isHost]);

  const submit = async () => {
    if (!user || !email.trim()) return;
    setBusy(true);
    setError(null);
    const { error: updError } = await supabase
      .from('profiles')
      .update({ email: email.trim() })
      .eq('user_id', user.id);
    if (updError) {
      setError(updError.message);
      setBusy(false);
      return;
    }
    await supabase.from('email_consent').upsert(
      { user_id: user.id, consented: true, consented_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    localStorage.setItem('zeroset_email_prompted', '1');
    setBusy(false);
    setOpen(false);
  };

  const later = () => {
    localStorage.setItem('zeroset_email_prompted', '1');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={later} aria-hidden />
      <div className="relative w-full max-w-md animate-fade-in rounded-xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent-400" />
            <h2 className="font-serif text-lg text-ink-50">Stay in the loop</h2>
          </div>
          <button onClick={later} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-ink-300">
            We're collecting emails to send you updates about new problem sets and features.
            This is for sending you updates only — not for information collection.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@math.edu"
            className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm text-ink-100"
          />
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={submit}
              disabled={busy || !email.trim()}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Submit
            </button>
            <button onClick={later} className="text-xs text-ink-400 hover:text-ink-200">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
