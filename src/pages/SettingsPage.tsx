import { useEffect, useState } from 'react';
import { Mail, Lock, User, Loader2, Check, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { syncMyProfile } from '../lib/profile';

interface Props {
  navigate: (to: string) => void;
}

export default function SettingsPage({ navigate }: Props) {
  const { user, configured, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'email' | 'password'>('profile');

  useEffect(() => {
    if (user) {
      const meta = user.user_metadata as { display_name?: string } | undefined;
      setDisplayName(meta?.display_name || user.email?.split('@')[0] || '');
      setNewEmail(user.email || '');
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-400" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <AlertCircle className="mx-auto h-8 w-8 text-yellow-400" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">Supabase not configured</h2>
        <p className="mt-2 text-sm text-ink-400">Settings require a connected database.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Lock className="mx-auto h-8 w-8 text-accent-400" />
        <h2 className="mt-4 font-serif text-2xl text-ink-100">Sign in to manage settings</h2>
        <p className="mt-2 text-sm text-ink-400">
          Update your display name, email, and password.
        </p>
      </div>
    );
  }

  const updateDisplayName = async () => {
    if (!displayName.trim()) {
      setError('Display name cannot be empty.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() }
      });

      if (updateError) throw updateError;

      await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('user_id', user.id);

      void syncMyProfile();
      setSuccess('Display name updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update display name');
    } finally {
      setLoading(false);
    }
  };

  const updateEmail = async () => {
    if (!newEmail.trim() || newEmail === user.email) {
      setError('Enter a new email address.');
      return;
    }
    if (!currentPassword) {
      setError('Enter your current password to change email.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
      });

      if (signInError) throw new Error('Current password is incorrect');

      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail.trim()
      });

      if (updateError) throw updateError;

      setSuccess('Verification email sent to your new address. Click the link to confirm.');
      setCurrentPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    if (!currentPassword) {
      setError('Enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
      });

      if (signInError) throw new Error('Current password is incorrect');

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <button
        onClick={() => navigate('/me')}
        className="mb-6 flex items-center gap-2 text-sm text-ink-400 hover:text-ink-200"
      >
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </button>

      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
          <User className="h-3 w-3" />
          Settings
        </span>
        <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Account Settings</h1>
        <p className="mt-2 text-sm text-ink-400">
          Update your display name, email address, and password.
        </p>
      </header>

      <div className="mb-6 flex border-b border-ink-700">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'profile'
              ? 'border-b-2 border-accent-400 text-accent-200'
              : 'text-ink-400 hover:text-ink-200'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'email'
              ? 'border-b-2 border-accent-400 text-accent-200'
              : 'text-ink-400 hover:text-ink-200'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'password'
              ? 'border-b-2 border-accent-400 text-accent-200'
              : 'text-ink-400 hover:text-ink-200'
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          Password
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-accent-400/30 bg-accent-400/10 px-3 py-2 text-xs text-accent-300">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-6">
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500"
                placeholder="Your display name"
              />
              <p className="mt-1.5 text-xs text-ink-500">
                This is how your name appears on solutions and forum posts.
              </p>
            </div>
            <button
              onClick={updateDisplayName}
              disabled={loading || !displayName.trim()}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Changes
            </button>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Current Email</label>
              <div className="rounded-md border border-ink-700 bg-ink-900/50 px-3 py-2 text-sm text-ink-400">
                {user.email}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">New Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500"
                placeholder="new@email.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 pr-10 text-sm text-ink-100 placeholder:text-ink-500"
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-ink-500">
                Required for security when changing your email.
              </p>
            </div>
            <button
              onClick={updateEmail}
              disabled={loading || !newEmail.trim() || !currentPassword}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Update Email
            </button>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 pr-10 text-sm text-ink-100 placeholder:text-ink-500"
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 pr-10 text-sm text-ink-100 placeholder:text-ink-500"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500"
                placeholder="Re-enter new password"
              />
            </div>
            <button
              onClick={updatePassword}
              disabled={loading || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:bg-accent-400/25 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              Update Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
