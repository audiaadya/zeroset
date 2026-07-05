import { useEffect, useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  mode?: 'signin' | 'signup';
}

export default function AuthModal({ open, onClose, mode: initialMode = 'signin' }: Props) {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referral, setReferral] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setPassword('');
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (mode === 'signin') {
      const { error } = await signIn(email.trim(), password);
      setBusy(false);
      if (error) setError(error);
      else onClose();
    } else {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setBusy(false);
        return;
      }
      const { error } = await signUp(email.trim(), password, name.trim() || email.split('@')[0], referral || undefined);
      setBusy(false);
      if (error) setError(error);
      else {
        setError(null);
        setMode('signin');
        setPassword('');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md animate-fade-in rounded-xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
          <div>
            <h2 className="font-serif text-lg text-ink-50">
              {mode === 'signin' ? 'Sign in to ZeroSet' : 'Create your account'}
            </h2>
            <p className="mt-0.5 text-xs text-ink-400">
              {mode === 'signin'
                ? 'Submit solutions and join the forum.'
                : 'Pick a display name — it will appear on your solutions and posts.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-100 focus-ring"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!configured && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Supabase env vars are not set. The site will run in read-only demo mode until they
              are configured.
            </span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3 p-5">
          {mode === 'signup' && (
            <Field
              icon={<User className="h-4 w-4" />}
              label="Display name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="e.g. emmy_noether"
              required
            />
          )}
          <Field
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@math.edu"
            required
          />
          <Field
            icon={<Lock className="h-4 w-4" />}
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
          />

          {mode === 'signup' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">
                How did you hear about ZeroSet?
              </span>
              <div className="flex items-center gap-2 rounded-md border border-ink-700 bg-ink-850 px-3 py-2.5 transition focus-within:border-accent-400/60 focus-within:shadow-glow">
                <select
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                  className="w-full bg-transparent text-sm text-ink-100 focus:outline-none"
                >
                  <option value="" className="bg-ink-900">Select one…</option>
                  <option value="youtube" className="bg-ink-900">YouTube</option>
                  <option value="reddit" className="bg-ink-900">Reddit</option>
                  <option value="social-media" className="bg-ink-900">Social media (X / Instagram / TikTok)</option>
                  <option value="friends" className="bg-ink-900">Friends</option>
                  <option value="family" className="bg-ink-900">Family</option>
                  <option value="teacher" className="bg-ink-900">Teacher / school</option>
                  <option value="other" className="bg-ink-900">Other</option>
                </select>
              </div>
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2.5 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25 hover:text-accent-100 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <div className="pt-1 text-center text-xs text-ink-400">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-accent-300 underline-offset-2 hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-accent-300 underline-offset-2 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">{label}</span>
      <div className="flex items-center gap-2 rounded-md border border-ink-700 bg-ink-850 px-3 py-2.5 transition focus-within:border-accent-400/60 focus-within:shadow-glow">
        <span className="text-ink-400">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full bg-transparent text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
        />
      </div>
    </label>
  );
}
