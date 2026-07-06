import { useEffect, useState, useRef } from 'react';
import { Eraser, Save, Copy, Check, Link, Loader2, Download, Clock, Trash2, Share2, Users, Key } from 'lucide-react';
import MathText from '../components/MathText';
import LaTeXMacros from '../components/LaTeXMacros';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

const STORAGE_KEY = 'zeroset:sandbox';

const DEFAULT = `# LaTeX Sandbox

Write Markdown + LaTeX here. Inline math with single dollar signs: $\\sum_{k=1}^n k = \\frac{n(n+1)}{2}$.

Block math with double dollar signs:

$$\\int_0^1 x^2 \\, dx = \\frac{1}{3}.$$

Try a matrix:

$$A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}, \\quad \\det A = -2.$$

Or an aligned derivation:

$$\\begin{aligned} (a+b)^2 &= (a+b)(a+b) \\\\ &= a^2 + 2ab + b^2. \\end{aligned}$$
`;

interface Snapshot {
  id: string;
  share_token: string;
  content: string;
  title?: string;
  created_at: string;
}

export default function SandboxPage() {
  const { user } = useAuth();
  const [src, setSrc] = useState(DEFAULT);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSharedDraft, setShowSharedDraft] = useState(false);
  const [sharedDraftKey, setSharedDraftKey] = useState('');
  const [loadDraftKey, setLoadDraftKey] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim().length > 0) setSrc(saved);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, src);
      setSavedAt(Date.now());
    }, 300);
    return () => clearTimeout(id);
  }, [src]);

  useEffect(() => {
    if (showSnapshots && user && isSupabaseConfigured) {
      loadSnapshots();
    }
  }, [showSnapshots, user]);

  const loadSnapshots = async () => {
    if (!user) return;
    setLoadingSnapshots(true);
    const { data, error } = await supabase
      .from('sandbox_snapshots')
      .select('id, share_token, content, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setSnapshots(data as Snapshot[]);
    }
    setLoadingSnapshots(false);
  };

  const clear = () => {
    if (!confirm('Clear the sandbox? This deletes your local draft.')) return;
    setSrc('');
    localStorage.removeItem(STORAGE_KEY);
    setSavedAt(null);
  };

  const copy = () => {
    navigator.clipboard.writeText(src).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const insertLatex = (latex: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setSrc((prev) => prev + '$' + latex + '$');
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newSrc = src.slice(0, start) + '$' + latex + '$' + src.slice(end);
    setSrc(newSrc);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1, start + latex.length + 1);
    }, 0);
  };

  const createSnapshot = async () => {
    if (!user || !isSupabaseConfigured || !src.trim()) return;
    setCreatingSnapshot(true);
    const { data, error } = await supabase
      .from('sandbox_snapshots')
      .insert({
        user_id: user.id,
        content: src,
        title: snapshotTitle.trim() || null,
      })
      .select('share_token')
      .maybeSingle();

    if (!error && data) {
      const token = (data as { share_token: string }).share_token;
      const link = `${window.location.origin}${window.location.pathname}#sandbox/${token}`;
      setShareLink(link);
      await loadSnapshots();
    }
    setCreatingSnapshot(false);
    setSnapshotTitle('');
  };

  const deleteSnapshot = async (id: string) => {
    if (!confirm('Delete this snapshot?')) return;
    await supabase.from('sandbox_snapshots').delete().eq('id', id);
    setSnapshots(snapshots.filter((s) => s.id !== id));
  };

  const loadSnapshot = (content: string) => {
    setSrc(content);
    setShowSnapshots(false);
  };

  const shareDraft = async () => {
    if (!user || !isSupabaseConfigured || !src.trim()) return;
    setLoadingDraft(true);
    const { data, error } = await supabase
      .from('shared_drafts')
      .insert({
        owner_id: user.id,
        content: src,
        title: snapshotTitle.trim() || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('access_key')
      .maybeSingle();

    if (!error && data) {
      setSharedDraftKey((data as { access_key: string }).access_key);
    }
    setLoadingDraft(false);
  };

  const loadSharedDraft = async () => {
    if (!loadDraftKey.trim()) return;
    setLoadingDraft(true);
    const { data, error } = await supabase
      .from('shared_drafts')
      .select('content')
      .eq('access_key', loadDraftKey.trim())
      .maybeSingle();

    if (!error && data) {
      setSrc((data as { content: string }).content);
      setLoadDraftKey('');
      setShowSharedDraft(false);
    }
    setLoadingDraft(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
          LaTeX Sandbox
        </span>
        <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Scratchpad</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-400">
          Test complex formatting, matrices, aligned derivations, and math blocks before posting
          to the forum or submitting as a solution. Live preview updates as you type.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={copy}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-accent-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy source'}
        </button>
        <button
          onClick={clear}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-red-500/40 hover:text-red-300"
        >
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>

        {user && isSupabaseConfigured && (
          <>
            <button
              onClick={() => setShowSnapshots(!showSnapshots)}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
            >
              <Clock className="h-3.5 w-3.5" />
              Snapshots ({snapshots.length})
            </button>
            <button
              onClick={() => setShowSharedDraft(!showSharedDraft)}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-200 hover:border-accent-400/40 hover:text-accent-200"
            >
              <Users className="h-3.5 w-3.5" />
              Share Draft
            </button>
          </>
        )}

        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-ink-500">
          {savedAt ? (
            <>
              <Save className="h-3 w-3 text-accent-400" />
              saved {new Date(savedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </>
          ) : (
            'auto-saves locally'
          )}
        </span>
      </div>

      {showSharedDraft && user && isSupabaseConfigured && (
        <div className="mb-4 rounded-lg border border-ink-700 bg-ink-850/50 p-4 space-y-3">
          <h3 className="font-serif text-lg text-ink-50">Share Draft with Collaborator</h3>
          <p className="text-sm text-ink-400">
            Generate a temporary access key that lets a teammate view your draft and help refine it.
          </p>

          {sharedDraftKey ? (
            <div className="flex items-center gap-2 rounded-md border border-accent-400/40 bg-accent-400/10 px-3 py-2">
              <Key className="h-4 w-4 text-accent-400" />
              <span className="font-mono text-accent-300">{sharedDraftKey}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sharedDraftKey);
                  setCopied(true);
                }}
                className="ml-auto text-xs text-accent-200 hover:text-accent-100"
              >
                Copy
              </button>
            </div>
          ) : (
            <button
              onClick={shareDraft}
              disabled={loadingDraft || !src.trim()}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
            >
              {loadingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
              Generate Access Key
            </button>
          )}

          <div className="border-t border-ink-700 pt-3 mt-3">
            <p className="text-xs text-ink-400 mb-2">Or load a shared draft:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={loadDraftKey}
                onChange={(e) => setLoadDraftKey(e.target.value)}
                className="focus-ring flex-1 rounded-md border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs text-ink-100 font-mono"
                placeholder="Enter access key..."
              />
              <button
                onClick={loadSharedDraft}
                disabled={loadingDraft || !loadDraftKey.trim()}
                className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-200 hover:border-accent-400/40 disabled:opacity-50"
              >
                {loadingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Load
              </button>
            </div>
          </div>
        </div>
      )}

      {showSnapshots && user && isSupabaseConfigured && (
        <div className="mb-4 rounded-lg border border-ink-700 bg-ink-850/50 p-4">
          <h3 className="mb-3 font-serif text-lg text-ink-50">Your Snapshots</h3>

          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={snapshotTitle}
                onChange={(e) => setSnapshotTitle(e.target.value)}
                className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs text-ink-100 placeholder:text-ink-500"
                placeholder="Snapshot title (optional)"
              />
            </div>
            <button
              onClick={createSnapshot}
              disabled={creatingSnapshot || !src.trim()}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
            >
              {creatingSnapshot ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Save Snapshot
            </button>
          </div>

          {shareLink && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-accent-400/40 bg-accent-400/10 px-3 py-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-transparent text-xs text-ink-200 outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 1500);
                }}
                className="flex items-center gap-1 text-xs text-accent-300 hover:text-accent-200"
              >
                {copiedLink ? <Check className="h-3 w-3" /> : <Link className="h-3 w-3" />}
                {copiedLink ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          )}

          {loadingSnapshots ? (
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading snapshots...
            </div>
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-ink-400">No snapshots saved yet. Create one to share your work!</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {snapshots.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border border-ink-700 bg-ink-900/50 p-2"
                >
                  <button
                    onClick={() => loadSnapshot(s.content)}
                    className="flex-1 text-left text-sm text-ink-200 hover:text-accent-200"
                  >
                    <div className="truncate">{s.title || 'Untitled snapshot'}</div>
                    <div className="text-xs text-ink-500">
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteSnapshot(s.id)}
                    className="p-1 text-ink-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <LaTeXMacros onInsert={insertLatex} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <textarea
          ref={textareaRef}
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          rows={24}
          spellCheck={false}
          className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-950 p-4 font-mono text-sm leading-relaxed text-ink-100 placeholder:text-ink-500"
          placeholder="Write Markdown + LaTeX here..."
        />
        <div
          ref={previewRef}
          className="min-h-[24rem] overflow-y-auto rounded-md border border-ink-700 bg-ink-900 p-4"
        >
          {src.trim() ? (
            <MathText key={src}>{src}</MathText>
          ) : (
            <span className="text-sm text-ink-500">Live preview appears here as you type.</span>
          )}
        </div>
      </div>
    </div>
  );
}
