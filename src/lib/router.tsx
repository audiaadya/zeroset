import { useEffect, useState, useCallback } from 'react';
import { logVisit } from './analytics';

export interface Route {
  path: string;
  params: Record<string, string>;
}

function parsePath(): Route {
  const hash = window.location.hash || '#/';
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const path = raw || '/';
  return { path, params: {} };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parsePath());

  useEffect(() => {
    const onHash = () => {
      setRoute(parsePath());
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((to: string) => {
    const current = window.location.hash.slice(1) || '/';
    if (current === to) {
      setRoute(parsePath());
      window.scrollTo({ top: 0 });
    } else {
      window.location.hash = to;
      setRoute(parsePath());
      window.scrollTo({ top: 0 });
    }
  }, []);

  useEffect(() => {
    logVisit(route.path);
  }, [route.path]);

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
