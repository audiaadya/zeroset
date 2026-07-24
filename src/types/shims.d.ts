declare module 'react' {
  export type ReactNode = any;
  export type ReactElement = any;
  export type CSSProperties = Record<string, any>;
  export type FC<P = Record<string, any>> = (props: P) => any;
  export const StrictMode: any;
  export const Fragment: any;
  export const createContext: any;
  export const useCallback: any;
  export const useContext: any;
  export const useEffect: any;
  export const useMemo: any;
  export const useRef: any;
  export const useState: any;
}

declare module 'react-dom/client' {
  export const createRoot: any;
}

declare module 'react/jsx-runtime' {
  export const Fragment: any;
  export const jsx: any;
  export const jsxs: any;
}

declare module 'lucide-react' {
  export const ArrowRight: any;
  export const BookOpen: any;
  export const Calendar: any;
  export const Layers: any;
  export const Lock: any;
  export const MessageSquare: any;
  export const Network: any;
  export const Sparkles: any;
  export const Target: any;
  export const Trophy: any;
  export const TrendingUp: any;
  export const Users: any;
  export const Zap: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
