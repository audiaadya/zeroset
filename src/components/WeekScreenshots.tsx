import { useEffect, useState, useRef } from 'react';
import { ImagePlus, Trash2, Loader2, AlertCircle, ImageIcon, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

interface Screenshot {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

interface Props {
  weekId: string;
}

export default function WeekScreenshots({ weekId }: Props) {
  const { isHost } = useAuth();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('week_screenshots')
      .select('id, image_url, caption, sort_order')
      .eq('week_id', weekId)
      .order('sort_order', { ascending: true });
    setScreenshots((data as Screenshot[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [weekId]);

  const upload = async (file: File) => {
    if (!isHost) return;
    setUploading(true);
    setError(null);
    const ext = file.name.split('.').pop() ?? 'png';
    const fileName = `${weekId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('week-screenshots')
      .upload(fileName, file, { cacheControl: '3600' });
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from('week-screenshots').getPublicUrl(fileName);
    const { error: insErr } = await supabase.from('week_screenshots').insert({
      week_id: weekId,
      image_url: pub.publicUrl,
      sort_order: screenshots.length,
    });
    if (insErr) setError(insErr.message);
    setUploading(false);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this screenshot?')) return;
    await supabase.from('week_screenshots').delete().eq('id', id);
    setScreenshots((s) => s.filter((x) => x.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading screenshots…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      {screenshots.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-ink-700 bg-ink-850/40 p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <ImageIcon className="h-8 w-8 text-ink-500" />
            <p className="text-sm text-ink-400">No screenshots for this week's problems yet.</p>
            {isHost && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Upload screenshot
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {screenshots.map((s) => (
            <div key={s.id} className="group relative overflow-hidden rounded-lg border border-ink-700 bg-ink-850/50">
              <button
                onClick={() => setLightbox(s.image_url)}
                className="block w-full"
              >
                <img
                  src={s.image_url}
                  alt={s.caption ?? 'Week screenshot'}
                  className="max-h-64 w-full object-contain"
                />
              </button>
              {s.caption && (
                <p className="px-3 py-2 text-xs text-ink-400">{s.caption}</p>
              )}
              {isHost && (
                <button
                  onClick={() => remove(s.id)}
                  className="absolute right-2 top-2 rounded-md border border-red-500/40 bg-ink-900/80 p-1.5 text-red-300 opacity-0 transition hover:bg-red-500/20 group-hover:opacity-100"
                  title="Remove screenshot"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {isHost && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex min-h-[8rem] items-center justify-center rounded-lg border-2 border-dashed border-ink-700 bg-ink-850/40 p-4 text-sm text-ink-400 transition hover:border-accent-400/40 hover:text-accent-200 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5">
                  <ImagePlus className="h-4 w-4" /> Add screenshot
                </span>
              )}
            </button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = '';
        }}
      />

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-md p-2 text-ink-300 hover:bg-ink-800"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img src={lightbox} alt="Screenshot" className="max-h-[90vh] max-w-[90vw] rounded-lg" />
        </div>
      )}
    </div>
  );
}
