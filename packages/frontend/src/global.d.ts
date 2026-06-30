declare module '*.css';
declare module '*.scss';
declare module '*.png';
declare module '*.jpg';
declare module '*.svg';

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_NJS_URL?: string;
  readonly VITE_AGORA_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
