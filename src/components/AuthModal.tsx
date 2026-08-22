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
  const [emailConsent, setEmailConsent] = useState(false);
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
      const { error } = await signUp(email.trim(), password, name.trim() || email.split('@')[0], referral || undefined, emailConsent);
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
      <div className="relative w-full max-w-md animate-fade-in border-2 border-ink-700 bg-cream-100 p-5 shadow-panel" style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}>
        <div className="flex items-center justify-between border-b border-ink-300 px-1 pb-4">
          <div>
            <h2 className="font-handwritten text-xl font-bold text-ink-950">
              {mode === 'signin' ? 'Sign in to ZeroSet' : 'Create your account'}
            </h2>
            <p className="mt-0.5 font-handwritten text-xs text-ink-600">
              {mode === 'signin'
                ? 'Submit solutions and join the forum.'
                : 'Pick a display name — it will appear on your solutions and posts.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-sketch-notebook p-1.5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!configured && (
          <div className="mt-4 flex items-start gap-2 sketch-border-sm bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Supabase env vars are not set. The site will run in read-only demo mode until they
              are configured.
            </span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3 pt-4">
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
              <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">
                How did you hear about ZeroSet?
              </span>
              <div className="flex items-center gap-2 border-2 border-ink-400 bg-white px-3 py-2.5 transition focus-within:border-accent-500" style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}>
                <select
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                  className="w-full bg-transparent font-handwritten text-sm text-ink-900 focus:outline-none"
                >
                  <option value="">Select one…</option>
                  <option value="youtube">YouTube</option>
                  <option value="reddit">Reddit</option>
                  <option value="social-media">Social media (X / Instagram / TikTok)</option>
                  <option value="friends">Friends</option>
                  <option value="family">Family</option>
                  <option value="teacher">Teacher / school</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </label>
          )}

          {mode === 'signup' && (
            <label className="flex items-start gap-2.5 border-2 border-ink-400 bg-white px-3 py-2.5" style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}>
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 border-ink-400 bg-white text-accent-500 focus:ring-accent-400"
              />
              <span className="font-handwritten text-xs text-ink-700">
                I agree to receive emails about new problem sets, features, and product updates from
                ZeroSet. You can opt out anytime in Settings.
              </span>
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 sketch-border-sm bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-sketch-notebook flex w-full items-center justify-center gap-2 px-4 py-2.5 font-handwritten text-sm font-bold disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <div className="pt-1 text-center font-handwritten text-xs text-ink-600">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-bold text-accent-700 underline-offset-2 hover:underline"
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
                  className="font-bold text-accent-700 underline-offset-2 hover:underline"
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
      <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">{label}</span>
      <div className="flex items-center gap-2 border-2 border-ink-400 bg-white px-3 py-2.5 transition focus-within:border-accent-500" style={{ borderRadius: '8px 2px 6px 3px / 3px 6px 2px 8px' }}>
        <span className="text-ink-500">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full bg-transparent font-handwritten text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none"
        />
      </div>
    </label>
  );
}
