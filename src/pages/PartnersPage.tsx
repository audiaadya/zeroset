import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Loader2, AlertCircle, ExternalLink, ImagePlus, X, Pencil, Heart } from 'lucide-react';
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
    <div className="relative bg-graph-paper min-h-screen">
      <div className="border-b border-ink-300 bg-cream-200 px-4 pb-3 pt-16 text-center font-handwritten text-xs font-bold uppercase tracking-widest text-ink-600">
        ZeroSet — a nonprofit providing structured, weekly math practice
      </div>

      <section className="relative overflow-hidden bg-graph-paper">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <span className="inline-flex w-fit items-center gap-2 highlighter px-3 py-1 font-handwritten text-sm font-bold uppercase tracking-wider text-accent-700">
            <Heart className="h-3.5 w-3.5" />
            Partners
          </span>
          <h1 className="mt-4 font-handwritten text-5xl font-bold leading-tight text-ink-950 sm:text-6xl">
            Our Partners
          </h1>
          <p className="mt-3 max-w-2xl text-base text-ink-800">
            Collaborators and organizations we work with to bring you the best math challenges.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="sm:pl-4">
          {isHost && (
            <div className="mb-6">
              <button
                onClick={() => { setEditing(null); setShowEdit(true); }}
                className="btn-sketch-notebook flex items-center gap-1.5 px-4 py-2 font-handwritten text-sm font-bold"
              >
                <Plus className="h-4 w-4" /> Add partner
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading partners…
            </div>
          ) : partners.length === 0 ? (
            <div className="washi-tape border-2 border-ink-700 bg-cream-100 p-8 text-center shadow-panel" style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}>
              <p className="font-handwritten text-sm text-ink-700">No partners listed yet.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {partners.map((p) => (
                <div
                  key={p.id}
                  className="group relative overflow-visible border-2 border-ink-700 bg-cream-100 p-5 shadow-panel transition hover:border-ink-600 sm:p-6"
                  style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
                >
                  {p.image_url && (
                    <div className="mb-4 flex h-32 items-center justify-center overflow-hidden border-b border-ink-300 bg-cream-200 pb-3">
                      <img src={p.image_url} alt={p.name} className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                  <h3 className="font-handwritten text-2xl font-bold text-ink-950">{p.name}</h3>
                  {p.description && (
                    <p className="mt-2 text-sm leading-relaxed text-ink-800">{p.description}</p>
                  )}
                  {p.link_url && (
                    <a
                      href={p.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 font-handwritten text-sm font-bold text-accent-700 hover:text-accent-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Visit site
                    </a>
                  )}
                  {isHost && (
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => { setEditing(p); setShowEdit(true); }}
                        className="rounded-md border border-ink-600 bg-cream-100 p-1.5 text-ink-700 hover:bg-cream-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this partner?')) return;
                          await supabase.from('partners').delete().eq('id', p.id);
                          void load();
                        }}
                        className="rounded-md border border-red-500/40 bg-cream-100 p-1.5 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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
      <div className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-lg animate-fade-in flex-col overflow-hidden border-2 border-ink-700 bg-cream-100 shadow-panel" style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}>
        <div className="flex shrink-0 items-center justify-between border-b-2 border-ink-300 px-5 py-4">
          <h2 className="font-handwritten text-xl font-bold text-ink-950">{partner ? 'Edit partner' : 'Add partner'}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-600 hover:bg-cream-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-5">
          <label className="block">
            <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Partner name" className="w-full border-2 border-ink-400 bg-white px-3 py-2 text-sm text-ink-950 focus:outline-none focus:border-accent-500" />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full resize-y border-2 border-ink-400 bg-white px-3 py-2 text-sm text-ink-950 focus:outline-none focus:border-accent-500" />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Link URL (optional)</span>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="w-full border-2 border-ink-400 bg-white px-3 py-2 text-sm text-ink-950 focus:outline-none focus:border-accent-500" />
          </label>
          <div>
            <span className="mb-1.5 block font-handwritten text-xs font-bold uppercase tracking-wider text-ink-700">Logo</span>
            {imageUrl ? (
              <div className="group relative overflow-hidden border-2 border-ink-400">
                <img src={imageUrl} alt="Preview" className="max-h-48 w-full object-contain" />
                <button onClick={() => setImageUrl('')} className="absolute right-2 top-2 rounded-md border border-red-500/40 bg-cream-100 p-1.5 text-red-700 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center border-2 border-dashed border-ink-400 bg-cream-200 p-6 text-sm text-ink-600 hover:border-accent-500 hover:text-accent-700 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex items-center gap-1.5"><ImagePlus className="h-4 w-4" /> Upload image</span>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
          </div>
          {error && (
            <div className="flex items-start gap-2 border-2 border-red-500/40 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t-2 border-ink-300 px-5 py-3">
          <button onClick={onClose} className="btn-sketch-notebook px-3 py-1.5 font-handwritten text-sm font-bold">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-sketch-notebook flex items-center gap-1.5 px-4 py-1.5 font-handwritten text-sm font-bold disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
