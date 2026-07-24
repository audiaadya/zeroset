import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Loader2, AlertCircle, ExternalLink, ImagePlus, X, Pencil } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

interface Props {
  navigate: (to: string) => void;
}

interface Partner {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
}

export default function PartnersPage({ navigate }: Props) {
  const { isHost } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);

  const load = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('partners')
      .select('id, name, description, image_url, link_url, sort_order')
      .order('sort_order', { ascending: true });
    setPartners((data as Partner[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-400/40 bg-accent-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-300">
            <Plus className="h-3 w-3" />
            Partners
          </span>
          <h1 className="mt-4 font-serif text-3xl text-ink-50 sm:text-4xl">Our Partners</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">
            Collaborators and organizations we work with to bring you the best math challenges.
          </p>
        </div>
        {isHost && (
          <button
            onClick={() => { setEditing(null); setShowEdit(true); }}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25"
          >
            <Plus className="h-4 w-4" /> Add partner
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading partners…
        </div>
      ) : partners.length === 0 ? (
        <div className="rounded-lg border border-ink-700 bg-ink-850/40 p-8 text-center">
          <p className="text-sm text-ink-400">No partners listed yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-xl border border-ink-700 bg-ink-850/50 transition hover:border-accent-400/30">
              {p.image_url && (
                <div className="aspect-video w-full overflow-hidden bg-ink-900">
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
                </div>
              )}
              <div className="p-5">
                <h3 className="font-serif text-lg text-ink-50">{p.name}</h3>
                {p.description && <p className="mt-1 text-sm text-ink-400">{p.description}</p>}
                {p.link_url && (
                  <a
                    href={p.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs text-accent-300 hover:text-accent-200"
                  >
                    <ExternalLink className="h-3 w-3" /> Visit
                  </a>
                )}
              </div>
              {isHost && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => { setEditing(p); setShowEdit(true); }}
                    className="rounded-md border border-ink-700 bg-ink-900/80 p-1.5 text-ink-300 hover:bg-ink-800"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this partner?')) return;
                      await supabase.from('partners').delete().eq('id', p.id);
                      void load();
                    }}
                    className="rounded-md border border-red-500/40 bg-ink-900/80 p-1.5 text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showEdit && (
        <PartnerEditModal
          partner={editing}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); void load(); }}
        />
      )}
    </div>
  );
}

function PartnerEditModal({ partner, onClose, onSaved }: { partner: Partner | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(partner?.name ?? '');
  const [description, setDescription] = useState(partner?.description ?? '');
  const [imageUrl, setImageUrl] = useState(partner?.image_url ?? '');
  const [linkUrl, setLinkUrl] = useState(partner?.link_url ?? '');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    const fileName = `partners/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop() ?? 'png'}`;
    const { error: upErr } = await supabase.storage.from('partners').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (upErr) { setError(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from('partners').getPublicUrl(fileName);
    setImageUrl(pub.publicUrl);
    setUploading(false);
  };

  const save = async () => {
    if (name.trim().length < 1) { setError('Name is required.'); return; }
    setBusy(true);
    setError(null);
    let success = true;
    if (partner) {
      const { error } = await supabase.from('partners').update({
        name: name.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        link_url: linkUrl.trim() || null,
      }).eq('id', partner.id);
      if (error) { setError(error.message); success = false; }
    } else {
      const { error } = await supabase.from('partners').insert({
        name: name.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        link_url: linkUrl.trim() || null,
        sort_order: 0,
      });
      if (error) { setError(error.message); success = false; }
    }
    setBusy(false);
    if (success) onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-lg animate-fade-in flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 px-5 py-4">
          <h2 className="font-serif text-lg text-ink-50">{partner ? 'Edit partner' : 'Add partner'}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Partner name" className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="focus-ring w-full resize-y rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Link URL (optional)</span>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="focus-ring w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100" />
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">Screenshot / Logo</span>
            {imageUrl ? (
              <div className="group relative overflow-hidden rounded-md border border-ink-700">
                <img src={imageUrl} alt="Preview" className="max-h-48 w-full object-contain" />
                <button onClick={() => setImageUrl('')} className="absolute right-2 top-2 rounded-md border border-red-500/40 bg-ink-900/80 p-1.5 text-red-300 hover:bg-red-500/20">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-ink-700 bg-ink-850/40 p-6 text-sm text-ink-400 hover:border-accent-400/40 hover:text-accent-200 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex items-center gap-1.5"><ImagePlus className="h-4 w-4" /> Upload image</span>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-ink-700 px-5 py-3">
          <button onClick={onClose} className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-300 hover:bg-ink-800">Cancel</button>
          <button onClick={save} disabled={busy} className="flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-1.5 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
