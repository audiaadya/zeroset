import { useEffect, useState, useCallback } from 'react';

export interface Route {
  path: string;
  params: Record<string, string>;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  return { path: raw, params: {} };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((to: string) => {
    if (window.location.hash === `#${to}`) {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    } else {
      window.location.hash = to;
    }
  }, []);

  return { route, navigate };
}

export function matchRoute(path: string, pattern: string): Record<string, string> | null {
  const pSeg = path.split('/').filter(Boolean);
  const tSeg = pattern.split('/').filter(Boolean);
  if (pSeg.length !== tSeg.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < tSeg.length; i++) {
    const t = tSeg[i];
    const p = pSeg[i];
    if (t.startsWith(':')) {
      params[t.slice(1)] = decodeURIComponent(p);
    } else if (t !== p) {
      return null;
    }
  }
  return params;
}
