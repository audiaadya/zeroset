import { useEffect, useState } from 'react';
import { Image as ImageIcon, Video, Link2, Plus, X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

interface MediaRow {
  id: string;
  media_type: 'image' | 'video' | 'link';
  url: string;
  caption: string | null;
}

interface Props {
  targetType: 'problem' | 'solution' | 'bounty' | 'reverse_eng';
  targetId: string;
  editable?: boolean;
}

export default function MediaAttachments({ targetType, targetId, editable = false }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'link'>('image');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('media_attachments')
        .select('id, media_type, url, caption')
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .order('created_at', { ascending: true });
      setItems((data as MediaRow[]) ?? []);
      setLoading(false);
    })();
  }, [targetType, targetId]);

  const add = async () => {
    if (!user || !url.trim()) return;
    setBusy(true);
    setError(null);
    const { data, error: insError } = await supabase
      .from('media_attachments')
      .insert({
        owner_id: user.id,
        target_type: targetType,
        target_id: targetId,
        media_type: mediaType,
        url: url.trim(),
        caption: caption.trim() || null,
      })
      .select('id, media_type, url, caption')
      .maybeSingle();
    if (insError) setError(insError.message);
    else if (data) {
      setItems([...items, data as MediaRow]);
      setUrl('');
      setCaption('');
      setShowAdd(false);
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    const { error: delError } = await supabase.from('media_attachments').delete().eq('id', id);
    if (!delError) setItems(items.filter((m) => m.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-500">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading media…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((m) => (
            <div key={m.id} className="group relative overflow-hidden rounded-md border border-ink-700 bg-ink-900/50">
              {m.media_type === 'image' && (
                <a href={m.url} target="_blank" rel="noreferrer">
                  <img src={m.url} alt={m.caption ?? ''} className="h-40 w-full object-cover" />
                </a>
              )}
              {m.media_type === 'video' && (
                <video src={m.url} controls className="h-40 w-full bg-ink-950" />
              )}
              {m.media_type === 'link' && (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-20 items-center gap-2 px-3 text-sm text-accent-200 hover:underline"
                >
                  <Link2 className="h-4 w-4" /> {m.url}
                </a>
              )}
              {m.caption && (
                <div className="px-2 py-1 text-xs text-ink-400">{m.caption}</div>
              )}
              {editable && (
                <button
                  onClick={() => remove(m.id)}
                  className="absolute right-1 top-1 rounded bg-ink-950/80 p-1 text-ink-300 opacity-0 transition group-hover:opacity-100 hover:text-red-300"
                  aria-label="Remove media"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && user && (
        <>
          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-md border border-dashed border-ink-600 px-3 py-1.5 text-xs text-ink-400 hover:border-accent-400/40 hover:text-accent-200"
            >
              <Plus className="h-3.5 w-3.5" /> Add image / video / link
            </button>
          ) : (
            <div className="space-y-2 rounded-md border border-ink-700 bg-ink-900/50 p-3">
              <div className="flex gap-2">
                {(['image', 'video', 'link'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMediaType(t)}
                    className={`flex items-center gap-1 rounded border px-2 py-1 text-xs transition ${
                      mediaType === t
                        ? 'border-accent-400/50 bg-accent-400/15 text-accent-200'
                        : 'border-ink-700 text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    {t === 'image' && <ImageIcon className="h-3 w-3" />}
                    {t === 'video' && <Video className="h-3 w-3" />}
                    {t === 'link' && <Link2 className="h-3 w-3" />}
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={mediaType === 'link' ? 'https://…' : 'https://…/image.png or video URL'}
                className="focus-ring w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100"
              />
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Caption (optional)"
                className="focus-ring w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100"
              />
              {error && (
                <div className="flex items-start gap-1.5 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={add}
                  disabled={busy || !url.trim()}
                  className="flex items-center gap-1.5 rounded border border-accent-400 bg-accent-400/15 px-3 py-1 text-xs font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Attach
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="rounded border border-ink-700 px-3 py-1 text-xs text-ink-400 hover:text-ink-200"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[10px] text-ink-500">
                Paste a direct URL to an image, video, or external page. Hosted URLs (imgur, YouTube, etc.) work best.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
